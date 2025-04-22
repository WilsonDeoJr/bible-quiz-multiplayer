const socket = io('https://bible-quiz-multiplayer.onrender.com'); // Use your actual backend URL
let roomCodeGlobal;

function createGame() {
  const playerName = document.getElementById('playerName').value;
  const numQuestions = parseInt(document.getElementById('createNumQuestions').value);
  if (!playerName || isNaN(numQuestions)) {
    alert("Please enter your name and number of questions.");
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

// 🔁 Renders the list of players and scores
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
  if (startButton) startButton.style.display = 'none'; // hide after game starts

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
       // Highlight the selected button
  const allButtons = optionsBox.querySelectorAll('button');
  allButtons.forEach(b => {
    b.disabled = true;
    b.style.opacity = '0.5';
  });

  btn.style.backgroundColor = '#1abc9c'; // ✅ or green or blue
  btn.style.color = '#fff';
  btn.style.opacity = '1';
  };
    optionsBox.appendChild(btn);
  });
});

// ✅ Keep scores visible when answers are submitted
socket.on('updateScores', (players) => {
  updatePlayerList(players);
});

socket.on('gameOver', (players) => {
  const questionBox = document.getElementById('questionBox');
  const optionsBox = document.getElementById('optionsBox');
  questionBox.textContent = "🎉 Game Over! Final Scores:";
  optionsBox.innerHTML = '';
  players.sort((a, b) => b.score - a.score);
  updatePlayerList(players);
});

socket.on('error', (msg) => alert(msg));
