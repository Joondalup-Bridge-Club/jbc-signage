const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isWithinDate(value, start, end) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (start && date < new Date(`${start}T00:00:00`)) return false;
  if (end && date > new Date(`${end}T23:59:59`)) return false;
  return true;
}

function isWithinTimeRange(now, start, end) {
  if (!start || !end) return true;
  const current = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const from = startHour * 60 + startMinute;
  const to = endHour * 60 + endMinute;
  return from <= to ? current >= from && current <= to : current >= from || current <= to;
}

export function isScheduleActive(schedule, now = new Date()) {
  if (!schedule) return true;
  if (schedule.startDate || schedule.endDate) {
    if (!isWithinDate(now, schedule.startDate, schedule.endDate)) return false;
  }
  if (schedule.expiresAt && now > new Date(schedule.expiresAt)) return false;
  if (schedule.days?.length && !schedule.days.includes(DAYS[now.getDay()])) return false;
  return isWithinTimeRange(now, schedule.start, schedule.end);
}

export function selectPlaylist(playlists, now = new Date()) {
  return playlists
    .filter((playlist) => isScheduleActive(playlist.schedule, now))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0] ?? null;
}

export function getPlayableSlides(slides, playlist, now = new Date()) {
  const ids = new Set(playlist?.slideIds ?? []);
  return slides.filter((slide) => ids.has(slide.id) && isScheduleActive(slide.schedule, now));
}
