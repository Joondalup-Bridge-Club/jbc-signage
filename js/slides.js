import { renderMarkdown } from "./markdown.js";
import { upcomingEvents } from "./calendar.js";

const ELEMENT = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
};

function safeLocalPath(path) {
  return typeof path === "string" && !path.startsWith("/") && !path.includes("..") && !/^[a-z]+:/i.test(path);
}

function makeTextSlide(slide, center = false) {
  const section = ELEMENT("section", `slide text-slide${center ? " center" : ""}`);
  if (slide.kicker) section.append(ELEMENT("p", "kicker", slide.kicker));
  section.append(ELEMENT("h2", "", slide.title ?? "Club announcement"));
  if (slide.subtitle) section.append(ELEMENT("p", "subtitle", slide.subtitle));
  if (slide.description) section.append(ELEMENT("p", "description", slide.description));
  return section;
}

function makeDataSlide(slide, rows, titleOverride) {
  const section = ELEMENT("section", "slide data-layout");
  const heading = ELEMENT("div");
  heading.append(ELEMENT("p", "kicker", slide.kicker ?? "Club information"));
  heading.append(ELEMENT("h2", "", titleOverride ?? slide.title ?? "Club standings"));
  if (slide.description) heading.append(ELEMENT("p", "description", slide.description));
  section.append(heading);
  const list = ELEMENT("div", "data-list");
  (Array.isArray(rows) ? rows : []).slice(0, slide.limit ?? 6).forEach((row, index) => {
    const line = ELEMENT("div", "data-row");
    line.append(ELEMENT("span", "rank", String(row.rank ?? index + 1).padStart(2, "0")));
    line.append(ELEMENT("span", "", row.name ?? row.pair ?? row.title ?? "Club member"));
    line.append(ELEMENT("span", "value", row.value ?? row.points ?? row.score ?? ""));
    list.append(line);
  });
  if (!list.childElementCount) list.append(ELEMENT("p", "description", "Club information will be updated soon."));
  section.append(list);
  return section;
}

function renderImage(slide) {
  if (!safeLocalPath(slide.file)) throw new Error(`Slide "${slide.id}" has an invalid image path.`);
  const section = ELEMENT("section", "slide");
  const image = ELEMENT("img", "slide-image");
  image.src = slide.file;
  image.alt = slide.alt ?? slide.title ?? "Club promotional slide";
  image.loading = "eager";
  image.addEventListener("error", () => {
    section.replaceChildren(makeTextSlide({ title: slide.title ?? "Image unavailable", description: `Check the file path: ${slide.file}` }));
  }, { once: true });
  section.append(image);
  return section;
}

function renderVideo(slide) {
  if (!safeLocalPath(slide.file)) throw new Error(`Slide "${slide.id}" has an invalid video path.`);
  const video = ELEMENT("video", "slide-video");
  video.src = slide.file;
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.controls = false;
  return video;
}

function renderHtml(slide) {
  if (!safeLocalPath(slide.file)) throw new Error(`Slide "${slide.id}" has an invalid HTML path.`);
  const frame = ELEMENT("iframe", "html-frame");
  frame.src = slide.file;
  frame.title = slide.title ?? "Club content";
  frame.setAttribute("sandbox", "allow-scripts");
  return frame;
}

function renderPdf(slide) {
  if (!safeLocalPath(slide.file)) throw new Error(`Slide "${slide.id}" has an invalid PDF path.`);
  const frame = ELEMENT("iframe", "pdf-frame");
  const page = Number(slide.page) > 0 ? `&page=${Math.floor(Number(slide.page))}` : "";
  frame.src = `${slide.file}#toolbar=0&navpanes=0&scrollbar=0&view=FitH${page}`;
  frame.title = slide.title ?? "Club document";
  return frame;
}

