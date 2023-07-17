const formEl = document.querySelectorAll("#joinForm > div > input");
const joinButtonEl = document.querySelector("#joinButton");
const messageEl = document.querySelector("#message");
const statusEl = document.querySelector("#status");
const ChatEl = document.querySelector("#chat");
const sendButtonEl = document.querySelector("#send");
const roomsListEl = document.getElementById("roomsList");
const myAudioEl = document.getElementById("myAudio");
const singlePlayerEl = document.getElementById("singlePlayer");
const multiPlayerEl = document.getElementById("multiPlayer");
// const totalRoomsEl = document.getElementById("rooms");
// const totalPlayersEl = document.getElementById("players");
const chatContentEl = document.getElementById("chatContent");
var config = {};
var board = null;
var game = new Chess();
var turnt = 0;
var room;

// initializing semantic UI dropdown
$(".ui.dropdown").dropdown();

// function for defining onchange on dropdown menus
$("#roomDropdown").dropdown({
  onChange: function (val) {
    console.log(val);
    console.log("running the function");
    formEl[1].value = val;
  },
});

function onDragStart2(source, target, piece, newPos, oldPos, orientation) {
  // do not pick up pieces if the game is over
  if (game.game_over()) {
    if (game.in_draw()) {
      var myModal = new bootstrap.Modal(
        document.getElementById("gamedrawModal")
      );
      myModal.show();
    } else if (game.in_checkmate())
      if (turnt === 1) {
        var myModal = new bootstrap.Modal(
          document.getElementById("winnerModal")
        );
        myModal.show();
      } else {
        var myModal = new bootstrap.Modal(document.getElementById("lossModal"));
        myModal.show();
      }
    return false;
  }

  // only pick up pieces for White
  if (piece.search(/^b/) !== -1) return false;
}

function makeRandomMove() {
  var possibleMoves = game.moves();

  // game over
  if (possibleMoves.length === 0) {
    return;
  }

  var randomIdx = Math.floor(Math.random() * possibleMoves.length);
  game.move(possibleMoves[randomIdx]);
  myAudioEl.play();
  turnt = 1 - turnt;
  board.position(game.fen());
}

function onDrop2(source, target) {
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: "q", // NOTE: always promote to a queen for example simplicity
  });
  myAudioEl.play();
  // illegal move
  if (move === null) return "snapback";
  turnt = 1 - turnt;
  // make random legal move for black
  window.setTimeout(makeRandomMove, 250);
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd2() {
  board.position(game.fen());
}

//Connection will be established after webpage is refreshed
const socket = io();

//Triggers after a piece is dropped on the board
function onDrop(source, target) {
  //emits event after piece is dropped
  // var room = formEl[1].value;
  myAudioEl.play();
  socket.emit("Dropped", { source, target, room });
}

// Set room name
socket.on("roomName", (roomName)=>{
  console.log("room name assigned is ", roomName)
  room=roomName
})

socket.on('playerNames', (playerNames)=>{
  var user = formEl[0].value;
  let opponentName = playerNames.filter(name=>name!=user)

  document.getElementById('opponent-name').textContent = opponentName
})

socket.on('playersInfo', (playersInfo)=>{
  console.log("playersInfo", playersInfo)
  var user = formEl[0].value;
  playersInfo.forEach(playerInfo=>{
    if(playerInfo.user==user && playerInfo.profileImage)
      document.getElementById('user-image').setAttribute("src", playerInfo.profileImage);
    
    if(playerInfo.user!=user && playerInfo.profileImage)
      document.getElementById('opponent-image').setAttribute("src", playerInfo.profileImage);
  })
})

//Update Status Event
socket.on("updateEvent", ({ status, fen, pgn }) => {
  statusEl.textContent = status;
  fenEl.textContent = fen;
  pgnEl.textContent = pgn;
});

socket.on("printing", (fen) => {
  console.log(fen);
});

