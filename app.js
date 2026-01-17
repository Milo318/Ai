const form = document.getElementById("progress-form");
const historyList = document.getElementById("history-list");
const scoreEl = document.getElementById("score");
const lastHoldEl = document.getElementById("last-hold");
const streakEl = document.getElementById("streak");
const progressFill = document.getElementById("progress-fill");
const progressLabel = document.getElementById("progress-label");
const milestoneGrid = document.getElementById("milestone-grid");
const chatLog = document.getElementById("chat-log");
const coachForm = document.getElementById("coach-form");
const coachInput = document.getElementById("coach-input");
const apiUrlInput = document.getElementById("api-url");
const apiKeyInput = document.getElementById("api-key");

const STORAGE_KEY = "front-lever-progress";
const CONFIG_KEY = "front-lever-config";

const milestones = [
  {
    title: "Tuck 10s",
    requirement: 10,
    description: "Saubere Tuck Holds mit 10 Sekunden.",
  },
  {
    title: "Advanced Tuck 8s",
    requirement: 18,
    description: "Knackige Advanced Tuck mit stabiler Schulter.",
  },
  {
    title: "One-Leg 6s",
    requirement: 26,
    description: "Ein Bein gestreckt, Hüfte bleibt parallel.",
  },
  {
    title: "Straddle 5s",
    requirement: 34,
    description: "Breite Straddle Holds, Schulter bleibt aktiv.",
  },
  {
    title: "Full Front Lever 3s",
    requirement: 42,
    description: "Voll gestreckt für mindestens 3 Sekunden.",
  },
];

const exampleCoachReplies = [
  "Fokus heute: 4x8s Advanced Tuck, RPE 7, 90s Pause.",
  "Achte auf eine leichte Beckenkippung nach hinten und aktives Lat-Engagement.",
  "Nächster Schritt: 3x6s One-Leg, danach 2x10s Tuck als Volume-Backoff.",
];

const scoreWeights = {
  tuck: 1,
  "advanced-tuck": 1.4,
  "one-leg": 1.7,
  straddle: 2,
  full: 2.4,
};

const state = {
  sessions: [],
  config: {
    apiUrl: "",
    apiKey: "",
  },
};

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    state.sessions = JSON.parse(stored);
  }
  const config = localStorage.getItem(CONFIG_KEY);
  if (config) {
    state.config = JSON.parse(config);
  }
  apiUrlInput.value = state.config.apiUrl || "";
  apiKeyInput.value = state.config.apiKey || "";
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sessions));
}

function saveConfig() {
  state.config.apiUrl = apiUrlInput.value.trim();
  state.config.apiKey = apiKeyInput.value.trim();
  localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
}

function calculateScore(session) {
  const weight = scoreWeights[session.variation] || 1;
  return Math.round(session.holdTime * session.sets * weight);
}

function calculateTotalScore() {
  return state.sessions.reduce((total, session) => total + calculateScore(session), 0);
}

function updateScoreCard() {
  const totalScore = calculateTotalScore();
  scoreEl.textContent = totalScore;
  const lastSession = state.sessions[0];
  lastHoldEl.textContent = lastSession
    ? `${lastSession.holdTime}s · ${formatVariation(lastSession.variation)}`
    : "-";
  streakEl.textContent = `${calculateStreak()} Tage`;

  const nextMilestone = milestones.find((milestone) => totalScore < milestone.requirement) || milestones[milestones.length - 1];
  const previousRequirement = milestones
    .filter((milestone) => totalScore >= milestone.requirement)
    .slice(-1)[0]?.requirement || 0;
  const progressRange = nextMilestone.requirement - previousRequirement || 1;
  const progressValue = Math.min(100, ((totalScore - previousRequirement) / progressRange) * 100);
  progressFill.style.width = `${progressValue}%`;
  progressLabel.textContent = `${Math.round(progressValue)}% zum nächsten Meilenstein`;
}

function calculateStreak() {
  if (!state.sessions.length) return 0;
  const dates = [...new Set(state.sessions.map((session) => session.date))];
  let streak = 0;
  let current = new Date(dates[0]);
  while (dates.includes(current.toISOString().split("T")[0])) {
    streak += 1;
    current.setDate(current.getDate() - 1);
  }
  return streak;
}

function formatVariation(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function renderHistory() {
  historyList.innerHTML = "";
  state.sessions.slice(0, 5).forEach((session) => {
    const item = document.createElement("li");
    item.textContent = `${session.date} · ${formatVariation(session.variation)} · ${session.holdTime}s x ${session.sets} · RPE ${session.rpe}`;
    historyList.appendChild(item);
  });
}

function renderMilestones() {
  const totalScore = calculateTotalScore();
  milestoneGrid.innerHTML = "";
  milestones.forEach((milestone) => {
    const card = document.createElement("div");
    card.className = "milestone";
    if (totalScore >= milestone.requirement) {
      card.classList.add("completed");
    }
    card.innerHTML = `
      <span>${milestone.title}</span>
      <p>${milestone.description}</p>
      <small>Benötigter Score: ${milestone.requirement}</small>
    `;
    milestoneGrid.appendChild(card);
  });
}

function addSession(session) {
  state.sessions.unshift(session);
  saveState();
  updateUI();
}

function updateUI() {
  updateScoreCard();
  renderHistory();
  renderMilestones();
}

function pushMessage(content, sender) {
  const message = document.createElement("div");
  message.className = `chat-message ${sender}`;
  message.textContent = content;
  chatLog.appendChild(message);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function fetchCoachAdvice(message) {
  if (!state.config.apiUrl) {
    return exampleCoachReplies[Math.floor(Math.random() * exampleCoachReplies.length)];
  }

  const payload = {
    message,
    sessions: state.sessions.slice(0, 6),
  };

  const response = await fetch(state.config.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(state.config.apiKey ? { Authorization: `Bearer ${state.config.apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Coach API Fehler");
  }
  const data = await response.json();
  return data.reply || "Der Coach hat keine Antwort geliefert.";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const variation = document.getElementById("variation").value;
  const holdTime = Number(document.getElementById("hold-time").value);
  const sets = Number(document.getElementById("sets").value);
  const rpe = Number(document.getElementById("rpe").value);

  const session = {
    variation,
    holdTime,
    sets,
    rpe,
    date: new Date().toISOString().split("T")[0],
  };

  addSession(session);
  form.reset();
});

coachForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = coachInput.value.trim();
  if (!message) return;
  pushMessage(message, "user");
  coachInput.value = "";

  try {
    const reply = await fetchCoachAdvice(message);
    pushMessage(reply, "coach");
  } catch (error) {
    pushMessage("Der Coach ist gerade nicht erreichbar. Bitte versuche es später erneut.", "coach");
  }
});

const saveConfigButton = document.getElementById("save-config");
if (saveConfigButton) {
  saveConfigButton.addEventListener("click", () => {
    saveConfig();
    pushMessage("Konfiguration gespeichert. Frag den Coach nach deinem nächsten Schritt!", "coach");
  });
}

const startButton = document.getElementById("start-today");
const scrollCoachButton = document.getElementById("scroll-coach");
if (startButton) {
  startButton.addEventListener("click", () => {
    document.getElementById("progress").scrollIntoView({ behavior: "smooth" });
  });
}
if (scrollCoachButton) {
  scrollCoachButton.addEventListener("click", () => {
    document.getElementById("coach").scrollIntoView({ behavior: "smooth" });
  });
}

loadState();
updateUI();
pushMessage("Hi! Ich bin dein Front-Lever-Coach. Frag mich nach deinem nächsten Schritt.", "coach");
