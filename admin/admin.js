// JBC signage admin GUI. Talks only to the local helper (tools/admin-server.js); no GitHub access.

const TRANSITIONS = ["rise", "fade", "slide-left", "slide-right", "zoom", "flip", "blur", "none"];
const DATA_SOURCES = ["results", "masterpoints", "slams", "birthdays"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLIDE_TYPES = ["announcement", "event", "image", "pdf", "markdown", "upcoming", "countdown", "sponsor", "results", "leaderboard", "statistics", "video", "html"];

// Fields shown per slide type: [key, label, kind]
const TYPE_FIELDS = {
  announcement: [["kicker", "Small heading"], ["subtitle", "Subtitle"], ["description", "Description", "textarea"]],
  event: [["kicker", "Small heading"], ["subtitle", "Subtitle"], ["description", "Description", "textarea"]],
  image: [["file", "Image file", "asset:image"], ["alt", "Alt text (for accessibility)"]],
  pdf: [["file", "PDF file", "asset:pdf"], ["page", "Page number", "number"]],
  markdown: [["kicker", "Small heading"], ["markdown", "Text (Markdown)", "textarea"], ["file", "…or a .md file instead", "asset:md"]],
  upcoming: [["kicker", "Small heading"], ["description", "Description"], ["limit", "Max events", "number"], ["days", "Look ahead (days)", "number"]],
  countdown: [["eventId", "Event", "event"], ["description", "Description"]],
  sponsor: [["sponsor", "Sponsor name"], ["mark", "Short mark (2-3 letters)"], ["description", "Description"]],
  results: [["kicker", "Small heading"], ["dataSource", "Data", "source"], ["limit", "Max rows", "number"]],
  leaderboard: [["kicker", "Small heading"], ["dataSource", "Data", "source"], ["limit", "Max rows", "number"]],
  statistics: [["kicker", "Small heading"], ["dataSource", "Data", "source"], ["value", "Highlight value"], ["description", "Description"]],
  video: [["file", "Video file", "asset:video"]],
  html: [["file", "HTML file"]],
};
const ASSET_KINDS = { image: /\.(png|jpe?g|gif|webp|svg)$/i, pdf: /\.pdf$/i, md: /\.md$/i, video: /\.(mp4|webm)$/i };

const files = new Map(); // path -> { data, original }
let assets = [];
let activeTab = "playlists";
let selectedPlaylist = 0;
let editingSlide = null; // slide id being edited, or "new"

const $ = (selector) => document.querySelector(selector);
const view = $("#view");

function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") element.className = value;
    else if (key.startsWith("on")) element.addEventListener(key.slice(2), value);
    else if (key === "value") element.value = value;
    else if (key === "checked" || key === "disabled" || key === "selected") element[key] = value;
    else element.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) if (child != null && child !== false) element.append(child);
  return element;
}

// ---------- API ----------
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { "X-JBC-Admin": "1", ...(options.headers ?? {}) } });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try { message = (await response.json()).error ?? message; } catch { /* keep default */ }
    throw new Error(message);
  }
  return response;
}
const readJson = async (path) => (await request(`../api/file?path=${encodeURIComponent(path)}`)).json();
const writeJson = (path, data) => request(`../api/file?path=${encodeURIComponent(path)}`, { method: "PUT", body: JSON.stringify(data) });

// ---------- State ----------
const serialise = (data) => JSON.stringify(data);
function track(path, data) { files.set(path, { data, original: serialise(data) }); }
const get = (path) => files.get(path)?.data;
const dirtyPaths = () => [...files].filter(([, file]) => serialise(file.data) !== file.original).map(([path]) => path);

const signage = () => get("config/signage.json");
const playlists = () => signage().playlists;
const playlistData = (entry) => get(entry.file);
const events = () => get("data/events.json").items;

function notify(message, error = false) {
  const notice = $("#notice");
  notice.hidden = !message;
  notice.textContent = message ?? "";
  notice.classList.toggle("error", error);
}

function updateSaveBar() {
  const dirty = dirtyPaths();
  $("#save").disabled = !dirty.length;
  $("#revert").disabled = !dirty.length;
  const status = $("#save-status");
  status.textContent = dirty.length ? `${dirty.length} unsaved file${dirty.length === 1 ? "" : "s"}` : "All changes saved";
  status.classList.toggle("dirty", dirty.length > 0);
}

async function loadAll() {
  files.clear();
  const config = await readJson("config/signage.json");
  track("config/signage.json", config);
  const paths = new Set(["config/emergency.json", "data/events.json", ...(config.dataFiles ?? []), ...config.playlists.map((playlist) => playlist.file)]);
  await Promise.all([...paths].map(async (path) => track(path, await readJson(path))));
  assets = (await (await request("../api/assets")).json()).files;
  config.slides ??= [];
  config.ticker ??= [];
  config.widgets ??= {};
  get("data/events.json").items ??= [];
  for (const entry of config.playlists) playlistData(entry).slideIds ??= [];
  updateSaveBar();
}

