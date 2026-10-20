// Small, dependency-free Markdown renderer. Builds DOM nodes with textContent only, so no raw HTML can be injected.
// Supports: # headings, paragraphs, **bold**, *italic*, `code`, [links](https://...), - / 1. lists, > quotes, --- rules.

function safeHref(url) {
  return /^(https?:|mailto:)/i.test(url) ? url : null;
}

function appendInline(parent, text) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parent.append(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      const element = document.createElement("strong");
      element.textContent = token.slice(2, -2);
      parent.append(element);
    } else if (token.startsWith("`")) {
      const element = document.createElement("code");
      element.textContent = token.slice(1, -1);
      parent.append(element);
    } else if (token.startsWith("[")) {
      const [, label, url] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      const href = safeHref(url);
      if (href) {
        const element = document.createElement("a");
        element.textContent = label;
        element.href = href;
        element.rel = "noopener noreferrer";
        parent.append(element);
      } else {
        parent.append(label);
      }
    } else {
      const element = document.createElement("em");
      element.textContent = token.slice(1, -1);
      parent.append(element);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parent.append(text.slice(last));
}

function block(tag, text) {
  const element = document.createElement(tag);
  appendInline(element, text);
  return element;
}

export function renderMarkdown(source) {
  const root = document.createDocumentFragment();
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  let paragraph = [];
  let list = null;
  let quote = [];

  const flush = () => {
    if (paragraph.length) root.append(block("p", paragraph.join(" ")));
    if (quote.length) root.append(block("blockquote", quote.join(" ")));
    paragraph = [];
    quote = [];
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    let match;
    if (!line.trim()) {
      flush();
    } else if ((match = line.match(/^(#{1,3})\s+(.*)$/))) {
      flush();
      root.append(block(`h${match[1].length}`, match[2]));
    } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flush();
      root.append(document.createElement("hr"));
    } else if ((match = line.match(/^\s*([-*]|\d+\.)\s+(.*)$/))) {
      const ordered = /\d/.test(match[1]);
      if (!list || list.tagName !== (ordered ? "OL" : "UL")) {
        flush();
        list = document.createElement(ordered ? "ol" : "ul");
        root.append(list);
      }
      list.append(block("li", match[2]));
    } else if ((match = line.match(/^>\s?(.*)$/))) {
      if (paragraph.length || list) flush();
      quote.push(match[1]);
    } else {
      if (quote.length || list) flush();
      paragraph.push(line.trim());
    }
  }
  flush();
  return root;
}
