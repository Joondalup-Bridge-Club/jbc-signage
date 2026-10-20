export function startTicker(items, element) {
  const messages = items.filter((item) => typeof item === "string" && item.trim());
  if (!messages.length) return;
  const content = [...messages, ...messages];
  element.replaceChildren(...content.map((message) => {
    const item = document.createElement("span");
    item.className = "ticker-item";
    item.textContent = message;
    return item;
  }));
}
