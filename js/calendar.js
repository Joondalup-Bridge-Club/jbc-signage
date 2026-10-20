// Club calendar: merges data/events.json with an optional JSON feed (config.calendar.feedUrl).
// Accepted feed shapes: an array, or { items: [...] } / { events: [...] }.
// Each entry needs a title and a date (also accepts start / startDate / start_time).

function normalise(entry, index) {
  const date = entry?.date ?? entry?.start ?? entry?.startDate ?? entry?.start_time;
  const title = entry?.title ?? entry?.name ?? entry?.summary;
  if (!title || !date || Number.isNaN(new Date(date).getTime())) return null;
  return {
    id: String(entry.id ?? `feed-${index}`),
    title: String(title),
    date: String(date),
    description: entry.description ? String(entry.description) : undefined,
    location: entry.location ? String(entry.location) : undefined,
    redPoint: Boolean(entry.redPoint),
  };
}

export function parseFeed(payload) {
  const list = Array.isArray(payload) ? payload : payload?.items ?? payload?.events ?? [];
  return list.map(normalise).filter(Boolean);
}

export async function loadCalendarEvents(config, localEvents = [], fetchJson) {
  const merged = new Map(localEvents.map((event) => [event.id ?? `${event.title}-${event.date}`, event]));
  const url = config.calendar?.feedUrl;
  if (url) {
    try {
      for (const event of parseFeed(await fetchJson(url))) merged.set(event.id, event);
    } catch (error) {
      console.warn("Calendar feed unavailable; using local events only:", error);
    }
  }
  return [...merged.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function upcomingEvents(events, now = new Date(), limit = 5, days = 60) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = new Date(startOfToday.getTime() + days * 86_400_000);
  return events
    .filter((event) => {
      const when = new Date(event.date);
      return when >= startOfToday && when <= horizon;
    })
    .slice(0, limit);
}
