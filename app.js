// Constants
const STORAGE_KEY = "front-lever-progress";
const CONFIG_KEY = "front-lever-config";
const CHALLENGE_KEY = "front-lever-challenges";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama3-70b-8192";
const AUTO_PROMPT_COOLDOWN_MS = 45_000;
const DEFAULT_API_BASE = ""; // Relative path by default

// DOM Elements
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
const coachConfig = document.getElementById("coach-config");
const challengeCard = document.getElementById("challenge-card");

// Config Elements
const apiKeyInput = document.getElementById("api-key");
const apiBaseInput = document.getElementById("api-base");
const saveConfigButton = document.getElementById("save-config");

// Modal Elements
const apiModal = document.getElementById("api-modal");
const apiKeyModal = document.getElementById("api-key-modal");
const apiKeyForm = document.getElementById("api-key-form");

// Navigation
const startButton = document.getElementById("start-today");
const scrollCoachButton = document.getElementById("scroll-coach");

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

const dailyChallenges = [
  { id: 'scapula', title: 'Scapula Shrugs', count: '3x15', desc: 'Isolierte Scapula-Bewegung im Hang.' },
  { id: 'hollow', title: 'Hollow Body Hold', count: '3x45s', desc: 'Maximale Körperspannung am Boden.' },
  { id: 'hang', title: 'Dead Hang', count: '3x30s', desc: 'Passives Hängen für Griffkraft und Schulteröffnung.' },
  { id: 'rows', title: 'Bodyweight Rows', count: '4x12', desc: 'Stärke deinen oberen Rücken.' },
  { id: 'skin', title: 'Skin the Cat', count: '3x5', desc: 'Mobilität für die Schulter (vorsichtig!).' },
  { id: 'plank', title: 'RKC Plank', count: '3x30s', desc: 'Plank mit maximaler Spannung (Fäuste ballen, Gesäß fest).' },
  { id: 'dragon', title: 'Dragon Flag Negatives', count: '3x5', desc: 'Langsam ablassen, Rücken gerade halten.' },
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

// State
const state = {
  sessions: [],
  config: {
    apiBase: DEFAULT_API_BASE,
    apiKey: "",
  },
  challenges: {} // Map dateString -> boolean
};

let lastAutoPromptAt = 0;

// Initialization
function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      state.sessions = JSON.parse(stored);
    }
    const config = localStorage.getItem(CONFIG_KEY);
    if (config) {
      state.config = { ...state.config, ...JSON.parse(config) };
    }
    const challenges = localStorage.getItem(CHALLENGE_KEY);
    if (challenges) {
        state.challenges = JSON.parse(challenges);
    }

    // Update inputs
    if (apiKeyInput) apiKeyInput.value = state.config.apiKey || "";
    if (apiBaseInput) apiBaseInput.value = state.config.apiBase || "";

  } catch (e) {
    console.error("Failed to load state", e);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sessions));
}

function saveChallengeState() {
    localStorage.setItem(CHALLENGE_KEY, JSON.stringify(state.challenges));
}

function saveConfig() {
  state.config.apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";
  state.config.apiBase = apiBaseInput ? apiBaseInput.value.trim() : "";
  localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
  setConfigVisibility();
}

function setConfigVisibility() {
  const hasKey = Boolean(state.config.apiKey);
  if (coachConfig) {
      // Optional: hide/show sections
  }

  if (apiModal) {
    apiModal.classList.toggle("is-visible", !hasKey && state.sessions.length > 0);
    if (hasKey) {
        apiModal.classList.remove("is-visible");
        apiModal.setAttribute("aria-hidden", "true");
    }
  }
}

// Logic
function calculateScore(session) {
  const weight = scoreWeights[session.variation] || 1;
  return Math.round(session.holdTime * session.sets * weight);
}

function calculateTotalScore() {
  return state.sessions.reduce((total, session) => total + calculateScore(session), 0);
}

function calculateStreak() {
  if (!state.sessions.length) return 0;
  const dates = [...new Set(state.sessions.map((session) => session.date))];
  dates.sort((a, b) => new Date(b) - new Date(a));

  let streakCount = 0;
  if (dates.length > 0) {
      let currentDate = new Date(dates[0]);
      while (true) {
          const dateStr = currentDate.toISOString().split("T")[0];
          if (dates.includes(dateStr)) {
              streakCount++;
              currentDate.setDate(currentDate.getDate() - 1);
          } else {
              break;
          }
      }
  }
  return streakCount;
}

