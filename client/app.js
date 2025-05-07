document.addEventListener("DOMContentLoaded", () => {
  const questionContainer = document.getElementById("question-container");
  const questionText = document.getElementById("question");
  const answerButtons = document.getElementById("answer-buttons");
  const scoreDisplay = document.getElementById("score");
  const playAgainBtn = document.getElementById("play-again-btn");
  const categorySelect = document.getElementById("category-select");

  let currentQuestionIndex = 0;
  let score = 0;
  let availableQuestions = [];
  let usedQuestions = [];
  let selectedCategory = "all";

  async function loadQuestions() {
    const response = await fetch("questions.json");
    const data = await response.json();
    allQuestions = data;
    filterQuestionsByCategory();
  }

  function filterQuestionsByCategory() {
    if (selectedCategory === "all") {
      availableQuestions = [...allQuestions];
    } else {
      availableQuestions = allQuestions.filter(q => q.category === selectedCategory);
    }
    usedQuestions = [];
    score = 0;
    updateScore();
    showNextQuestion();
  }

  function showNextQuestion() {
    if (availableQuestions.length === 0) {
      questionText.textContent = "Congratulations! You've completed all questions.";
      answerButtons.innerHTML = "";
      playAgainBtn.classList.remove("hide");
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const question = availableQuestions[randomIndex];
    usedQuestions.push(question);
    availableQuestions.splice(randomIndex, 1);
    displayQuestion(question);
  }

  function displayQuestion(question) {
    questionText.textContent = question.question;
    answerButtons.innerHTML = "";

    question.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.textContent = choice;
      button.classList.add("btn");
      button.addEventListener("click", () => selectAnswer(choice, question.answer));
      answerButtons.appendChild(button);
    });
  }

  function selectAnswer(selected, correct) {
    if (selected === correct) {
      score++;
      updateScore();
      showNextQuestion();
    } else {
      score = 0;
      usedQuestions = [];
      filterQuestionsByCategory();
    }
  }

  function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
  }

  playAgainBtn.addEventListener("click", () => {
    playAgainBtn.classList.add("hide");
    filterQuestionsByCategory();
  });

  categorySelect.addEventListener("change", () => {
    selectedCategory = categorySelect.value;
    filterQuestionsByCategory();
  });

  loadQuestions();
});
