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
const coachStatus = document.getElementById("coach-status");

// Config Elements
const apiBaseInput = document.getElementById("api-base");
const apiKeyInput = document.getElementById("api-key");
const apiKeyModal = document.getElementById("api-key-modal");
const apiKeyForm = document.getElementById("api-key-form");
const apiModal = document.getElementById("api-modal");
const coachConfig = document.getElementById("coach-config");
const saveConfigButton = document.getElementById("save-config");

const STORAGE_KEY = "front-lever-progress";
const CONFIG_KEY = "front-lever-config";
const DEFAULT_API_BASE = "https://<DEIN-VERCEL-PROJEKT>.vercel.app";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama3-70b-8192";
const AUTO_PROMPT_COOLDOWN_MS = 45_000;

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
    apiBase: DEFAULT_API_BASE,
    apiKey: "",
  },
};

let lastAutoPromptAt = 0;

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    state.sessions = JSON.parse(stored);
  }
  const config = localStorage.getItem(CONFIG_KEY);
  if (config) {
    state.config = JSON.parse(config);
  }
  if (apiBaseInput) {
    apiBaseInput.value = state.config.apiBase || DEFAULT_API_BASE;
  }
  if (apiKeyInput) {
    apiKeyInput.value = state.config.apiKey || "";
  }
  if (apiKeyModal) {
    apiKeyModal.value = "";
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sessions));
}

function saveConfig() {
  state.config.apiBase = apiBaseInput?.value.trim() || DEFAULT_API_BASE;
  state.config.apiKey = apiKeyInput?.value.trim() || "";
  localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
  setConfigVisibility();
}

function saveApiKey(value) {
  state.config.apiKey = value.trim();
  if (apiKeyInput) apiKeyInput.value = state.config.apiKey;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
  setConfigVisibility();
}

function setConfigVisibility() {
  const hasKey = Boolean(state.config.apiKey);
  if (coachConfig) {
    coachConfig.classList.toggle("is-hidden", hasKey);
  }
  if (apiModal) {
    apiModal.classList.toggle("is-visible", !hasKey);
    apiModal.setAttribute("aria-hidden", hasKey ? "true" : "false");
  }
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
  const uniqueDates = new Set(state.sessions.map((session) => session.date));
  let streak = 0;
  let current = new Date(state.sessions[0].date);
  while (uniqueDates.has(current.toISOString().split("T")[0])) {
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
  const fragment = document.createDocumentFragment();
  state.sessions.slice(0, 5).forEach((session) => {
    const item = document.createElement("li");
    item.textContent = `${session.date} · ${formatVariation(session.variation)} · ${session.holdTime}s x ${session.sets} · RPE ${session.rpe}`;
    fragment.appendChild(item);
  });
  historyList.appendChild(fragment);
}

function renderMilestones() {
  const totalScore = calculateTotalScore();
  milestoneGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();
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
    fragment.appendChild(card);
  });
  milestoneGrid.appendChild(fragment);
}

