const wordsElement = document.getElementById("words");
const typingArea = document.getElementById("typing-area");
const caret = document.getElementById("caret");
const wpmElement = document.getElementById("wpm");
const accuracyElement = document.getElementById("accuracy");
const timerElement = document.getElementById("timer");
const bestElement = document.getElementById("best");
const resultSection = document.getElementById("result");
const finalWpm = document.getElementById("final-wpm");
const finalAccuracy = document.getElementById("final-accuracy");
const finalChars = document.getElementById("final-chars");
const finalTime = document.getElementById("final-time");
const restartButton = document.getElementById("restart-button");
const modeButtons = document.querySelectorAll(".mode");
const soundSelect = document.getElementById("sound-select");
const volumeInput = document.getElementById("volume");

const WORD_BANK = [
  "time","year","people","way","day","man","thing","woman","life","child",
  "world","school","state","family","student","group","country","problem",
  "hand","part","place","case","week","company","system","program","question",
  "work","government","number","night","point","home","water","room","mother",
  "area","money","story","fact","month","lot","right","study","book","eye",
  "job","word","business","issue","side","kind","head","house","service",
  "friend","father","power","hour","game","line","end","member","law","car",
  "city","community","name","president","team","minute","idea","kid","body",
  "information","back","parent","face","others","level","office","health",
  "person","art","war","history","party","result","change","morning","reason",
  "research","girl","guy","moment","air","teacher","force","education"
];

let testDuration = 15;
let words = [];
let currentWordIndex = 0;
let currentLetterIndex = 0;
let typedCharacters = 0;
let correctCharacters = 0;
let incorrectCharacters = 0;
let extraCharacters = 0;
let startTime = null;
let remainingTime = testDuration;
let isTestActive = false;
let isTestFinished = false;
let animationId = null;

let audioContext = null;
let soundType = "soft";
let volume = 0.45;

function createAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTypingSound(isError = false) {
  if (soundType === "off") return;

  createAudioContext();

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  const soundProfiles = {
    soft: { frequency: 720, type: "sine", duration: 0.045, volume: 0.08 },
    mechanical: { frequency: 180, type: "square", duration: 0.055, volume: 0.06 },
    typewriter: { frequency: 950, type: "triangle", duration: 0.035, volume: 0.09 },
    bubble: { frequency: 420, type: "sine", duration: 0.075, volume: 0.1 }
  };

  const profile = soundProfiles[soundType];
  const now = audioContext.currentTime;

  oscillator.type = profile.type;
  oscillator.frequency.setValueAtTime(
    isError ? profile.frequency * 0.55 : profile.frequency,
    now
  );

  gainNode.gain.setValueAtTime(profile.volume * volume, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + profile.duration);
}

function getRandomWords(count) {
  const result = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * WORD_BANK.length);
    result.push(WORD_BANK[randomIndex]);
  }

  return result;
}

function renderWords() {
  wordsElement.innerHTML = "";

  words.forEach((word, wordIndex) => {
    const wordElement = document.createElement("span");
    wordElement.className = "word";
    wordElement.dataset.index = wordIndex;

    word.split("").forEach(letter => {
      const letterElement = document.createElement("span");
      letterElement.className = "letter";
      letterElement.textContent = letter;
      wordElement.appendChild(letterElement);
    });

    wordsElement.appendChild(wordElement);
  });

  updateCaret();
}

function updateCaret() {
  const currentWord = wordsElement.children[currentWordIndex];

  if (!currentWord) return;

  const letters = currentWord.querySelectorAll(".letter");
  const targetLetter = letters[currentLetterIndex];

  const left = targetLetter
    ? targetLetter.offsetLeft
    : currentWord.offsetLeft + currentWord.offsetWidth;

  const top = targetLetter
    ? targetLetter.offsetTop
    : currentWord.offsetTop;

  caret.style.left = `${left}px`;
  caret.style.top = `${top}px`;
}

function startTest() {
  if (isTestActive || isTestFinished) return;

  isTestActive = true;
  startTime = performance.now();

  updateTimer();
}

function updateTimer() {
  const elapsed = (performance.now() - startTime) / 1000;
  remainingTime = Math.max(0, testDuration - elapsed);

  timerElement.textContent = Math.ceil(remainingTime);
  updateLiveStats();

  if (remainingTime <= 0) {
    finishTest();
    return;
  }

  animationId = requestAnimationFrame(updateTimer);
}

function updateLiveStats() {
  const elapsedMinutes = (performance.now() - startTime) / 60000;

  if (elapsedMinutes <= 0) {
    wpmElement.textContent = "0";
    return;
  }

  const wpm = Math.round(correctCharacters / 5 / elapsedMinutes);
  const totalTyped = typedCharacters + extraCharacters;
  const accuracy = totalTyped === 0
    ? 100
    : Math.round((correctCharacters / totalTyped) * 100);

  wpmElement.textContent = wpm;
  accuracyElement.textContent = `${accuracy}%`;
}

