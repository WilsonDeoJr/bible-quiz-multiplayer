const socket = io(); // Use your full backend URL if hosted elsewhere
let roomCodeGlobal;
let hostIdGlobal;

function createGame() {
  const playerName = document.getElementById('playerName').value;
  const numQuestions = parseInt(document.getElementById('createNumQuestions').value);

  if (!playerName || isNaN(numQuestions) || numQuestions <= 0) {
    alert("Please enter your name and number of questions.");
    return;
  }

  socket.emit('createGame', { playerName, numQuestions });
}

function joinGame() {
  const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();
  const playerName = document.getElementById('playerNameJoin').value;

  if (!roomCode || !playerName) {
    alert("Enter room code and your name.");
    return;
  }

  socket.emit('joinGame', { roomCode, playerName });
  roomCodeGlobal = roomCode;
  document.getElementById('joinForm').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
  document.getElementById('roomDisplay').textContent = 'Room Code: ' + roomCode;
}

function startGame() {
  socket.emit('startGame', roomCodeGlobal);
}

socket.on('gameCreated', (roomCode) => {
  console.log("Room created:", roomCode);
  roomCodeGlobal = roomCode;
  document.getElementById('createForm').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
  document.getElementById('roomDisplay').textContent = 'Room Code: ' + roomCode;
});

socket.on('playerList', ({ players, hostId }) => {
  hostIdGlobal = hostId;
  const list = document.getElementById('playerList');
  list.innerHTML = '';
  players.forEach(p => {
    const li = document.createElement('li');
    li.textContent = `${p.name} - ${p.score} pts`;
    list.appendChild(li);
  });

  const startBtn = document.getElementById('startGameBtn');
  if (socket.id === hostId) {
    startBtn.style.display = 'inline-block';
  } else {
    startBtn.style.display = 'none';
  }
});

socket.on('newQuestion', (question) => {
  const startBtn = document.getElementById('startGameBtn');
  if (startBtn) startBtn.style.display = 'none';

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
  const list = document.getElementById('playerList');
  list.innerHTML = '';
  players.forEach(p => {
    const li = document.createElement('li');
    li.textContent = `${p.name} - ${p.score} pts`;
    list.appendChild(li);
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

  if (socket.id === hostIdGlobal) {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 1;
    input.max = 50;
    input.value = 5;
    input.style.margin = '10px';

    const playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = '🔁 Play Again';
    playAgainBtn.onclick = () => {
      const numQuestions = parseInt(input.value);
      if (!isNaN(numQuestions) && numQuestions > 0) {
        socket.emit('playAgain', { roomCode: roomCodeGlobal, numQuestions });
      }
    };

    optionsBox.appendChild(input);
    optionsBox.appendChild(playAgainBtn);
  }
});

socket.on('error', (msg) => {
  alert(msg);
});
