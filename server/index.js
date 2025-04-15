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
      // Game finished
      const finalScores = Object.values(game.players);
      io.to(roomCode).emit('gameOver', finalScores);
      return;
    }
  
    const question = questionSet[index];
    io.to(roomCode).emit('newQuestion', {
      ...question,
      timer: 10, // seconds
    });
  
    game.currentAnswers = {};
    game.timer = setTimeout(() => {
      game.currentQuestion++;
      sendNextQuestion(roomCode);
    }, 10000); // 10 seconds
  }
  
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
  