function addSession(session) {
  state.sessions.unshift(session);
  saveState();
  updateUI();
  requestCoachUpdate("Es gibt ein neues Training. Bitte aktualisiere den Plan.");
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

function setStatus(message, tone = "info") {
  if (!coachStatus) return;
  coachStatus.textContent = message;
  coachStatus.classList.toggle("is-loading", tone === "loading");
  coachStatus.classList.toggle("is-error", tone === "error");
}

function buildContext() {
  const totalScore = calculateTotalScore();
  const latest = state.sessions[0] || null;
  return {
    totalScore,
    latest,
    sessions: state.sessions.slice(0, 6),
    nextMilestone:
      milestones.find((milestone) => totalScore < milestone.requirement)?.title ||
      milestones[milestones.length - 1].title,
  };
}

async function fetchCoachAdvice(message) {
  // 1. Direct Groq
  if (state.config.apiKey && state.config.apiKey.startsWith("gsk_")) {
    const response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.config.apiKey}`,
        },
        body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
            {
            role: "system",
            content:
                "Du bist ein professioneller Front-Lever-Coach. Antworte klar, motivierend und konkret. Gib priorisierte Schritte, Load-Management und kurze Technik-Cues.",
            },
            {
            role: "user",
            content: message,
            },
        ],
        temperature: 0.6,
        }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "Groq Error");
    return data.choices?.[0]?.message?.content || "Keine Antwort.";
  }

  // 2. Proxy
  const apiBase = state.config.apiBase || DEFAULT_API_BASE;
  if (apiBase && !apiBase.includes("<DEIN-VERCEL-PROJEKT>")) {
    const response = await fetch(`${apiBase.replace(/\/$/, "")}/api/coach`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({
        message,
        context: buildContext(),
        }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Proxy Error");
    return data.reply || "Keine Antwort.";
  }

  // 3. Fallback
  return exampleCoachReplies[Math.floor(Math.random() * exampleCoachReplies.length)];
}

function buildAutoPrompt(reason) {
  const totalScore = calculateTotalScore();
  const latest = state.sessions[0];
  const history = state.sessions.slice(0, 5);
  const milestone = milestones.find((item) => totalScore < item.requirement) || milestones[milestones.length - 1];
  const summary = history
    .map((session) => `${session.date}: ${formatVariation(session.variation)} ${session.holdTime}s x ${session.sets} RPE ${session.rpe}`)
    .join("; ");

  return [
    reason,
    `Ziel: Front Lever lernen. Aktueller Score: ${totalScore}. Nächster Meilenstein: ${milestone.title}.`,
    latest ? `Letzter Eintrag: ${formatVariation(latest.variation)} ${latest.holdTime}s x ${latest.sets} (RPE ${latest.rpe}).` : "Noch keine Einträge.",
    `Historie (letzte 5): ${summary || "keine"}.`,
    "Bitte gib: 1) nächste Trainingseinheit, 2) Technik-Fokus, 3) Progressionsschritt, 4) Recovery-Tipp.",
  ].join("\n");
}

async function requestCoachUpdate(reason) {
  const now = Date.now();
  const hasKey = state.config.apiKey && state.config.apiKey.startsWith("gsk_");
  const hasProxy = state.config.apiBase && !state.config.apiBase.includes("<DEIN-VERCEL-PROJEKT>");

  if (!hasKey && !hasProxy) return;

  if (now - lastAutoPromptAt < AUTO_PROMPT_COOLDOWN_MS) {
    return;
  }
  lastAutoPromptAt = now;
  const prompt = buildAutoPrompt(reason);
  try {
    const reply = await fetchCoachAdvice(prompt);
    pushMessage(reply, "coach");
  } catch (error) {
    console.error(error);
  }
}

if (form) {
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
}

if (coachForm) {
  coachForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = coachInput.value.trim();
    if (!message) return;
    pushMessage(message, "user");
    coachInput.value = "";
    setStatus("Coach antwortet…", "loading");

    try {
      const reply = await fetchCoachAdvice(message);
      pushMessage(reply, "coach");
      setStatus("Coach bereit.", "info");
    } catch (error) {
      console.error(error);
      pushMessage("Der Coach ist gerade nicht erreichbar. Bitte versuche es später erneut.", "coach");
      setStatus("Fehler beim Coach-Request.", "error");
    }
  });
}

if (saveConfigButton) {
  saveConfigButton.addEventListener("click", () => {
    try {
      saveConfig();
      pushMessage("Konfiguration gespeichert. Frag den Coach nach deinem nächsten Schritt!", "coach");
      requestCoachUpdate("Neue Konfiguration gespeichert. Bitte erstelle eine individuelle Startanalyse.");
      setStatus("API-Konfiguration gespeichert.", "info");
    } catch (error) {
      console.error(error);
      setStatus("Konnte Konfiguration nicht speichern.", "error");
    }
  });
}

if (apiKeyForm) {
  apiKeyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!apiKeyModal.value.trim()) return;
    saveApiKey(apiKeyModal.value);
    apiKeyModal.value = "";
    pushMessage("Super! Dein Groq Coach ist jetzt verbunden.", "coach");
    requestCoachUpdate("Bitte starte mit einer kurzen Einstufung und einem Einstiegsplan.");
  });
}

const startButton = document.getElementById("start-today");
const scrollCoachButton = document.getElementById("scroll-coach");
if (startButton) {
  startButton.addEventListener("click", () => {
    try {
      document.getElementById("progress").scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error(error);
    }
  });
}
if (scrollCoachButton) {
  scrollCoachButton.addEventListener("click", () => {
    try {
      document.getElementById("coach").scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error(error);
    }
  });
}

// Initialize
loadState();
updateUI();
setConfigVisibility();
pushMessage("Hi! Ich bin dein Front-Lever-Coach. Frag mich nach deinem nächsten Schritt.", "coach");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Service Worker Registrierung fehlgeschlagen:", error);
    });
  });
}