async function saveAll() {
  const paths = dirtyPaths();
  try {
    for (const path of paths) {
      await writeJson(path, files.get(path).data);
      files.get(path).original = serialise(files.get(path).data);
    }
    notify("Saved to the project files. Review and commit the changes in VS Code to publish them.");
  } catch (error) {
    notify(`Save failed: ${error.message}`, true);
  }
  updateSaveBar();
}

// ---------- Helpers ----------
const slideById = (id) => signage().slides.find((slide) => slide.id === id);
const slideLabel = (slide) => slide.title ?? slide.sponsor ?? slide.id;
const today = () => new Date().toISOString().slice(0, 10);

function bind(object, key, { number = false, trim = true } = {}) {
  return (event) => {
    let value = event.target.value;
    if (trim) value = value.trim();
    if (value === "") delete object[key];
    else object[key] = number ? Number(value) : value;
    updateSaveBar();
  };
}

const assetUrl = (path) => `../${path.split("/").map(encodeURIComponent).join("/")}`;

function thumb(path, className = "thumb") {
  return h("img", { class: className, src: assetUrl(path), alt: "", loading: "lazy" });
}

function field(label, input) {
  return h("label", {}, label, input);
}

function textField(object, key, label, options = {}) {
  return field(label, h("input", { type: options.type ?? "text", value: object[key] ?? "", onchange: bind(object, key, options), oninput: bind(object, key, options) }));
}

const TYPE_STYLE = {
  announcement: ["📣", "#7c3aed"], event: ["📅", "#db2777"], image: ["🖼️", "#0891b2"], pdf: ["📄", "#dc2626"], markdown: ["📝", "#475569"],
  upcoming: ["🗓️", "#ea580c"], countdown: ["⏳", "#d97706"], sponsor: ["🤝", "#16a34a"], results: ["🏆", "#2563eb"], leaderboard: ["🥇", "#ca8a04"],
  statistics: ["📊", "#0d9488"], video: ["🎬", "#9333ea"], html: ["🌐", "#4f46e5"],
};

// Visual preview of a slide: the image itself for image slides, otherwise a coloured tile with the slide's type and title.
function slidePreview(slide) {
  if (slide.type === "image" && slide.file) return h("div", { class: "preview-box" }, thumb(slide.file, "preview-thumb"));
  const [icon, colour] = TYPE_STYLE[slide.type] ?? ["▫️", "#475569"];
  return h("div", { class: "preview-box generated", style: `--tile:${colour}` }, h("span", { class: "tile-icon", "aria-hidden": "true" }, icon), h("span", { class: "tile-title" }, slideLabel(slide)));
}

const formatDuration = (seconds) => (seconds >= 60 ? `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s` : `${seconds}s`);

