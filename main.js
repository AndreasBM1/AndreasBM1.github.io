// Persistence key and defaults
const STORAGE_KEY = "incrementalGame.state.v1";

// Building definitions (expanded, themed)
const BUILDINGS = [
  {
    id: "spoon",
    name: "Spoon",
    baseCost: 10,
    cps: 1,
    emoji: "🥄",
  },
  {
    id: "grandma",
    name: "Grandma",
    baseCost: 100,
    cps: 10,
    emoji: "👵",
  },
  {
    id: "oven",
    name: "Oven",
    baseCost: 1200,
    cps: 120,
    emoji: "🔥",
  },
  {
    id: "baker",
    name: "Baker",
    baseCost: 10000,
    cps: 1000,
    emoji: "🧑‍🍳",
  },
  {
    id: "drømmekage_factory",
    name: "Drømmekage Factory",
    baseCost: 120000,
    cps: 12000,
    emoji: "🍰",
  },
  {
    id: "restaurant",
    name: "Restaurant",
    baseCost: 1000000,
    cps: 100000,
    emoji: "🍽️",
  },
  {
    id: "food_truck",
    name: "Food Truck",
    baseCost: 12000000,
    cps: 1200000,
    emoji: "🚚",
  },
  {
    id: "chef_school",
    name: "Chef School",
    baseCost: 100000000,
    cps: 10000000,
    emoji: "🎓",
  },
];

// Add buildings to default state
const DEFAULT_STATE = {
  count: 0,
  totalClicks: 0,
  buildings: BUILDINGS.reduce((acc, b) => {
    acc[b.id] = 0;
    return acc;
  }, {}),
};

// DOM elements
const counterElement = document.getElementById("counter");
const clickButton = document.getElementById("clickButton");
const totalClicksElement = document.getElementById("totalClicks");
const resetButton = document.getElementById("resetButton");
const exportButton = document.getElementById("exportButton");
const importButton = document.getElementById("importButton");
const importFileInput = document.getElementById("importFile");
const buildingsListElement = document.getElementById("buildingsList");
// Add reference for mute button and audio
const muteMusicButton = document.getElementById("muteMusicButton");
const bgMusic = document.getElementById("bgMusic");
const muteIcon = document.getElementById("muteIcon");

// SVGs for mute/unmute
const SVG_UNMUTE = `
  <svg id="muteIcon" width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path d="M4 12v8h6l8 8V4l-8 8H4z" fill="#222"/>
    <path d="M24 10l4 4m0 0l-4 4" stroke="#bada55" stroke-width="2" stroke-linecap="round"/>
  </svg>
`;
const SVG_MUTE = `
  <svg id="muteIcon" width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path d="M4 12v8h6l8 8V4l-8 8H4z" fill="#222"/>
    <line x1="24" y1="10" x2="28" y2="14" stroke="#bada55" stroke-width="2" stroke-linecap="round"/>
    <line x1="28" y1="10" x2="24" y2="14" stroke="#bada55" stroke-width="2" stroke-linecap="round"/>
  </svg>
`;

// In-memory state
let state = { ...DEFAULT_STATE };

// Load saved state from localStorage
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.count === "number" &&
      typeof parsed.totalClicks === "number"
    ) {
      state = {
        count: parsed.count,
        totalClicks: parsed.totalClicks,
        buildings: { ...DEFAULT_STATE.buildings, ...(parsed.buildings || {}) },
      };
    }
  } catch (e) {
    console.warn("Failed to load saved state:", e);
  }
}

// Save current state to localStorage
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state:", e);
  }
}

// Update the DOM with the current state
function render() {
  counterElement.textContent = state.count;
  totalClicksElement.textContent = state.totalClicks;
  renderBuildings();
}

function renderBuildings() {
  // Two columns layout
  buildingsListElement.innerHTML = "";
  const leftCol = document.createElement("div");
  const rightCol = document.createElement("div");
  leftCol.className = "buildings-col";
  rightCol.className = "buildings-col";
  BUILDINGS.forEach((building, idx) => {
    const owned = state.buildings[building.id] || 0;
    const cost = building.baseCost * Math.pow(1.15, owned);
    const div = document.createElement("div");
    div.className = "building-entry";
    div.style.marginBottom = "12px";
    div.innerHTML = `
      <span style="font-size: 1.5em; margin-right: 8px;">${
        building.emoji
      }</span>
      <strong>${building.name}</strong>
      <span style="color:#bada55;">(${building.cps} cps)</span><br>
      Owned: <span>${owned}</span>
      <button data-id="${building.id}">Buy (${Math.floor(cost)} clicks)</button>
    `;
    div.querySelector("button").onclick = function () {
      buyBuilding(building.id);
    };
    if (idx % 2 === 0) {
      leftCol.appendChild(div);
    } else {
      rightCol.appendChild(div);
    }
  });
  const row = document.createElement("div");
  row.className = "buildings-row";
  row.appendChild(leftCol);
  row.appendChild(rightCol);
  buildingsListElement.appendChild(row);
}