//Catch Display event
socket.on("DisplayBoard", (fenString, userId, pgn) => {

  // This is to be done initially only
  if (userId != undefined) {
    messageEl.textContent = "Match Started!! Best of Luck...";
    if (socket.id == userId) {
      board.orientation( "black");
      document.getElementById('user-image').setAttribute('src', '/img/images/black-user.png')
      document.getElementById('opponent-image').setAttribute('src', '/img/images/gray-user.png')
    }
    document.getElementById("joinFormDiv").style.display = "none";
    document.querySelector("#chessGame").style.display = null;
    ChatEl.style.display = null;
    document.getElementById("statusPGN").style.display = null;
    
  } else {

    board.position(fenString, false)
    document.getElementById("pgn").textContent = pgn;
  }

});

//To turn off dragging
socket.on("Dragging", (id) => {
  if (socket.id != id) {
    config.draggable = true;
  } else {
    config.draggable = false;
  }
});

//To Update Status Element
socket.on("updateStatus", (turn) => {
  if (board.orientation().includes(turn)) {
    statusEl.textContent = "Your turn";
  } else {
    statusEl.textContent = "Opponent's turn";
  }
});

//If in check
socket.on("inCheck", (turn) => {
  if (board.orientation().includes(turn)) {
    statusEl.textContent = "You are in Check!!";
  } else {
    statusEl.textContent = "Opponent is in Check!!";
  }
});

//If win or draw
socket.on("gameOver", (turn, win) => {
  config.draggable = false;
  if (win) {
    if (board.orientation().includes(turn)) {
      statusEl.textContent = "You lost, better luck next time :)";
    } else {
      statusEl.textContent = "Congratulations, you won!!";
    }
  } else {
    statusEl.value = "Game Draw";
  }
});

//Client disconnected in between
socket.on("disconnectedStatus", () => {
  var myModal = new bootstrap.Modal(
    document.getElementById("opponentLeftWinnerModal")
  );
  myModal.show();
  messageEl.textContent = "Opponent left the game!!";
});

//Receiving a message
socket.on("receiveMessage", (user, message) => {
  var chatContentEl = document.getElementById("chatContent");
  //Create a div element for using bootstrap
  chatContentEl.scrollTop = chatContentEl.scrollHeight;
  var divEl = document.createElement("div");
  if (formEl[0].value == user) {
    divEl.classList.add("myMessage");
    divEl.textContent = message;
  } else {
    divEl.classList.add("youMessage");
    divEl.textContent = message;
    document.getElementById("messageTone").play();
  }
  var style = window.getComputedStyle(document.getElementById("chatBox"));
  if (style.display === "none") {
    document.getElementById("chatBox").style.display = "block";
  }
  chatContentEl.appendChild(divEl);
  divEl.focus();
  divEl.scrollIntoView();
});

//Rooms List update
socket.on("roomsList", (rooms) => {
  // roomsListEl.innerHTML = null;
  // console.log("Rooms List event triggered!! ", rooms);
  // totalRoomsEl.innerHTML = rooms.length;
  // var dropRooms = document.getElementById("dropRooms");
  // while (dropRooms.firstChild) {
  //   dropRooms.removeChild(dropRooms.firstChild);
  // }
  // // added event listener to each room
  // rooms.forEach((x) => {
  //   var roomEl = document.createElement("div");
  //   roomEl.setAttribute("class", "item");

  //   roomEl.setAttribute("data-value", x);
  //   roomEl.textContent = x;
  //   dropRooms.appendChild(roomEl);
  // });
});

//Message will be sent only after you click the button
sendButtonEl.addEventListener("click", (e) => {
  e.preventDefault();
  var message = document.querySelector("#inputMessage").value;
  var user = formEl[0].value;
  var room = formEl[1].value;
  document.querySelector("#inputMessage").value = "";
  document.querySelector("#inputMessage").focus();
  socket.emit("sendMessage", { user, room, message });
});