// Pointer-based drag and drop (HTML5 drag events do not work on touch screens).
// Draggables carry data-drag="library|timeline"; mouse drags from anywhere on the card, touch drags from the .grip only so scrolling still works.
function enableDragging({ root, list, trash, onDrop }) {
  let drag = null;

  const insertionIndex = (y) => {
    const items = [...list.querySelectorAll(".tl-item")].filter((item) => item !== drag.source);
    const index = items.findIndex((item) => {
      const box = item.getBoundingClientRect();
      return y < box.top + box.height / 2;
    });
    return { items, index: index === -1 ? items.length : index };
  };

  const within = (element, x, y) => {
    const box = element.getBoundingClientRect();
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  };

  const cleanup = () => {
    drag?.ghost?.remove();
    drag?.marker?.remove();
    drag?.source.classList.remove("drag-source");
    root.classList.remove("is-dragging", "from-timeline");
    list.classList.remove("drop-ready");
    trash.classList.remove("hot");
    drag = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("keydown", onKey);
  };

  const start = (event) => {
    const { source } = drag;
    const box = source.getBoundingClientRect();
    drag.started = true;
    drag.offsetX = event.clientX - box.left;
    drag.offsetY = event.clientY - box.top;
    drag.ghost = source.cloneNode(true);
    drag.ghost.classList.add("drag-ghost");
    drag.ghost.style.width = `${box.width}px`;
    drag.marker = h("li", { class: "drop-marker", "aria-hidden": "true" }, "Drop here");
    document.body.append(drag.ghost);
    source.classList.add("drag-source");
    root.classList.add("is-dragging");
    root.classList.toggle("from-timeline", drag.kind === "timeline");
  };

  const onMove = (event) => {
    if (!drag) return;
    if (!drag.started) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      start(event);
    }
    event.preventDefault();
    drag.ghost.style.transform = `translate(${event.clientX - drag.offsetX}px, ${event.clientY - drag.offsetY}px) rotate(2deg)`;
    drag.overTrash = drag.kind === "timeline" && within(trash, event.clientX, event.clientY);
    drag.overList = !drag.overTrash && within(list.closest(".timeline-pane"), event.clientX, event.clientY);
    trash.classList.toggle("hot", drag.overTrash);
    list.classList.toggle("drop-ready", drag.overList);
    if (drag.overList) {
      const { items, index } = insertionIndex(event.clientY);
      drag.index = index;
      list.insertBefore(drag.marker, items[index] ?? null);
    } else {
      drag.marker.remove();
    }
    const edge = 90;
    if (event.clientY < edge) window.scrollBy(0, -16);
    else if (event.clientY > window.innerHeight - edge) window.scrollBy(0, 16);
  };

  const onUp = () => {
    if (!drag) return;
    const finished = drag;
    const moved = finished.started;
    cleanup();
    if (!moved) return;
    if (finished.overList) onDrop({ kind: finished.kind, id: finished.id, index: finished.index });
    else if (finished.kind === "timeline") onDrop({ kind: "remove", id: finished.id });
  };

  const onCancel = () => cleanup();
  const onKey = (event) => { if (event.key === "Escape") cleanup(); };

  root.addEventListener("pointerdown", (event) => {
    const source = event.target.closest("[data-drag]");
    if (!source || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (event.target.closest("button, input, select, a, label")) return;
    if (event.pointerType !== "mouse" && !event.target.closest(".grip")) return;
    drag = { source, kind: source.dataset.drag, id: source.dataset.id, startX: event.clientX, startY: event.clientY, started: false };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
  });
}

function scheduleEditor(object) {
  const schedule = object.schedule ?? {};
  const commit = () => {
    for (const key of Object.keys(schedule)) if (schedule[key] === "" || (Array.isArray(schedule[key]) && !schedule[key].length)) delete schedule[key];
    if (Object.keys(schedule).length) object.schedule = schedule;
    else delete object.schedule;
    updateSaveBar();
  };
  const input = (key, label, type) => field(label, h("input", { type, value: schedule[key] ?? "", onchange: (event) => { schedule[key] = event.target.value; commit(); } }));
  return h("fieldset", { class: "card" },
    h("legend", {}, "When to show (optional)"),
    h("div", { class: "grid" }, input("startDate", "From date", "date"), input("endDate", "Until date", "date"), input("start", "Start time", "time"), input("end", "End time", "time")),
    h("div", { class: "row" }, h("span", { class: "hint" }, "Days:"), DAYS.map((day) => h("label", { class: "check" },
      h("input", { type: "checkbox", checked: schedule.days?.includes(day), onchange: (event) => {
        const set = new Set(schedule.days ?? []);
        if (event.target.checked) set.add(day); else set.delete(day);
        schedule.days = DAYS.filter((name) => set.has(name));
        commit();
      } }), day))),
    h("p", { class: "hint" }, "Leave everything blank to show all the time. No days selected means every day."));
}

// ---------- Tabs ----------
let librarySearch = "";

function describeSchedule(entry) {
  const schedule = entry.schedule;
  if (!schedule) return "Always";
  const parts = [];
  if (schedule.startDate || schedule.endDate) parts.push([schedule.startDate, schedule.endDate].filter(Boolean).join(" → "));
  if (schedule.days?.length) parts.push(schedule.days.join(" "));
  if (schedule.start && schedule.end) parts.push(`${schedule.start}–${schedule.end}`);
  return parts.join(" · ") || "Always";
}

function libraryTile(slide, inPlaylist, addToPlaylist) {
  const tile = h("div", { class: `slide-tile${inPlaylist ? " in-playlist" : ""}`, "data-drag": inPlaylist ? null : "library", "data-id": slide.id, "data-search": `${slideLabel(slide)} ${slide.type} ${slide.id}`.toLowerCase(), title: inPlaylist ? "Already in this playlist" : "Drag into the playlist" },
    slidePreview(slide),
    h("div", { class: "tile-meta" },
      h("span", { class: "tile-name" }, slideLabel(slide)),
      h("span", { class: "tile-sub" }, `${slide.type} · ${slide.duration ?? 15}s`)),
    inPlaylist
      ? h("span", { class: "added-badge" }, "✓ Added")
      : h("button", { type: "button", class: "add-btn", "aria-label": `Add ${slideLabel(slide)} to playlist`, onclick: () => addToPlaylist(slide.id) }, "+"),
    inPlaylist ? null : h("span", { class: "grip", "aria-hidden": "true", title: "Drag to the playlist" }, "⠿"));
  tile.hidden = librarySearch !== "" && !tile.dataset.search.includes(librarySearch);
  return tile;
}

