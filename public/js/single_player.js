const myAudioEl = document.getElementById("myAudio");
var config = {};
var board = null;
var game = new Chess();
var turnt = 0;

function onDragStart2(source, piece, position, orientation) {
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

config = {
  pieceTheme: "/img/chesspieces/wikipedia/{piece}.png",
  draggable: true,
  position: "start",
  onDragStart: onDragStart2,
  onDrop: onDrop2,
  onSnapEnd: onSnapEnd2,
};
board = Chessboard("myBoard", config);

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
