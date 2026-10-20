function addWidget(parent, label, value) {
  if (!value) return;
  const widget = document.createElement("div");
  widget.className = "widget";
  const heading = document.createElement("span");
  heading.className = "widget-label";
  heading.textContent = label;
  const text = document.createElement("span");
  text.className = "widget-value";
  text.textContent = value;
  widget.append(heading, text);
  parent.append(widget);
}

function localDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function renderWidgets(config, data, parent, now = new Date()) {
  parent.replaceChildren();
  const enabled = config.widgets ?? {};
  const nextEvent = data.events?.items?.find((event) => new Date(event.date) >= now);
  if (enabled.countdown && nextEvent) {
    const days = Math.ceil((new Date(nextEvent.date).getTime() - now.getTime()) / 86_400_000);
    addWidget(parent, "Next event", `${nextEvent.title} · ${days === 0 ? "Today" : `${days} days`}`);
  }
  if (enabled.weather) addWidget(parent, "Weather", config.weatherPlaceholder ?? "Local forecast unavailable");
  if (enabled.birthdays) {
    const today = localDateString(now).slice(5);
    const birthdays = (data.birthdays?.items ?? []).filter((person) => person.date?.slice(5) === today);
    if (birthdays.length) addWidget(parent, "Birthday wishes", birthdays.map((person) => person.name).join(", "));
  }
  if (enabled.todaysSessions) {
    const today = localDateString(now);
    const todaySessions = (data.events?.items ?? []).filter((event) => event.date?.slice(0, 10) === today);
    if (todaySessions.length) addWidget(parent, "Today at the club", todaySessions.map((event) => event.title).join(", "));
  }
  if (enabled.nextRedPoint) {
    const redPoint = (data.events?.items ?? []).find((event) => event.redPoint && new Date(event.date) >= now);
    if (redPoint) addWidget(parent, "Next red point", `${redPoint.title} · ${new Date(redPoint.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`);
  }
}