function renderPlaylists() {
  const entries = playlists();
  if (selectedPlaylist >= entries.length) selectedPlaylist = 0;
  const entry = entries[selectedPlaylist];
  const root = h("div", { class: "builder" });
  const pills = h("div", { class: "pills", role: "tablist", "aria-label": "Playlists" },
    entries.map((item, index) => h("button", { type: "button", role: "tab", class: "pill", "aria-selected": index === selectedPlaylist, onclick: () => { selectedPlaylist = index; render(); } },
      playlistData(item).name ?? item.id, h("small", {}, `priority ${item.priority ?? 0}`))),
    h("button", { type: "button", class: "pill ghost", onclick: newPlaylist }, "+ New playlist"));
  if (!entry) return h("div", {}, h("h2", {}, "Playlists"), pills);

  const data = playlistData(entry);
  const slideIds = data.slideIds;
  const changed = () => { updateSaveBar(); render(); };
  const addToPlaylist = (id, index = slideIds.length) => {
    if (slideIds.includes(id)) return;
    slideIds.splice(index, 0, id);
    changed();
  };
  const move = (from, to) => { const [id] = slideIds.splice(from, 1); slideIds.splice(to, 0, id); changed(); };

  const search = h("input", { type: "search", class: "search", placeholder: "Search slides…", "aria-label": "Search slides", value: librarySearch, oninput: (event) => {
    librarySearch = event.target.value.trim().toLowerCase();
    for (const tile of libraryList.children) tile.hidden = librarySearch !== "" && !tile.dataset.search.includes(librarySearch);
  } });
  const libraryList = h("div", { class: "library-list" }, signage().slides.map((slide) => libraryTile(slide, slideIds.includes(slide.id), addToPlaylist)));

  const total = slideIds.reduce((sum, id) => sum + (Number(slideById(id)?.duration) || 15), 0);
  const list = h("ol", { class: "timeline" }, slideIds.map((id, index) => {
    const slide = slideById(id);
    return h("li", { class: `tl-item${slide ? "" : " missing"}`, "data-drag": "timeline", "data-id": id },
      h("span", { class: "grip", "aria-hidden": "true", title: "Drag to reorder" }, "⠿"),
      h("span", { class: "tl-number" }, String(index + 1)),
      slide ? slidePreview(slide) : h("div", { class: "preview-box generated", style: "--tile:#991b1b" }, h("span", { class: "tile-icon" }, "⚠️")),
      h("div", { class: "tile-meta" },
        h("span", { class: "tile-name" }, slide ? slideLabel(slide) : `Missing slide: ${id}`),
        h("span", { class: "tile-sub" }, slide ? `${slide.type} · ${slide.duration ?? 15}s${slide.schedule ? " · scheduled" : ""}` : "This slide no longer exists")),
      h("div", { class: "tl-actions" },
        h("button", { type: "button", class: "icon-btn", "aria-label": "Move up", disabled: index === 0, onclick: () => move(index, index - 1) }, "↑"),
        h("button", { type: "button", class: "icon-btn", "aria-label": "Move down", disabled: index === slideIds.length - 1, onclick: () => move(index, index + 1) }, "↓"),
        h("button", { type: "button", class: "icon-btn danger", "aria-label": "Remove from playlist", onclick: () => { slideIds.splice(index, 1); changed(); } }, "✕")));
  }));
  const trash = h("div", { class: "trash", "aria-hidden": "true" }, "🗑️ Drop here to remove from playlist");

  const timeline = h("section", { class: "timeline-pane card" },
    h("div", { class: "pane-head" },
      h("h3", {}, "Playlist order"),
      h("span", { class: "chip" }, `${slideIds.length} slide${slideIds.length === 1 ? "" : "s"} · ${formatDuration(total)} loop`)),
    list,
    slideIds.length ? null : h("div", { class: "empty-drop" }, h("strong", {}, "Drag slides here"), h("span", {}, "or press + on a slide in the library")),
    trash);

  const settings = h("details", { class: "card settings" },
    h("summary", {}, h("span", {}, "Playlist settings"), h("span", { class: "chip" }, `${describeSchedule(entry)} · priority ${entry.priority ?? 0}`)),
    h("div", { class: "grid" },
      textField(data, "name", "Name"),
      textField(entry, "priority", "Priority (higher wins)", { type: "number", number: true })),
    scheduleEditor(entry),
    h("label", { class: "check" }, h("input", { type: "checkbox", checked: Boolean(data.slidesOnly), onchange: (event) => {
      if (event.target.checked) data.slidesOnly = true; else delete data.slidesOnly;
      updateSaveBar();
    } }), "Slides only: fill the whole screen (hides header, widgets and footer)"),
    h("div", { class: "hide-options" }, h("span", {}, "Hide on the display while this playlist is showing"),
      h("div", { class: "checks" }, [["header", "Header"], ["widgets", "Widgets"], ["footer", "Footer"]].map(([key, label]) =>
        h("label", { class: "check" }, h("input", { type: "checkbox", checked: Boolean(data.hide?.[key]), onchange: (event) => {
          data.hide = { ...data.hide, [key]: event.target.checked };
          if (!Object.values(data.hide).some(Boolean)) delete data.hide;
          updateSaveBar();
        } }), label)))),
    h("p", { class: "hint" }, `File: ${entry.file}. The matching playlist with the highest priority is shown.`),
    h("button", { type: "button", class: "danger", disabled: entries.length < 2, onclick: () => {
      if (!confirm(`Remove playlist "${data.name ?? entry.id}" from the schedule? Its file stays on disk.`)) return;
      entries.splice(selectedPlaylist, 1);
      selectedPlaylist = 0;
      changed();
    } }, "Remove this playlist"));

  root.append(
    h("div", { class: "page-head" }, h("h2", {}, "Playlists"), pills),
    h("div", { class: "builder-grid" },
      h("aside", { class: "library card" },
        h("div", { class: "pane-head" }, h("h3", {}, "Slide library"), h("span", { class: "chip" }, `${signage().slides.length} slides`)),
        search,
        libraryList),
      h("div", { class: "right-col" }, settings, timeline)));

  enableDragging({
    root,
    list,
    trash,
    onDrop: ({ kind, id, index }) => {
      if (kind === "remove") {
        const at = slideIds.indexOf(id);
        if (at !== -1) slideIds.splice(at, 1);
        return changed();
      }
      if (kind === "library") return addToPlaylist(id, index);
      const from = slideIds.indexOf(id);
      if (from === -1) return;
      slideIds.splice(from, 1);
      slideIds.splice(index, 0, id);
      changed();
    },
  });
  return root;
}

