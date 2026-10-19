const TRIVIA_API_URL =
  "https://opentdb.com/api.php?amount=10&category=31&difficulty=medium&type=multiple";
const PANTRY_API_URL = "https://pantry-proxy-api-rho.vercel.app/quiz-scores";

const quizBox = document.getElementById("quiz-box");
const questionNumber = document.getElementById("question-number");
const questionText = document.getElementById("question-text");
const timerDisplay = document.getElementById("time-left");
const choicesContainer = document.getElementById("choices-container");
const nextBtn = document.getElementById("next-btn");
const loader = document.getElementById("loader");
const highScoreContainer = document.getElementById("high-score-container");
const highScoresList = document.getElementById("high-scores-list");
const playAgainBtn = document.getElementById("play-again-btn");

let currentQuestion = 0;
let questions = [];
let totalScore = 0;
let timerInterval;
let startTime;
let highScores = [];
const totalTime = 10000;

// Fetch Questions
async function fetchQuestions() {
  try {
    const response = await fetch(TRIVIA_API_URL);
    if (!response.ok) {
      throw new Error(`Questions request failed: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.results) || data.results.length === 0) {
      throw new Error("Questions response did not contain any questions");
    }

    questions = data.results;
    loadQuestion();
  } catch (error) {
    console.error("error fetching questions: ", error);
    questionText.innerText =
      "Failed to load questions. Please try again later.";
  }
}

// Load Each Questions to UI
function loadQuestion() {
  if (currentQuestion >= questions.length) {
    endGame();
    return;
  }

  const question = questions[currentQuestion];
  questionText.innerText = decodeHTML(question.question);
  questionNumber.innerText = `Question ${currentQuestion + 1}`;

  // Reset Choices
  choicesContainer.innerText = "";
  nextBtn.disabled = true;

  // Prepare Choices
  const choices = [...question.incorrect_answers, question.correct_answer].sort(
    () => Math.random() - 0.5,
  );
  choices.forEach((choice) => {
    choice = choice.trim();
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("choice");
    button.innerText = decodeHTML(choice);
    button.onclick = () => checkAnswer(choice, question.correct_answer.trim());
    choicesContainer.appendChild(button);
  });
  resetTimer();
  startTimer();
}

// Ensure special characters are decoded
function decodeHTML(html) {
  const txt = document.createElement("div");
  txt.innerHTML = html;
  return txt.textContent;
}

// Start Timer for Questions
function startTimer() {
  startTime = Date.now();
  let timeLeft = totalTime;
  updateTimerDisplay(timeLeft);

  timerInterval = setInterval(() => {
    const elapsedTime = Date.now() - startTime;
    timeLeft = totalTime - elapsedTime;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timeLeft = 0;
      updateTimerDisplay(timeLeft);
      disableChoices();
      nextBtn.disabled = false;
      const correctAnswer = questions[currentQuestion].correct_answer;
      highlightCorrectAnswer(correctAnswer);
    } else {
      updateTimerDisplay(timeLeft);
    }
  }, 50);
}

// Reset Timer to 10s
function resetTimer() {
  clearInterval(timerInterval);
  updateTimerDisplay(totalTime);
}

// Update Timer UI
function updateTimerDisplay(timeLeft) {
  const seconds = (timeLeft / 1000).toFixed(2);
  timerDisplay.innerText = seconds;
}

// Celebrate a correct answer with bottom-to-top confetti
function launchConfetti() {
  const confettiContainer = document.createElement("div");
  confettiContainer.className = "confetti-container";
  document.body.appendChild(confettiContainer);

  const colors = ["#ff4757", "#ffa502", "#2ed573", "#1e90ff", "#e84393"];

  for (let i = 0; i < 70; i++) {
    const confetti = document.createElement("span");
    confetti.className = "confetti";

    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = `${Math.random() * 0.4}s`;
    confetti.style.animationDuration = `${1.8 + Math.random() * 1.5}s`;
    confetti.style.setProperty("--drift", `${-150 + Math.random() * 300}px`);
    confetti.style.setProperty("--rotation", `${Math.random() * 720 - 360}deg`);

    confettiContainer.appendChild(confetti);
  }

  setTimeout(() => {
    confettiContainer.remove();
  }, 3500);
}

// Give feedback for a wrong answer
function showWrongAnswerFeedback() {
  quizBox.classList.remove("wrong-answer");
  void quizBox.offsetWidth;
  quizBox.classList.add("wrong-answer");

  setTimeout(() => {
    quizBox.classList.remove("wrong-answer");
  }, 500);
}

// Check if Answer is Correct
function checkAnswer(selectedAnswer, correctAnswer) {
  clearInterval(timerInterval);
  disableChoices();
  highlightCorrectAnswer(correctAnswer);

  if (selectedAnswer === correctAnswer) {
    const elapsedTime = Date.now() - startTime;
    const timeLeft = Math.max(0, totalTime - elapsedTime);
    const weightedScore = Math.floor((timeLeft / totalTime) * 1000);
    totalScore += weightedScore;
    launchConfetti();
  } else {
    showWrongAnswerFeedback();
  }
  nextBtn.disabled = false;
}

// Disable Choices when Time Expires or choice Selected
function disableChoices() {
  const choices = document.querySelectorAll(".choice");
  choices.forEach((choice) => {
    choice.disabled = true;
  });
}

// Highlight Correct Answer
function highlightCorrectAnswer(correctAnswer) {
  const choices = document.querySelectorAll(".choice");
  choices.forEach((choice) => {
    if (choice.innerText === decodeHTML(correctAnswer)) {
      choice.classList.add("correct");
    } else {
      choice.classList.add("wrong");
    }
  });
}

// Load Next Question
nextBtn.addEventListener("click", () => {
  currentQuestion++;
  loadQuestion();
});

// End Game when finished all Questions
function endGame() {
  quizBox.style.display = "none";
  saveHighScore();
}

// Save High Score
async function saveHighScore() {
  const name = prompt("Enter your Name for the Scoreboard");
  const date = new Date().toLocaleDateString();
  const newScore = { name, score: totalScore, date };

  loader.style.display = "block";

  try {
    const response = await fetch(PANTRY_API_URL);
    if (response.ok) {
      const data = await response.json();
      highScores = Array.isArray(data.highScores) ? data.highScores : [];
    } else {
      highScores = [];
    }
  } catch (error) {
    console.log("Basket not Found, creating a new One");
    highScores = [];
  }

  highScores.push(newScore);

  // Sort high scores and keep only top 10
  highScores.sort((a, b) => Number(b.score) - Number(a.score));
  highScores = highScores.slice(0, 10);

  try {
    const response = await fetch(PANTRY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highScores }),
    });
    if (!response.ok) {
      throw new Error(`High score save failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Error saving high score:", error);
  }

  displayHighScores(newScore);
}

// Display high Scores
function displayHighScores(newScore) {
  highScoresList.innerText = "";

  highScores.forEach((score) => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.innerText = score.name;
    const scoreCell = document.createElement("td");
    scoreCell.innerText = score.score;
    const dateCell = document.createElement("td");
    dateCell.innerText = score.date;

    row.appendChild(nameCell);
    row.appendChild(scoreCell);
    row.appendChild(dateCell);

    // Highlight new score if it's top 10
    if (
      score.name === newScore.name &&
      score.score === newScore.score &&
      score.date === newScore.date
    ) {
      row.classList.add("highlight");
    }
    highScoresList.appendChild(row);
  });

  loader.style.display = "none";
  highScoreContainer.style.display = "flex";
}

// Reload Page to Start quiz over
playAgainBtn.addEventListener("click", () => {
  window.location.reload();
});

// Startup
fetchQuestions();