//Connect clients only after they click Join
joinButtonEl.addEventListener("click", (e) => {
  e.preventDefault();

  var user = formEl[0].value
  //room = formEl[1].value;

  if (!user) {
    messageEl.textContent = "Input fields can't be empty!";
  } else {
    joinButtonEl.setAttribute("disabled", "disabled");
    
    // formEl[0].setAttribute("disabled", "disabled");
    // document.querySelector("#roomDropdownP").style.display = "none";
    // formEl[1].setAttribute("disabled", "disabled");

    //Now Let's try to join it in room // If users more than 2 we will
    socket.emit("joinRoom", { user, diamondToCut: null, mode: "Online" }, (error) => {
      messageEl.textContent = error;
      if (alert(error)) {
        window.location.reload();
      } //to reload even if negative confirmation
      else window.location.reload();
    });
    messageEl.textContent = "Waiting for other player to join";
  }
});

//Server will create a game and clients will play it
//Clients just have to diaplay the game
config = {
  pieceTheme: "/img/chesspieces/wikipedia/{piece}.png",
  draggable: false, //Initially
  position: "start",
  onDrop: onDrop,
  orientation: "white",
};

var board = ChessBoard("myBoard", config);





const applyColorScheme = (black, white) => {
  const blackEl = document.querySelectorAll(".black-3c85d");
  for (var i = 0; i < blackEl.length; i++) {
    blackEl[i].style.backgroundColor = black;
    blackEl[i].style.color = white;
  }
  const whiteEl = document.querySelectorAll(".white-1e1d7");
  for (var i = 0; i < whiteEl.length; i++) {
    whiteEl[i].style.backgroundColor = white;
    whiteEl[i].style.color = black;
  }
};

//For removing class from all buttons
const removeClass = () => {
  const buttonEl = document.querySelectorAll(".color_b");
  for (var i = 0; i < buttonEl.length; i++) {
    buttonEl[i].classList.remove("black");
    buttonEl[i].classList.remove("grey");
  }
};

// Color Buttons
document.getElementById("grey_board").addEventListener("click", (e) => {
  e.preventDefault();
  removeClass();
  document.getElementById("grey_board").classList.add("black");
  document.getElementById("orange_board").classList.add("grey");
  document.getElementById("green_board").classList.add("grey");
  document.getElementById("blue_board").classList.add("grey");
  applyColorScheme("#E1E1E1", "#FFFFFF");
});

document.getElementById("orange_board").addEventListener("click", (e) => {
  e.preventDefault();
  removeClass();
  document.getElementById("grey_board").classList.add("grey");
  document.getElementById("orange_board").classList.add("black");
  document.getElementById("green_board").classList.add("grey");
  document.getElementById("blue_board").classList.add("grey");
  applyColorScheme("#D18B47", "#FFCE9E");
});

document.getElementById("green_board").addEventListener("click", (e) => {
  e.preventDefault();
  removeClass();
  document.getElementById("grey_board").classList.add("grey");
  document.getElementById("orange_board").classList.add("grey");
  document.getElementById("green_board").classList.add("black");
  document.getElementById("blue_board").classList.add("grey");
  applyColorScheme("#58AC8A", "#FFFFFF");
});

document.getElementById("blue_board").addEventListener("click", (e) => {
  e.preventDefault();
  removeClass();
  document.getElementById("grey_board").classList.add("grey");
  document.getElementById("orange_board").classList.add("grey");
  document.getElementById("green_board").classList.add("grey");
  document.getElementById("blue_board").classList.add("black");
  applyColorScheme("#727FA2", "#C3C6BE");
});

// // Messages Modal
document.getElementById("messageBox").addEventListener("click", (e) => {
  e.preventDefault();
  var style = window.getComputedStyle(document.getElementById("chatBox"));
  if (style.display === "none") {
    document.getElementById("chatBox").style.display = "block";
  } else {
    document.getElementById("chatBox").style.display = "none";
  }
});
