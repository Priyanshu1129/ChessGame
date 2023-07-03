// Loading models
const express = require("express");
const handlebars = require("express-handlebars");
const bodyParser = require("body-parser");
const app = express();
const dashboard = require("./routes/dashboard");
const auth = require("./routes/auth");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const socketio = require("socket.io");
var Chess = require("chess.js").Chess;
const http = require("http");
const cutDiamonds = require('./helpers/cutDiamonds')
const addGame = require("./helpers/addGame")
const addDiamonds = require('./helpers/addDiamonds')
const findUserByUsername = require('./helpers/findUserByUsername');
require('dotenv').config()

require("./config/auth")(passport);

//Settings

const server = http.createServer(app);
const io = socketio(server);

// Session
app.use(
  session({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
//Middlewares
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  res.locals.user = req.user || null;
  next();
});
// Body Parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//Handlebars
app.engine("handlebars", handlebars.engine({
  defaultLayout: "main",
  helpers: {
    toFixed: function (value) {
      let fixedDecimal = parseFloat(value).toFixed(2);
      if (isNaN(fixedDecimal))
        return ""
      else
        return fixedDecimal
    },
  },
}));

app.set("view engine", "handlebars");
//Public
app.use(express.static(path.join(__dirname, "public")));
//Mongoose

mongoose.Promise = global.Promise;
mongoose
  .connect(
    process.env.DB_URL,
    {
      useNewUrlParser: true,
    }
  )
  .then(() => {
    console.log("Connected to database successfully!");
  })
  .catch((err) => {
    console.log("Error connecting to database: " + err);
  });

const gameData = new Map();
const userData = new Map();
const roomsList = new Set();

let totalUsers = 0;

function removeAllClientsFromRoom(room) {
  // Get all clients in the room
  // console.log(room)
  const clients = io.nsps["/"].adapter.rooms[room];

  // Iterate through clients and make them leave the room

  if (clients) {
    Object.keys(clients.sockets).forEach((clientId) => {
      const client = io.sockets.connected[clientId];
      if (client) {
        client.leave(room);
        console.log(`User ${clientId} left room ${room}`);
      }
    });
  }
  console.log(`All users have left room ${room}`);
}

//Getting a connection
io.on("connection", (socket) => {
  totalUsers++;
  // console.log(totalUsers)
  //To render rooms list initially
  io.emit("roomsList", Array.from(roomsList));
  io.emit("updateTotalUsers", totalUsers);
  let gameCompleted = false;

  const updateStatus = async (game, room) => {
    // checkmate?
    if (game.in_checkmate()) {
      const winningPlayerColor = game.turn() === 'w' ? 'b' : 'w';
      const winningPlayer = await Object.values(userData).find(userObj => userObj.room === room && userObj.color === winningPlayerColor);
      const lossingPlayer = await Object.values(userData).find(userObj => userObj.room === room && userObj.color !== winningPlayerColor);
      // Award extra diamonds to the winning player
      if (winningPlayer) {
        gameCompleted = true
        const GameResult = {
          user_1: winningPlayer.user,
          user_2: lossingPlayer.user,
          mode: room.startsWith("Online") ? "Online" : "Competetive",
          diamondToCut: winningPlayer.diamondToCut,
        }
        await addGame(GameResult)
        const diamondsToAward = winningPlayer.diamondToCut + (winningPlayer.diamondToCut * 85 / 100); // Change this value based on your desired reward
        console.log(`Awarding ${diamondsToAward} diamonds to ${winningPlayer.user}`)
        if (diamondsToAward) {
          const updatedDiamonds = await addDiamonds({ user: winningPlayer.user }, diamondsToAward);
          io.to(room).emit("awardDiamonds", winningPlayer.user, updatedDiamonds);
        }
      }
      io.to(room).emit("gameOver", game.turn(), true);
      removeAllClientsFromRoom(room);
    }
    // draw?
    else if (game.in_draw()) {
      gameCompleted = true
      const GameResult = {
        user_1 : Object.values(userData)[0].user,
        user_2 : Object.values(userData)[1].user,
        draw: true,
        mode: room.startsWith("Online") ? "Online" : "Competetive",
        diamondToCut: Object.values(userData)[0].diamondToCut,
      }  
      await addGame(GameResult)
      io.to(room).emit("gameOver", game.turn(), false);
    }
    // game still on
    else {
      if (game.in_check()) {
        io.to(room).emit("inCheck", game.turn());
      } else {
        io.to(room).emit("updateStatus", game.turn());
      }
    }
  };

  //Creating and joining the room
  socket.on("joinRoom", async ({ user, diamondToCut, mode }, callback) => {
    let foundRoom = false;
    let roomPrefix = mode + "-Room-"
    // Iterate through rooms to find one that is not full

    for (let existingRoom of roomsList) {
      if (!existingRoom.startsWith(roomPrefix)) continue;
      if (io.nsps["/"].adapter.rooms[existingRoom] && io.nsps["/"].adapter.rooms[existingRoom].length < 2) {
        console.log("EXISTING ROOM FOUND ", existingRoom)

        room = existingRoom;
        foundRoom = true;
        break;
      }
    }

    // If no available room is found, create a new one
    if (!foundRoom) {
      let roomIndex = roomsList.size + 1;
      room = roomPrefix + roomIndex;

      // Check if the room name already exists, and if so, generate a new unique name
      // Is not necessary for current implementation, but just being on safe side
      while (io.nsps["/"].adapter.rooms[room]) {
        roomIndex++;
        room = roomPrefix + roomIndex;
      }

      console.log("ROOM NOT FOUND. CREATING NEW ONE WITH NAME ", room)
    }

    //We have to limit the number of users in a room to be just 2
    if (
      io.nsps["/"].adapter.rooms[room] &&
      io.nsps["/"].adapter.rooms[room].length === 2
    ) {
      return callback("Already 2 users are there in the room!");
    }
    var alreadyPresent = false;
    for (var x in userData) {
      if (userData[x].user == user && userData[x].room == room) {
        alreadyPresent = true;
      }
    }
    // console.log(userData);
    //If same name user already present
    if (alreadyPresent) {
      return callback("Choose different name!");
    }
    socket.join(room);
    //Rooms List Update
    roomsList.add(room);
    io.emit("roomsList", Array.from(roomsList));
    totalRooms = roomsList.length;
    io.emit("totalRooms", totalRooms);

    diamondToCut = Number(diamondToCut);

    userData[user + "" + socket.id] = {
      room,
      user,
      id: socket.id,
      color: 'w',
      diamondToCut
    };

    //If two users are in the same room, we can start
    if (io.nsps["/"].adapter.rooms[room].length === 2) {
      //Rooms List Delete
      roomsList.delete(room);
      io.emit("roomsList", Array.from(roomsList));
      totalRooms = roomsList.length;
      io.emit("totalRooms", totalRooms);

      var game = new Chess();

      userData[user + "" + socket.id].color = 'b';

      const rooomPlayerNames = []
      // console.log("userData mila", userData)

      Object.values(userData).forEach(userObj => {
        if (userObj.room != room) return;
        rooomPlayerNames.push(userObj.user)
      })

      let roomPlayersInfo = await Promise.all(rooomPlayerNames.map(username => findUserByUsername(username)));

      roomPlayersInfo = roomPlayersInfo.map(user => {
        const { password, ...userWithoutPassword } = user.toObject();
        return userWithoutPassword;
      });


      //For getting ids of the clients
      for (var x in io.nsps["/"].adapter.rooms[room].sockets) {
        gameData[x] = game;
      }

      //Cut diamonds
      if (diamondToCut) {     // is competitive game
        const socketIds = Object.keys(io.nsps["/"].adapter.rooms[room].sockets);
        socketIds.forEach(async (socketId) => {
          const playerKey = Object.keys(userData).find(key => userData[key].id === socketId);
          const player = userData[playerKey];
          if (player) {
            await cutDiamonds({ user: player.user }, diamondToCut);
          }
        });
      }

      io.to(room).emit("playerNames", rooomPlayerNames);
      io.to(room).emit("roomName", room)

      //For giving turns one by one
      io.to(room).emit("Dragging", socket.id);
      io.to(room).emit("DisplayBoard", game.fen(), socket.id, game.pgn());

      io.to(room).emit("playersInfo", roomPlayersInfo)

      updateStatus(game, room);
    }
  });

  //For catching dropped event
  socket.on("Dropped", ({ source, target, room }) => {
    var game = gameData[socket.id];
    var move = game.move({
      from: source,
      to: target,
      promotion: "q", // NOTE: always promote to a queen for example simplicity
    });
    // If correct move, then toggle the turns
    if (move != null) {
      io.to(room).emit("Dragging", socket.id);
    }
    io.to(room).emit("DisplayBoard", game.fen(), undefined, game.pgn());
    updateStatus(game, room);
    // io.to(room).emit('printing', game.fen())
  });

  //Catching message event
  socket.on("sendMessage", ({ user, room, message }) => {
    io.to(room).emit("receiveMessage", user, message);
  });

  //Disconnected
  socket.on("disconnect", async () => {
    totalUsers--;
    io.emit("updateTotalUsers", totalUsers);
    var room = "",
      user = "";
    for (var x in userData) {
      if (userData[x].id == socket.id) {
        // delete user who left the game
        room = userData[x].room;
        user = userData[x].user;
        delete userData[x];

        // since, one user has been deleted from the room due to disconnect, other will be declared winner and given award
        const winningPlayer = await Object.values(userData).find(userObj => userObj.room === room);

        // Award extra diamonds to the winning player
        if (gameCompleted === false && winningPlayer) {
          const gameResult = {
            user_1: winningPlayer.user,
            user_2: user,
            mode: room.startsWith("Online") ? "Online" : "Competetive",
            diamondToCut: winningPlayer.diamondToCut,
          }
          await addGame(gameResult)
        }

        if (winningPlayer) {
          const diamondsToAward = winningPlayer.diamondToCut + (winningPlayer.diamondToCut * 85 / 100); // Change this value based on your desired reward
          console.log(`Awarding ${diamondsToAward} diamonds to ${winningPlayer.user}`)
          if (diamondsToAward) {
            const updatedDiamonds = await addDiamonds({ user: winningPlayer.user }, diamondsToAward);
            io.to(room).emit("awardDiamonds", winningPlayer.user, updatedDiamonds);
          }
        }
        break;
      }
    }
    //Rooms Removed
    if (userData[room] == null) {
      //Rooms List Delete
      roomsList.delete(room);
      io.emit("roomsList", Array.from(roomsList));
      totalRooms = roomsList.length;
      io.emit("totalRooms", totalRooms);
    }
    gameData.delete(socket.id);
    if (user != "" && room != "") {
      io.to(room).emit("disconnectedStatus");
      removeAllClientsFromRoom(room);

    }
  });
});


//Routes
app.get("/", (req, res) => {
  res.render("home/index.handlebars");
});

app.use("/dashboard", dashboard);
app.use("/auth", auth);
//Others
const PORT = 3000;
server.listen(PORT, () => {
  console.log("Server running!");
});
