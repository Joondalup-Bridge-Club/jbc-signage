import { getPlayableSlides, selectPlaylist } from "./scheduler.js";
import { renderSlide } from "./slides.js";
import { startTicker } from "./ticker.js";
import { renderWidgets } from "./widgets.js";
import { loadCalendarEvents } from "./calendar.js";
import { hideEmergency, showEmergency } from "./emergency.js";

const REFRESH_INTERVAL = 15 * 60 * 1000;
const EMERGENCY_POLL_INTERVAL = 60 * 1000;
const stage = document.querySelector("#slide-stage");
const status = document.querySelector("#connection-state");
const emergencyOverlay = document.querySelector("#emergency-overlay");
const emergencyMessage = document.querySelector("#emergency-message");

let state;
let slideTimer;
let currentSlideId;

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
  return response.json();
}

function updateClock() {
  const now = new Date();
  document.querySelector("#current-time").textContent = now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
  document.querySelector("#current-date").textContent = now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

async function loadData(config) {
  const entries = await Promise.all((config.dataFiles ?? []).map(async (path) => [path.split("/").at(-1).replace(".json", ""), await fetchJson(path)]));
  return Object.fromEntries(entries);
}

function currentPlaylist() {
  return selectPlaylist(state.config.playlists, new Date());
}

function applyChrome(playlist) {
  const slidesOnly = Boolean(playlist?.slidesOnly);
  const hidden = ["header", "widgets", "footer"].filter((part) => slidesOnly || playlist?.hide?.[part]);
  const shell = document.querySelector(".app-shell");
  shell.dataset.hide = hidden.join(" ");
  if (slidesOnly) shell.dataset.fill = "";
  else delete shell.dataset.fill;
}

function showNextSlide() {
  if (!state) return;
  const playlist = currentPlaylist();
  applyChrome(playlist);
  const available = getPlayableSlides(state.config.slides, playlist, new Date());
  if (!available.length) {
    stage.replaceChildren(Object.assign(document.createElement("div"), { className: "empty-state", textContent: "No slides are scheduled right now." }));
    currentSlideId = undefined;
    window.clearTimeout(slideTimer);
    slideTimer = window.setTimeout(showNextSlide, 30_000);
    return;
  }
  const currentIndex = available.findIndex((slide) => slide.id === currentSlideId);
  const slide = available[(currentIndex + 1) % available.length];
  currentSlideId = slide.id;
  try {
    const element = renderSlide(slide, state.data);
    element.dataset.transition = slide.transition ?? state.config.transition ?? "rise";
    stage.replaceChildren(element);
  } catch (error) {
    console.error(error);
    const failure = document.createElement("div");
    failure.className = "empty-state";
    failure.textContent = "A club slide could not be displayed. Please check the signage configuration.";
    stage.replaceChildren(failure);
  }
  const durationSeconds = Math.max(5, Number(slide.duration) || 15);
  window.clearTimeout(slideTimer);
  slideTimer = window.setTimeout(showNextSlide, durationSeconds * 1000);
}

function refreshClockAndSchedule() {
  updateClock();
  if (!state) return;
  const playlist = currentPlaylist();
  applyChrome(playlist);
  if (!playlist?.slideIds?.includes(currentSlideId)) showNextSlide();
  renderWidgets(state.config, state.data, document.querySelector("#widget-bar"));
}

async function checkEmergency() {
  try {
    const emergency = await fetchJson("config/emergency.json");
    if (emergency.enabled) {
      window.clearTimeout(slideTimer);
      slideTimer = undefined;
      showEmergency(emergencyOverlay, emergencyMessage, emergency.message);
    } else {
      hideEmergency(emergencyOverlay);
      if (!slideTimer) showNextSlide();
    }
  } catch (error) {
    console.error("Emergency configuration check failed:", error);
    status.textContent = "Emergency config unavailable";
  }
}

async function reloadContent() {
  try {
    const [config, emergency] = await Promise.all([
      fetchJson("config/signage.json"),
      fetchJson("config/emergency.json"),
    ]);
    const [data, playlists] = await Promise.all([
      loadData(config),
      Promise.all(config.playlists.map(async (playlist) => ({ ...playlist, ...(await fetchJson(playlist.file)) }))),
    ]);
    data.events = { ...data.events, items: await loadCalendarEvents(config, data.events?.items ?? [], fetchJson) };
    state = { config: { ...config, playlists }, data };
    document.querySelector("#club-name").textContent = config.clubName ?? "Bridge Club";
    startTicker(config.ticker ?? [], document.querySelector("#ticker-track"));
    renderWidgets(config, data, document.querySelector("#widget-bar"));
    status.textContent = navigator.onLine ? "Live" : "Offline mode";
    status.classList.toggle("offline", !navigator.onLine);
    if (emergency.enabled) {
      window.clearTimeout(slideTimer);
      slideTimer = undefined;
      showEmergency(emergencyOverlay, emergencyMessage, emergency.message);
    } else {
      hideEmergency(emergencyOverlay);
      showNextSlide();
    }
  } catch (error) {
    console.error("Could not load signage content:", error);
    status.textContent = navigator.onLine ? "Content unavailable" : "Offline mode";
    status.classList.toggle("offline", !navigator.onLine);
    if (!stage.querySelector(".slide")) {
      const failure = document.createElement("div");
      failure.className = "empty-state";
      failure.textContent = "Club signage is temporarily unavailable. Check the network and configuration files.";
      stage.replaceChildren(failure);
    }
  }
}

window.addEventListener("online", () => {
  status.textContent = "Updating";
  reloadContent();
});
window.addEventListener("offline", () => {
  status.textContent = "Offline mode";
  status.classList.add("offline");
});

updateClock();
window.setInterval(refreshClockAndSchedule, 1000);
window.setInterval(checkEmergency, EMERGENCY_POLL_INTERVAL);
window.setInterval(reloadContent, REFRESH_INTERVAL);
reloadContent();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch((error) => {
    console.error("Service worker registration failed:", error);
  });
}