function handleCharacter(key) {
  const currentWord = wordsElement.children[currentWordIndex];

  if (!currentWord) return;

  const letters = currentWord.querySelectorAll(".letter");
  const expectedLetter = letters[currentLetterIndex];

  if (!expectedLetter) {
    const extraLetter = document.createElement("span");
    extraLetter.className = "letter extra";
    extraLetter.textContent = key;
    currentWord.appendChild(extraLetter);

    extraCharacters++;
    playTypingSound(true);
    currentLetterIndex++;
    updateCaret();
    return;
  }

  if (expectedLetter.textContent === key) {
    expectedLetter.classList.add("correct");
    correctCharacters++;
    playTypingSound(false);
  } else {
    expectedLetter.classList.add("incorrect");
    currentWord.classList.add("error");
    incorrectCharacters++;
    playTypingSound(true);
  }

  typedCharacters++;
  currentLetterIndex++;
  updateLiveStats();
  updateCaret();
}

function handleBackspace() {
  const currentWord = wordsElement.children[currentWordIndex];

  if (!currentWord) return;

  if (currentLetterIndex === 0) {
    if (currentWordIndex === 0) return;

    currentWordIndex--;
    currentLetterIndex = wordsElement.children[currentWordIndex]
      .querySelectorAll(".letter").length;

    updateCaret();
    return;
  }

  currentLetterIndex--;

  const letters = currentWord.querySelectorAll(".letter");
  const letter = letters[currentLetterIndex];

  if (letter && letter.classList.contains("extra")) {
    letter.remove();
    extraCharacters = Math.max(0, extraCharacters - 1);
  } else if (letter) {
    if (letter.classList.contains("correct")) {
      correctCharacters = Math.max(0, correctCharacters - 1);
    } else if (letter.classList.contains("incorrect")) {
      incorrectCharacters = Math.max(0, incorrectCharacters - 1);
    }

    letter.className = "letter";
    currentWord.classList.remove("error");
  }

  typedCharacters = Math.max(0, typedCharacters - 1);
  updateLiveStats();
  updateCaret();
}

function handleSpace() {
  const currentWord = wordsElement.children[currentWordIndex];

  if (!currentWord) return;

  const letters = currentWord.querySelectorAll(".letter:not(.extra)");
  const lastLetter = letters[letters.length - 1];

  if (lastLetter && !lastLetter.classList.contains("correct")) {
    currentWord.classList.add("error");
    incorrectCharacters++;
  }

  currentWordIndex++;
  currentLetterIndex = 0;
  typedCharacters++;

  if (currentWordIndex >= words.length) {
    words = words.concat(getRandomWords(30));
    renderWords();
    currentWordIndex = words.length - 30;
  }

  playTypingSound(false);
  updateCaret();
}

function finishTest() {
  isTestActive = false;
  isTestFinished = true;
  cancelAnimationFrame(animationId);

  const elapsedMinutes = testDuration / 60;
  const wpm = Math.round(correctCharacters / 5 / elapsedMinutes);
  const totalTyped = typedCharacters + extraCharacters;
  const accuracy = totalTyped === 0
    ? 0
    : Math.round((correctCharacters / totalTyped) * 100);

  finalWpm.textContent = wpm;
  finalAccuracy.textContent = `${accuracy}%`;
  finalChars.textContent = `${correctCharacters}/${totalTyped}`;
  finalTime.textContent = `${testDuration}s`;

  const bestKey = `typeflow-best-${testDuration}`;
  const previousBest = Number(localStorage.getItem(bestKey)) || 0;

  if (wpm > previousBest) {
    localStorage.setItem(bestKey, wpm);
    bestElement.textContent = wpm;
  }

  resultSection.classList.remove("hidden");
  typingArea.classList.add("hidden");
}

function restartTest() {
  cancelAnimationFrame(animationId);

  isTestActive = false;
  isTestFinished = false;
  currentWordIndex = 0;
  currentLetterIndex = 0;
  typedCharacters = 0;
  correctCharacters = 0;
  incorrectCharacters = 0;
  extraCharacters = 0;
  startTime = null;
  remainingTime = testDuration;

  words = getRandomWords(60);
  renderWords();

  wpmElement.textContent = "0";
  accuracyElement.textContent = "100%";
  timerElement.textContent = testDuration;

  resultSection.classList.add("hidden");
  typingArea.classList.remove("hidden");
  typingArea.focus();
}

typingArea.addEventListener("keydown", event => {
  if (event.key === "Tab") {
    event.preventDefault();
    restartTest();
    return;
  }

  if (isTestFinished) return;

  if (event.key === "Backspace") {
    event.preventDefault();
    handleBackspace();
    return;
  }

  if (event.key === " ") {
    event.preventDefault();
    handleSpace();
    return;
  }

  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();

    if (!isTestActive) {
      startTest();
    }

    handleCharacter(event.key);
  }
});

modeButtons.forEach(button => {
  button.addEventListener("click", () => {
    modeButtons.forEach(item => item.classList.remove("active"));
    button.classList.add("active");

    testDuration = Number(button.dataset.time);
    restartTest();
  });
});

soundSelect.addEventListener("change", () => {
  soundType = soundSelect.value;
  createAudioContext();
  playTypingSound(false);
});

volumeInput.addEventListener("input", () => {
  volume = Number(volumeInput.value) / 100;
});

restartButton.addEventListener("click", restartTest);

window.addEventListener("resize", updateCaret);

function initialize() {
  const bestKey = `typeflow-best-${testDuration}`;
  const bestScore = localStorage.getItem(bestKey);

  if (bestScore) {
    bestElement.textContent = bestScore;
  }

  restartTest();
}

initialize();