const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const questions = require('./questions');

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
        [socket.id]: { name: playerName, score: 0 },
      },
      currentQuestion: 0,
      questionSet: selectedQuestions,
      currentAnswers: {},
      timer: null
    };

    socket.join(roomCode);
    socket.emit('gameCreated', roomCode);
    emitPlayerList(roomCode);
  });

  socket.on('joinGame', ({ roomCode, playerName }) => {
    const game = games[roomCode];
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }

    game.players[socket.id] = { name: playerName, score: 0 };
    socket.join(roomCode);
    emitPlayerList(roomCode);
  });

  socket.on('startGame', (roomCode) => {
    sendNextQuestion(roomCode);
  });

  socket.on('submitAnswer', ({ roomCode, answerIndex }) => {
    const game = games[roomCode];
    if (!game) return;

    // Save the player's answer
    game.currentAnswers[socket.id] = answerIndex;

    // Score only when everyone answered early (but don't move to next)
    if (Object.keys(game.currentAnswers).length === Object.keys(game.players).length) {
      const question = game.questionSet[game.currentQuestion];

      for (const [id, ans] of Object.entries(game.currentAnswers)) {
        if (ans === question.correct) {
          game.players[id].score += 1;
        }
      }

      // Emit updated scores immediately
      io.to(roomCode).emit('updateScores', Object.values(game.players));
      // DO NOT call sendNextQuestion here — wait for timer!
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    for (const [roomCode, game] of Object.entries(games)) {
      if (game.players[socket.id]) {
        delete game.players[socket.id];
        emitPlayerList(roomCode);

        // Delete game if no players remain
        if (Object.keys(game.players).length === 0) {
          clearTimeout(game.timer);
          delete games[roomCode];
        }
        break;
      }
    }
  });
});

// Helper to send player list and host info
function emitPlayerList(roomCode) {
  const game = games[roomCode];
  if (!game) return;
  io.to(roomCode).emit('playerList', {
    players: Object.values(game.players),
    hostId: game.hostId
  });
}

function sendNextQuestion(roomCode) {
  const game = games[roomCode];
  if (!game) return;

  const index = game.currentQuestion;

  // End game if no more questions
  if (index >= game.questionSet.length) {
    const finalScores = Object.values(game.players);
    io.to(roomCode).emit('gameOver', finalScores);
    return;
  }

  const question = game.questionSet[index];
  const questionToSend = {
    text: question.text,
    options: question.options,
    correct: null, // never send the correct answer
    timer: 10
  };

  // Reset previous answers
  game.currentAnswers = {};

  // Send question
  io.to(roomCode).emit('newQuestion', questionToSend);

  // Setup timer to move to next question after 10 seconds
  game.timer = setTimeout(() => {
    // Score based on submitted answers (for those who answered)
    for (const [id, ans] of Object.entries(game.currentAnswers)) {
      if (ans === question.correct) {
        game.players[id].score += 1;
      }
    }

    io.to(roomCode).emit('updateScores', Object.values(game.players));
    game.currentQuestion += 1;
    sendNextQuestion(roomCode);
  }, 10000);
}

server.listen(PORT, () => {
  console.log(`🟢 Bible Quiz Multiplayer Server is running on port ${PORT}`);
});