function formatVariation(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDailyChallenge(dateStr) {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % dailyChallenges.length;
    return dailyChallenges[index];
}

// UI Rendering
function updateScoreCard() {
  const totalScore = calculateTotalScore();
  scoreEl.textContent = totalScore;
  const lastSession = state.sessions[0];
  lastHoldEl.textContent = lastSession
    ? `${lastSession.holdTime}s · ${formatVariation(lastSession.variation)}`
    : "-";
  streakEl.textContent = `${calculateStreak()} Tage`;

  const nextMilestone = milestones.find((milestone) => totalScore < milestone.requirement) || milestones[milestones.length - 1];

  let previousRequirement = 0;
  for (let i = 0; i < milestones.length; i++) {
      if (milestones[i].requirement <= totalScore) {
          previousRequirement = milestones[i].requirement;
      } else {
          break;
      }
  }

  const progressRange = nextMilestone.requirement - previousRequirement || 1;
  const currentProgress = totalScore - previousRequirement;
  const progressValue = Math.min(100, Math.max(0, (currentProgress / progressRange) * 100));

  progressFill.style.width = `${progressValue}%`;
  progressLabel.textContent = `${Math.round(progressValue)}% zum nächsten Meilenstein`;
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

function renderDailyChallenge() {
    if (!challengeCard) return;

    const today = new Date().toISOString().split("T")[0];
    const challenge = getDailyChallenge(today);
    const isCompleted = state.challenges[today];

    challengeCard.innerHTML = `
        <div class="challenge-header">
            <span class="challenge-title">${challenge.title}</span>
            <span class="challenge-meta">${challenge.count}</span>
        </div>
        <p>${challenge.desc}</p>
        <button class="${isCompleted ? 'ghost' : 'primary'}" id="complete-challenge" ${isCompleted ? 'disabled' : ''}>
            ${isCompleted ? 'Erledigt ✅' : 'Challenge erledigt'}
        </button>
    `;

    if (isCompleted) {
        challengeCard.classList.add("completed");
    } else {
        challengeCard.classList.remove("completed");
    }

    const btn = document.getElementById("complete-challenge");
    if (btn && !isCompleted) {
        btn.addEventListener("click", () => {
            state.challenges[today] = true;
            saveChallengeState();
            renderDailyChallenge();
            pushMessage(`Super! Tägliche Challenge "${challenge.title}" erledigt.`, "coach");
        });
    }
}

function updateUI() {
  updateScoreCard();
  renderHistory();
  renderMilestones();
  renderDailyChallenge();
}

function addSession(session) {
  state.sessions.unshift(session);
  saveState();
  updateUI();
  requestCoachUpdate("Es gibt ein neues Training. Bitte aktualisiere den Plan.");
}

// Coach Logic
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
  coachStatus.className = "status";
  if (tone === "loading") coachStatus.classList.add("is-loading");
  if (tone === "error") coachStatus.classList.add("is-error");
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
  if (state.config.apiKey) {
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
                role: "system",
                content: `Context: ${JSON.stringify(buildContext())}`
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.6,
        }),
    });

    if (!response.ok) throw new Error("Groq API Error");
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Keine Antwort.";
  }

  try {
      const baseUrl = state.config.apiBase ? state.config.apiBase.replace(/\/$/, "") : "";
      const endpoint = baseUrl ? `${baseUrl}/api/coach` : '/api/coach';

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          context: buildContext(),
        }),
      });

      if (!response.ok) throw new Error("Proxy API Error");
      const data = await response.json();
      return data.reply || "Keine Antwort.";

  } catch (err) {
      console.warn("Proxy failed, using example", err);
      return exampleCoachReplies[Math.floor(Math.random() * exampleCoachReplies.length)];
  }
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
  if (now - lastAutoPromptAt < AUTO_PROMPT_COOLDOWN_MS) {
    return;
  }
  lastAutoPromptAt = now;
  const prompt = buildAutoPrompt(reason);
  try {
    const reply = await fetchCoachAdvice(prompt);
    pushMessage(reply, "coach");
  } catch (error) {
    console.log("Auto-coach update failed", error);
  }
}

// Event Listeners
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
    setStatus("Coach schreibt...", "loading");

    try {
      const reply = await fetchCoachAdvice(message);
      pushMessage(reply, "coach");
      setStatus("Coach bereit.", "info");
    } catch (error) {
      console.error(error);
      pushMessage("Der Coach ist gerade nicht erreichbar.", "coach");
      setStatus("Fehler.", "error");
    }
  });
}

if (saveConfigButton) {
  saveConfigButton.addEventListener("click", () => {
    saveConfig();
    pushMessage("Konfiguration gespeichert.", "coach");
    requestCoachUpdate("Neue Konfiguration.");
    setStatus("Gespeichert.", "info");
  });
}

if (apiKeyForm) {
  apiKeyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const val = apiKeyModal.value.trim();
    if (!val) return;

    state.config.apiKey = val;
    saveConfig();

    apiKeyModal.value = "";
    setConfigVisibility();

    pushMessage("Groq Key gespeichert. Coach ist bereit!", "coach");
    requestCoachUpdate("Initialer Plan nach Setup.");
  });
}

if (startButton) {
  startButton.addEventListener("click", () => {
    const el = document.getElementById("progress");
    if(el) el.scrollIntoView({ behavior: "smooth" });
  });
}

if (scrollCoachButton) {
  scrollCoachButton.addEventListener("click", () => {
    const el = document.getElementById("coach");
    if(el) el.scrollIntoView({ behavior: "smooth" });
  });
}

// Start
loadState();
updateUI();
setConfigVisibility();

if (state.sessions.length === 0) {
    pushMessage("Willkommen! Ich bin dein Coach. Starte dein erstes Training oder frag mich etwas.", "coach");
} else {
    pushMessage("Willkommen zurück! Wie war dein letztes Training?", "coach");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Service Worker error:", error);
    });
  });
}