function renderMarkdownSlide(slide) {
  const section = ELEMENT("section", "slide text-slide markdown-slide");
  if (slide.kicker) section.append(ELEMENT("p", "kicker", slide.kicker));
  if (slide.title) section.append(ELEMENT("h2", "", slide.title));
  const body = ELEMENT("div", "markdown-body");
  section.append(body);
  if (slide.markdown != null) {
    body.append(renderMarkdown(slide.markdown));
  } else if (safeLocalPath(slide.file)) {
    fetch(slide.file, { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${slide.file} (${response.status}).`);
        return response.text();
      })
      .then((text) => body.replaceChildren(renderMarkdown(text)))
      .catch((error) => {
        console.error(error);
        body.textContent = "This slide's text is unavailable.";
      });
  } else {
    throw new Error(`Slide "${slide.id}" needs markdown text or a valid .md file path.`);
  }
  return section;
}

function renderUpcoming(slide, events) {
  const section = ELEMENT("section", "slide data-layout upcoming-layout");
  const heading = ELEMENT("div");
  heading.append(ELEMENT("p", "kicker", slide.kicker ?? "Coming up"));
  heading.append(ELEMENT("h2", "", slide.title ?? "Upcoming events"));
  if (slide.description) heading.append(ELEMENT("p", "description", slide.description));
  section.append(heading);
  const list = ELEMENT("div", "data-list");
  for (const event of upcomingEvents(events, new Date(), slide.limit ?? 5, slide.days ?? 60)) {
    const when = new Date(event.date);
    const hasTime = /T\d{2}:\d{2}/.test(event.date);
    const row = ELEMENT("div", "data-row event-row");
    row.append(ELEMENT("span", "rank", when.toLocaleDateString("en-AU", { day: "numeric", month: "short" })));
    const name = ELEMENT("span", "", event.title);
    if (event.redPoint) name.append(ELEMENT("span", "red-point", " ● Red point"));
    row.append(name);
    row.append(ELEMENT("span", "value", [when.toLocaleDateString("en-AU", { weekday: "short" }), hasTime ? when.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }) : ""].filter(Boolean).join(" ")));
    list.append(row);
  }
  if (!list.childElementCount) list.append(ELEMENT("p", "description", "No events are scheduled right now. Check back soon."));
  section.append(list);
  return section;
}

function renderSponsor(slide) {
  const section = ELEMENT("section", "slide sponsor-layout");
  section.append(ELEMENT("div", "sponsor-mark", slide.mark ?? slide.sponsor?.slice(0, 2) ?? "JBC"));
  const text = ELEMENT("div", "text-slide");
  text.append(ELEMENT("p", "kicker", "Proudly supported by"));
  text.append(ELEMENT("h2", "", slide.sponsor ?? slide.title ?? "Our club sponsors"));
  if (slide.description) text.append(ELEMENT("p", "description", slide.description));
  section.append(text);
  return section;
}

function renderStatistics(slide, rows) {
  const section = ELEMENT("section", "slide data-layout");
  const text = ELEMENT("div");
  text.append(ELEMENT("p", "kicker", slide.kicker ?? "Club statistics"));
  text.append(ELEMENT("h2", "", slide.title ?? "Around the club"));
  const lead = ELEMENT("div");
  lead.append(ELEMENT("div", "highlight-number", slide.value ?? rows?.[0]?.value ?? "—"));
  lead.append(ELEMENT("p", "description", slide.description ?? rows?.[0]?.name ?? ""));
  section.append(text, lead);
  return section;
}

function renderCountdown(slide, events) {
  const target = events?.find((event) => event.id === slide.eventId) ?? events?.[0];
  if (!target?.date) return makeTextSlide({ ...slide, description: slide.description ?? "Check the club calendar for upcoming events." });
  const remaining = Math.max(0, Math.ceil((new Date(target.date).getTime() - Date.now()) / 86_400_000));
  const section = makeTextSlide({ ...slide, title: target.title, description: target.description ?? slide.description });
  section.append(ELEMENT("div", "highlight-number", remaining === 0 ? "Today" : String(remaining)));
  if (remaining > 0) section.append(ELEMENT("p", "subtitle", remaining === 1 ? "day to go" : "days to go"));
  return section;
}

export function renderSlide(slide, data = {}) {
  const rows = slide.dataSource ? data[slide.dataSource]?.[slide.dataKey ?? "items"] : [];
  switch (slide.type) {
    case "image": return renderImage(slide);
    case "video": return renderVideo(slide);
    case "html": return renderHtml(slide);
    case "announcement": return makeTextSlide(slide, true);
    case "event": return makeTextSlide({ ...slide, kicker: slide.kicker ?? "Upcoming event" });
    case "markdown": return renderMarkdownSlide(slide);
    case "pdf": return renderPdf(slide);
    case "upcoming": return renderUpcoming(slide, data.events?.items ?? []);
    case "sponsor": return renderSponsor(slide);
    case "leaderboard": return makeDataSlide(slide, rows);
    case "results": return makeDataSlide(slide, rows, slide.title ?? "Recent results");
    case "statistics": return renderStatistics(slide, rows);
    case "countdown": return renderCountdown(slide, data.events?.items ?? []);
    default: throw new Error(`Unsupported slide type "${slide.type}" on slide "${slide.id}".`);
  }
}