function newPlaylist() {
  const name = prompt("Name for the new playlist (letters and numbers):");
  const id = name?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!id) return;
  if (playlists().some((entry) => entry.id === id)) return notify(`A playlist called "${id}" already exists.`, true);
  const entry = { id, file: `config/playlists/${id}.json`, priority: 5 };
  track(entry.file, { name: name.trim(), slideIds: [] });
  files.get(entry.file).original = "";
  playlists().push(entry);
  selectedPlaylist = playlists().length - 1;
  updateSaveBar();
  render();
}

function renderSlides() {
  const root = h("div", {}, h("h2", {}, "Slides"));
  if (editingSlide) return renderSlideForm(root);
  const slides = signage().slides;
  root.append(
    h("div", { class: "row card toolbar" },
      h("button", { type: "button", class: "primary", onclick: () => { editingSlide = "new"; render(); } }, "+ New slide"),
      h("label", { class: "upload" }, h("span", {}, "⬆ Upload images, PDFs, Markdown or videos"),
        h("input", { type: "file", multiple: true, accept: ".png,.jpg,.jpeg,.gif,.webp,.svg,.pdf,.md,.mp4,.webm", onchange: uploadAssets })),
      h("span", { class: "hint" }, "A slide is created for each uploaded file. Add slides to playlists on the Playlists tab.")),
    h("div", { class: "slide-grid" }, slides.map((slide) => {
      const usedIn = playlists().filter((entry) => playlistData(entry).slideIds.includes(slide.id)).map((entry) => playlistData(entry).name ?? entry.id);
      return h("article", { class: "slide-card" },
        slidePreview(slide),
        h("div", { class: "tile-meta" },
          h("span", { class: "tile-name" }, slideLabel(slide)),
          h("span", { class: "tile-sub" }, `${slide.type} · ${slide.duration ?? 15}s`),
          h("span", { class: "tile-sub" }, usedIn.length ? `In: ${usedIn.join(", ")}` : "Not in any playlist")),
        h("div", { class: "card-actions" },
          h("button", { type: "button", onclick: () => { editingSlide = slide.id; render(); } }, "Edit"),
          h("button", { type: "button", onclick: () => duplicateSlide(slide) }, "Duplicate"),
          h("button", { type: "button", class: "danger", onclick: () => deleteSlide(slide) }, "Delete")));
    })));
  return root;
}