// Reset to defaults
function resetState() {
  if (!confirm("Reset your progress? This cannot be undone.")) return;
  state = { ...DEFAULT_STATE };
  saveState();
  render();
  showNotification("Progress reset.");
}

// Notification logic
function showNotification(msg, timeout = 2500) {
  const el = document.getElementById("notification");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => {
    el.classList.remove("show");
  }, timeout);
}

// Export state as JSON file (download)
function exportState() {
  try {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "incremental-game-save.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showNotification("Export successful!");
  } catch (e) {
    showNotification("Export failed: " + e.message);
  }
}

// Import state from file
function importStateFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (
        parsed &&
        typeof parsed.count === "number" &&
        typeof parsed.totalClicks === "number"
      ) {
        state = {
          count: parsed.count,
          totalClicks: parsed.totalClicks,
        };
        saveState();
        render();
        showNotification("Import successful.");
      } else {
        showNotification(
          'Invalid save file format. Expected JSON with numeric "count" and "totalClicks".'
        );
      }
    } catch (e) {
      showNotification("Failed to parse save file: " + (e.message || e));
    }
  };
  reader.onerror = () => {
    showNotification("Error reading file.");
  };
  reader.readAsText(file);
}

function buyBuilding(buildingId) {
  const building = BUILDINGS.find((b) => b.id === buildingId);
  if (!building) return;
  const owned = state.buildings[buildingId] || 0;
  const cost = building.baseCost * Math.pow(1.15, owned);
  if (state.count < cost) {
    showNotification("Not enough clicks!");
    return;
  }
  state.count -= Math.floor(cost);
  state.buildings[buildingId] = owned + 1;
  saveState();
  render();
}

function getTotalCPS() {
  return BUILDINGS.reduce(
    (sum, b) => sum + (state.buildings[b.id] || 0) * b.cps,
    0
  );
}

// Mute/unmute music logic
function updateMuteButton() {
  if (bgMusic.muted) {
    muteMusicButton.innerHTML = SVG_MUTE;
    muteMusicButton.setAttribute("aria-label", "Unmute Music");
  } else {
    muteMusicButton.innerHTML = SVG_UNMUTE;
    muteMusicButton.setAttribute("aria-label", "Mute Music");
  }
}
muteMusicButton.addEventListener("click", function () {
  bgMusic.muted = !bgMusic.muted;
  updateMuteButton();
  showNotification(bgMusic.muted ? "Music muted." : "Music unmuted.");
  // Try to play if unmuted and not playing
  if (!bgMusic.muted && bgMusic.paused) {
    bgMusic.play().catch(() => {});
  }
});

// Try to play music on first user interaction (for browsers blocking autoplay)
function enableMusicPlayback() {
  if (bgMusic.paused && !bgMusic.muted) {
    bgMusic.play().catch(() => {});
  }
  window.removeEventListener("click", enableMusicPlayback);
  window.removeEventListener("keydown", enableMusicPlayback);
}
window.addEventListener("click", enableMusicPlayback);
window.addEventListener("keydown", enableMusicPlayback);

// Initialize mute button state
updateMuteButton();

// Initialize
loadState();
render();

// Click handler: preserve doubling behaviour
clickButton.addEventListener("click", function () {
  state.count++;
  state.totalClicks++;
  render();
  saveState();
});

// Passive clicks per second
setInterval(() => {
  const cps = getTotalCPS();
  if (cps > 0) {
    state.count += cps;
    state.totalClicks += cps;
    render();
    saveState();
  }
}, 1000);

// Controls
resetButton.addEventListener("click", resetState);
exportButton.addEventListener("click", exportState);
importButton.addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  importStateFromFile(file);
  importFileInput.value = "";
});

// Save on page unload
window.addEventListener("beforeunload", saveState);
