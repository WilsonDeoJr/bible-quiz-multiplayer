const socket = io('https://bible-quiz-multiplayer.onrender.com');
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

socket.on('playerList', (players) => {
  const list = document.getElementById('playerList');
  list.innerHTML = '';
  players.forEach(p => {
    const li = document.createElement('li');
    li.textContent = `${p.name} - ${p.score} pts`;
    list.appendChild(li);
  });
});

socket.on('newQuestion', (question) => {
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
    };
    optionsBox.appendChild(btn);
  });
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
});

socket.on('error', (msg) => alert(msg));
