const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const games = {};

const questionSet = [
  {
    text: "Who built the ark?",
    options: ["Moses", "Abraham", "Noah", "David"],
    correct: 2,
  },
  {
    text: "Who led the Israelites out of Egypt?",
    options: ["Elijah", "Moses", "Aaron", "Joshua"],
    correct: 1,
  },
  {
    text: "Who was swallowed by a great fish?",
    options: ["Jonah", "Daniel", "Peter", "Paul"],
    correct: 0,
  }
];

function sendNextQuestion(roomCode) {
  const game = games[roomCode];
  if (!game) return;

  const index = game.currentQuestion;

  if (index >= questionSet.length) {
    const finalScores = Object.values(game.players);
    io.to(roomCode).emit('gameOver', finalScores);
    return;
  }

  const question = questionSet[index];
  io.to(roomCode).emit('newQuestion', {
    ...question,
    timer: 10,
  });

  game.currentAnswers = {};
  game.timer = setTimeout(() => {
    game.currentQuestion++;
    sendNextQuestion(roomCode);
  }, 10000);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('createGame', () => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    games[roomCode] = {
      hostId: socket.id,
      players: {},
      currentQuestion: 0
    };
    socket.join(roomCode);
    socket.emit('gameCreated', roomCode);
  });

  socket.on('joinGame', ({ roomCode, playerName }) => {
    const game = games[roomCode];
    if (game) {
      game.players[socket.id] = { name: playerName, score: 0 };
      socket.join(roomCode);
      io.to(roomCode).emit('playerList', Object.values(game.players));
    } else {
      socket.emit('error', 'Game not found.');
    }
  });

  socket.on('startGame', (roomCode) => {
    const game = games[roomCode];
    if (game && game.hostId === socket.id) {
      game.currentQuestion = 0;
      sendNextQuestion(roomCode);
    }
  });

  socket.on('submitAnswer', ({ roomCode, answerIndex }) => {
    const game = games[roomCode];
    const player = game?.players[socket.id];
    if (!game || !player || game.currentAnswers?.[socket.id]) return;

    const question = questionSet[game.currentQuestion];
    if (answerIndex === question.correct) {
      player.score += 100;
    }

    game.currentAnswers[socket.id] = true;
    io.to(roomCode).emit('playerList', Object.values(game.players));
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const [roomCode, game] of Object.entries(games)) {
      if (game.players[socket.id]) {
        delete game.players[socket.id];
        io.to(roomCode).emit('playerList', Object.values(game.players));
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