const SLIDE_TYPE_BY_EXTENSION = { png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image", pdf: "pdf", md: "markdown", mp4: "video", webm: "video" };

function slideForUpload(path) {
  const name = path.split("/").pop();
  const base = name.replace(/\.[^.]+$/, "");
  const type = SLIDE_TYPE_BY_EXTENSION[name.split(".").pop().toLowerCase()];
  const title = base.replace(/[-_]+/g, " ").trim();
  let id = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "slide";
  for (let n = 2; slideById(id); n++) id = `${id.replace(/-\d+$/, "")}-${n}`;
  const slide = { id, type, title, file: path, duration: 15 };
  if (type === "image") slide.alt = title;
  return slide;
}

async function uploadAssets(event) {
  const input = event.target;
  const chosen = [...input.files];
  if (!chosen.length) return;
  const added = [];
  const failed = [];
  for (const file of chosen) {
    try {
      const { path } = await (await request(`../api/upload?name=${encodeURIComponent(file.name)}`, { method: "POST", body: file })).json();
      if (!signage().slides.some((slide) => slide.file === path)) {
        const slide = slideForUpload(path);
        signage().slides.push(slide);
        added.push(slide);
      }
    } catch (error) {
      failed.push(`${file.name} (${error.message})`);
    }
  }
  input.value = "";
  assets = (await (await request("../api/assets")).json()).files;
  updateSaveBar();
  render();
  const parts = [];
  if (added.length) parts.push(`Uploaded and created ${added.length} slide${added.length === 1 ? "" : "s"}: ${added.map(slideLabel).join(", ")}. Add them to a playlist, then press Save changes.`);
  if (failed.length) parts.push(`Failed: ${failed.join("; ")}.`);
  notify(parts.join(" ") || "Files uploaded; slides for them already exist.", failed.length > 0);
}

function duplicateSlide(slide) {
  let id = `${slide.id}-copy`;
  for (let n = 2; slideById(id); n++) id = `${slide.id}-copy${n}`;
  const slides = signage().slides;
  slides.splice(slides.indexOf(slide) + 1, 0, { ...structuredClone(slide), id });
  updateSaveBar();
  render();
}

function deleteSlide(slide) {
  if (!confirm(`Delete slide "${slideLabel(slide)}"? It will also be removed from all playlists.`)) return;
  signage().slides.splice(signage().slides.indexOf(slide), 1);
  for (const entry of playlists()) playlistData(entry).slideIds = playlistData(entry).slideIds.filter((id) => id !== slide.id);
  updateSaveBar();
  render();
}

function renderSlideForm(root) {
  const isNew = editingSlide === "new";
  const original = isNew ? null : slideById(editingSlide);
  if (!isNew && !original) { editingSlide = null; return renderSlides(); }
  const draft = structuredClone(original ?? { id: "", type: "announcement", title: "", duration: 15 });
  const typeHolder = h("div", {});
  const errorBox = h("p", { class: "hint", role: "alert" });

  const drawType = () => {
    const fields = TYPE_FIELDS[draft.type] ?? [];
    typeHolder.replaceChildren(h("div", { class: "grid" }, fields.map(([key, label, kind = "text"]) => {
      if (kind.startsWith("asset")) {
        const pattern = ASSET_KINDS[kind.split(":")[1]];
        const options = assets.filter((asset) => !pattern || pattern.test(asset));
        if (draft[key] && !options.includes(draft[key])) options.unshift(draft[key]);
        const preview = h("div", { class: "preview" });
        const showPreview = () => preview.replaceChildren(...(draft[key] && kind === "asset:image" ? [thumb(draft[key], "preview-img")] : []));
        showPreview();
        return h("div", {}, field(label, h("select", { onchange: (event) => { event.target.value ? draft[key] = event.target.value : delete draft[key]; showPreview(); } },
          h("option", { value: "" }, "— choose —"), options.map((asset) => h("option", { value: asset, selected: asset === draft[key] }, asset.replace(/^slides\//, ""))))), preview);
      }
      if (kind === "source") return field(label, h("select", { onchange: (event) => { draft[key] = event.target.value; } }, DATA_SOURCES.map((name) => h("option", { value: name, selected: name === draft[key] }, name))));
      if (kind === "event") return field(label, h("select", { onchange: (event) => { event.target.value ? draft[key] = event.target.value : delete draft[key]; } },
        h("option", { value: "" }, "Next upcoming event"), events().map((item) => h("option", { value: item.id, selected: item.id === draft[key] }, item.title))));
      if (kind === "textarea") return field(label, h("textarea", { value: draft[key] ?? "", oninput: bind(draft, key, { trim: false }) }));
      return textField(draft, key, label, { type: kind === "number" ? "number" : "text", number: kind === "number" });
    })));
  };
  drawType();

  const save = () => {
    draft.id = (draft.id ?? "").trim();
    if (!/^[A-Za-z0-9_-]+$/.test(draft.id)) { errorBox.textContent = "ID may only contain letters, numbers, - and _."; return; }
    const clash = signage().slides.find((slide) => slide.id === draft.id && slide !== original);
    if (clash) { errorBox.textContent = `Another slide already uses the ID "${draft.id}".`; return; }
    if (!draft.duration) draft.duration = 15;
    if (!isNew) signage().slides[signage().slides.indexOf(original)] = draft;
    else signage().slides.push(draft);
    if (!isNew && original.id !== draft.id) for (const entry of playlists()) playlistData(entry).slideIds = playlistData(entry).slideIds.map((id) => (id === original.id ? draft.id : id));
    editingSlide = null;
    updateSaveBar();
    render();
  };

  root.append(
    h("div", { class: "card" },
      h("h3", {}, isNew ? "New slide" : `Edit slide: ${slideLabel(original)}`),
      h("div", { class: "grid" },
        textField(draft, "id", "ID (unique, no spaces)"),
        field("Type", h("select", { onchange: (event) => { draft.type = event.target.value; drawType(); } }, SLIDE_TYPES.map((type) => h("option", { value: type, selected: type === draft.type }, type)))),
        textField(draft, "title", "Title"),
        textField(draft, "duration", "Seconds on screen", { type: "number", number: true }),
        field("Transition", h("select", { onchange: (event) => { event.target.value ? draft.transition = event.target.value : delete draft.transition; } },
          h("option", { value: "" }, "Default"), TRANSITIONS.map((name) => h("option", { value: name, selected: name === draft.transition }, name))))),
      typeHolder,
      h("p", { class: "hint" }, "Markdown: # Heading, **bold**, *italic*, - bullets, [link](https://…).")),
    scheduleEditor(draft),
    errorBox,
    h("div", { class: "row" },
      h("button", { type: "button", class: "primary", onclick: save }, "Apply"),
      h("button", { type: "button", onclick: () => { editingSlide = null; render(); } }, "Cancel")),
    h("p", { class: "hint" }, "“Apply” updates the draft; use “Save changes” at the top to write it to disk."));
  return root;
}

function offsetSuffix() {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

function renderEvents() {
  const config = signage();
  const items = events();
  const root = h("div", {}, h("h2", {}, "Events"));
  config.calendar ??= {};
  root.append(
    h("div", { class: "card" },
      h("h3", {}, "Club calendar feed (optional)"),
      textField(config.calendar, "feedUrl", "JSON feed URL"),
      h("p", { class: "hint" }, "A JSON list (or { \"items\": [...] }) of events with title and date. Feed events are merged with the events below. If the feed is unreachable the local events are used.")),
    h("div", { class: "row card" },
      h("button", { type: "button", class: "primary", onclick: () => {
        items.push({ id: `event-${Date.now().toString(36)}`, title: "New event", date: `${today()}T13:00:00${offsetSuffix()}` });
        updateSaveBar();
        render();
      } }, "+ Add event"),
      h("span", { class: "hint" }, "These appear on the Upcoming events slide, countdowns and widgets.")),
    h("div", {}, items.map((item, index) => h("div", { class: "card" },
      h("div", { class: "grid" },
        textField(item, "title", "Title"),
        field("Date and time", h("input", { type: "datetime-local", value: String(item.date ?? "").slice(0, 16), onchange: (event) => {
          if (event.target.value) item.date = `${event.target.value}:00${/[+-]\d\d:\d\d$|Z$/.test(item.date ?? "") ? item.date.slice(-6) : offsetSuffix()}`;
          updateSaveBar();
        } })),
        textField(item, "description", "Description"),
        field("Red point event", h("input", { type: "checkbox", checked: item.redPoint, onchange: (event) => { if (event.target.checked) item.redPoint = true; else delete item.redPoint; updateSaveBar(); } }))),
      h("div", { class: "row", style: "margin-top:8px" },
        h("button", { type: "button", class: "danger", onclick: () => { items.splice(index, 1); updateSaveBar(); render(); } }, "Delete"))))));
  if (!items.length) root.append(h("p", { class: "hint" }, "No events yet."));
  root.append(h("div", { class: "card" }, h("button", { type: "button", onclick: () => {
    items.sort((a, b) => new Date(a.date) - new Date(b.date));
    get("data/events.json").updated = today();
    updateSaveBar();
    render();
  } }, "Sort by date")));
  return root;
}

let selectedData = "data/results.json";
function renderClubData() {
  const dataPaths = [...files.keys()].filter((path) => path.startsWith("data/") && path !== "data/events.json");
  if (!dataPaths.includes(selectedData)) selectedData = dataPaths[0];
  const data = get(selectedData);
  const root = h("div", {}, h("h2", {}, "Club data"));
  root.append(h("div", { class: "row card" },
    h("select", { "aria-label": "Data file", onchange: (event) => { selectedData = event.target.value; render(); } }, dataPaths.map((path) => h("option", { value: path, selected: path === selectedData }, path.replace(/^data\//, "").replace(".json", "")))),
    h("p", { class: "hint" }, "Results, masterpoints and slams are also produced by tools/generate-data.js, which overwrites manual edits when it is run.")));
  if (!data) return root;
  data.items ??= [];
  const columns = [...new Set(data.items.flatMap((row) => Object.keys(row)))];
  if (!columns.length) columns.push("name", "value");
  const touch = () => { data.updated = today(); updateSaveBar(); };
  root.append(h("div", { class: "card table-wrap" },
    h("table", {},
      h("thead", {}, h("tr", {}, columns.map((column) => h("th", {}, column)), h("th", {}))),
      h("tbody", {}, data.items.map((row, index) => h("tr", {}, columns.map((column) => h("td", {},
        h("input", { value: row[column] ?? "", "aria-label": column, oninput: (event) => {
          const value = event.target.value;
          if (value === "") delete row[column];
          else row[column] = typeof row[column] === "number" && value.trim() !== "" && !Number.isNaN(Number(value)) ? Number(value) : value;
          touch();
        } }))),
        h("td", {}, h("button", { type: "button", class: "icon-btn danger", "aria-label": "Delete row", onclick: () => { data.items.splice(index, 1); touch(); render(); } }, "✕")))))),
    h("div", { class: "row", style: "margin-top:12px" },
      h("button", { type: "button", class: "primary", onclick: () => { data.items.push(columns.includes("rank") ? { rank: data.items.length + 1 } : {}); touch(); render(); } }, "+ Add row"),
      h("button", { type: "button", onclick: () => {
        const name = prompt("New column name:")?.trim();
        if (!name || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) return;
        (data.items[0] ?? (data.items[0] = {}))[name] = "";
        touch();
        render();
      } }, "+ Add column"))));
  return root;
}

function renderSettings() {
  const config = signage();
  const emergency = get("config/emergency.json");
  const widgetLabels = { countdown: "Next event countdown", weather: "Weather", birthdays: "Birthdays today", todaysSessions: "Today at the club", nextRedPoint: "Next red point" };
  return h("div", {},
    h("h2", {}, "Settings"),
    h("div", { class: "card" },
      h("div", { class: "grid" },
        textField(config, "clubName", "Club name"),
        field("Default transition", h("select", { onchange: (event) => { event.target.value ? config.transition = event.target.value : delete config.transition; updateSaveBar(); } },
          h("option", { value: "" }, "rise (default)"), TRANSITIONS.map((name) => h("option", { value: name, selected: name === config.transition }, name))))),
      field("Ticker messages (one per line)", h("textarea", { value: config.ticker.join("\n"), oninput: (event) => { config.ticker = event.target.value.split("\n").map((line) => line.trim()).filter(Boolean); updateSaveBar(); } }))),
    h("div", { class: "card" },
      h("h3", {}, "Widgets"),
      Object.entries(widgetLabels).map(([key, label]) => h("label", { class: "check" },
        h("input", { type: "checkbox", checked: config.widgets[key], onchange: (event) => { config.widgets[key] = event.target.checked; updateSaveBar(); } }), label))),
    h("div", { class: "card" },
      h("h3", {}, "Emergency message"),
      h("label", { class: "check" }, h("input", { type: "checkbox", checked: emergency.enabled, onchange: (event) => { emergency.enabled = event.target.checked; updateSaveBar(); } }), "Show emergency message on the display"),
      textField(emergency, "message", "Message")));
}

const TABS = { playlists: ["Playlists", renderPlaylists], slides: ["Slides", renderSlides], events: ["Events", renderEvents], data: ["Club data", renderClubData], settings: ["Settings", renderSettings] };

function render() {
  const tabs = $("#tabs");
  tabs.replaceChildren(...Object.entries(TABS).map(([key, [label]]) => h("button", { type: "button", role: "tab", "aria-selected": key === activeTab, onclick: () => { activeTab = key; editingSlide = null; render(); } }, label)));
  view.replaceChildren(TABS[activeTab][1]());
}

$("#save").addEventListener("click", saveAll);
$("#revert").addEventListener("click", async () => {
  if (!confirm("Discard all unsaved changes?")) return;
  await loadAll();
  notify(null);
  render();
});
window.addEventListener("beforeunload", (event) => { if (dirtyPaths().length) event.preventDefault(); });

try {
  await loadAll();
  render();
} catch (error) {
  $("#save-status").textContent = "Not connected";
  notify("The admin helper isn't running. In the project folder run:  node tools/admin-server.js  then open http://localhost:8787/admin/", true);
  console.error(error);
}
