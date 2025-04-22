const socket = io('https://bible-quiz-multiplayer.onrender.com'); // Replace if needed
let roomCodeGlobal;
let hostIdGlobal;

function createGame() {
  const playerName = document.getElementById('playerName').value;
  const numQuestions = parseInt(document.getElementById('createNumQuestions').value);
  if (!playerName || isNaN(numQuestions)) {
    alert("Enter your name and number of questions.");
    return;
  }
  socket.emit('createGame', { playerName, numQuestions });
}

function joinGame() {
  const roomCode = document.getElementById('roomCode').value.toUpperCase();
  const playerName = document.getElementById('playerNameJoin').value;
  if (!roomCode || !playerName) {
    alert("Enter room code and your name.");
    return;
  }
  socket.emit('joinGame', { roomCode, playerName });
  roomCodeGlobal = roomCode;
  document.getElementById('setup').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  document.getElementById('roomDisplay').textContent = 'Room Code: ' + roomCode;
}

function startGame() {
  socket.emit('startGame', roomCodeGlobal);
}

socket.on('gameCreated', (roomCode) => {
  roomCodeGlobal = roomCode;
  document.getElementById('setup').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  document.getElementById('roomDisplay').textContent = 'Room Code: ' + roomCode;
});

function updatePlayerList(players) {
  const list = document.getElementById('playerList');
  list.innerHTML = '';
  players.forEach(p => {
    const li = document.createElement('li');
    li.textContent = `${p.name} - ${p.score} pts`;
    list.appendChild(li);
  });
}

socket.on('playerList', (data) => {
  const { players, hostId } = data;
  hostIdGlobal = hostId;
  updatePlayerList(players);

  const startButton = document.getElementById('startGameBtn');
  if (socket.id === hostId) {
    startButton.style.display = 'inline-block';
    startButton.textContent = 'Start Game (Host Only)';
  } else {
    startButton.style.display = 'none';
  }
});

socket.on('newQuestion', (question) => {
  const startButton = document.getElementById('startGameBtn');
  if (startButton) startButton.style.display = 'none';

  const questionBox = document.getElementById('questionBox');
  const optionsBox = document.getElementById('optionsBox');
  questionBox.textContent = question.text;
  optionsBox.innerHTML = '';

  let timer = question.timer;
  const timerDisplay = document.createElement('p');
  timerDisplay.id = 'timer';
  timerDisplay.textContent = `Time left: ${timer}s`;
  optionsBox.appendChild(timerDisplay);

  const countdown = setInterval(() => {
    timer--;
    timerDisplay.textContent = `Time left: ${timer}s`;
    if (timer <= 0) clearInterval(countdown);
  }, 1000);

  question.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.onclick = () => {
      socket.emit('submitAnswer', { roomCode: roomCodeGlobal, answerIndex: i });
      const allBtns = optionsBox.querySelectorAll('button');
      allBtns.forEach(b => {
        b.disabled = true;
        b.style.opacity = 0.5;
      });
      btn.style.backgroundColor = '#1abc9c';
      btn.style.color = '#fff';
      btn.style.opacity = 1;
    };
    optionsBox.appendChild(btn);
  });
});

socket.on('updateScores', (players) => {
  updatePlayerList(players);
});

socket.on('gameOver', (players) => {
  const questionBox = document.getElementById('questionBox');
  const optionsBox = document.getElementById('optionsBox');
  questionBox.textContent = "🎉 Game Over! Final Scores:";
  optionsBox.innerHTML = '';

  players.sort((a, b) => b.score - a.score);
  players.forEach((p, i) => {
    const pEl = document.createElement('p');
    pEl.textContent = `${i + 1}. ${p.name} - ${p.score} pts`;
    optionsBox.appendChild(pEl);
  });

  if (socket.id === hostIdGlobal) {
    const playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = '🔁 Play Again';
    playAgainBtn.onclick = () => {
      const numQuestions = prompt("Enter number of questions to replay:");
      if (numQuestions) {
        socket.emit('playAgain', { roomCode: roomCodeGlobal, numQuestions: parseInt(numQuestions) });
      }
    };
    optionsBox.appendChild(playAgainBtn);
  }
});

socket.on('error', (msg) => alert(msg));
