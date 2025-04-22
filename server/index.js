const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const questions = require('./questions'); // make sure this file exists and is in the same directory

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 3000;

const games = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('createGame', ({ playerName, numQuestions }) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, numQuestions);

    games[roomCode] = {
      hostId: socket.id,
      players: {
        [socket.id]: { name: playerName, score: 0 }
      },
      currentQuestion: 0,
      questionSet: selectedQuestions,
      currentAnswers: {}
    };

    socket.join(roomCode);
    socket.emit('gameCreated', roomCode);

    io.to(roomCode).emit('playerList', {
      players: Object.values(games[roomCode].players),
      hostId: games[roomCode].hostId
    });
  });

  socket.on('joinGame', ({ roomCode, playerName }) => {
    const game = games[roomCode];
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }

    game.players[socket.id] = { name: playerName, score: 0 };
    socket.join(roomCode);

    io.to(roomCode).emit('playerList', {
      players: Object.values(game.players),
      hostId: game.hostId
    });
  });

  socket.on('startGame', (roomCode) => {
    sendNextQuestion(roomCode);
  });

  socket.on('submitAnswer', ({ roomCode, answerIndex }) => {
    const game = games[roomCode];
    if (!game) return;

    game.currentAnswers[socket.id] = answerIndex;

    // Check if all players answered
    if (Object.keys(game.currentAnswers).length === Object.keys(game.players).length) {
      const question = game.questionSet[game.currentQuestion];

      for (const [id, ans] of Object.entries(game.currentAnswers)) {
        if (ans === question.correct) {
          game.players[id].score += 1;
        }
      }

      // Update live scores to all players
      io.to(roomCode).emit('updateScores', Object.values(game.players));

      // Move to next question
      game.currentQuestion += 1;
      game.currentAnswers = {};
      setTimeout(() => sendNextQuestion(roomCode), 1000); // delay next question slightly
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const [roomCode, game] of Object.entries(games)) {
      if (game.players[socket.id]) {
        delete game.players[socket.id];

        io.to(roomCode).emit('playerList', {
          players: Object.values(game.players),
          hostId: game.hostId
        });

        // Optional: delete empty games
        if (Object.keys(game.players).length === 0) {
          delete games[roomCode];
        }
        break;
      }
    }
  });
});

function sendNextQuestion(roomCode) {
  const game = games[roomCode];
  if (!game) return;

  const index = game.currentQuestion;
  if (index >= game.questionSet.length) {
    const finalScores = Object.values(game.players);
    io.to(roomCode).emit('gameOver', finalScores);
    return;
  }

  const question = game.questionSet[index];
  const questionToSend = {
    text: question.text,
    options: question.options,
    correct: null,
    timer: 10
  };

  game.timer = setTimeout(() => {
    // Score only players who answered
    for (const [id, ans] of Object.entries(game.currentAnswers)) {
      if (ans === question.correct) {
        game.players[id].score += 1;
      }
    }

    // Emit updated scores
    io.to(roomCode).emit('updateScores', Object.values(game.players));

    // Move to next question
    game.currentQuestion += 1;
    game.currentAnswers = {};
    sendNextQuestion(roomCode);
  }, 10000); // auto move after 10 seconds

  io.to(roomCode).emit('newQuestion', questionToSend);
}

server.listen(PORT, () => {
  console.log(`🟢 Bible Quiz Multiplayer Server is running on port ${PORT}`);
});
