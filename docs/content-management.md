# Content management

Content is stored in JSON. The static player does not connect to a database.

## Add a Canva slide

Export a landscape PNG and copy it into `slides/`. Add a slide entry to `config/signage.json`, then add its ID to one or more files in `config/playlists/`. The player refreshes content every 15 minutes; after committing and pushing, the display will pick up the change on its next refresh.

```json
{ "id": "autumn-lunch", "type": "image", "file": "slides/autumn-lunch.png", "title": "Autumn lunch", "duration": 15 }
```

Static hosting cannot reliably discover arbitrary files in a folder. Therefore a new image needs a JSON entry (no JavaScript changes); simply copying a file cannot make a static host discover it. Keep slide paths relative, and do not use `..` or absolute URLs. The four included SVGs are working sample slides and can be replaced with Canva PNGs by updating their `file` values.

## Slide fields

All slides need a unique `id`, supported `type`, and optional `duration` (seconds, defaults to 15). The player supports `image`, `video`, `html`, `pdf`, `markdown`, `upcoming`, `announcement`, `event`, `sponsor`, `leaderboard`, `results`, `statistics`, and `countdown`.

Data-driven slides use `dataSource` to select a JSON data file without its `.json` suffix. The optional `dataKey` defaults to `items`; `limit` limits visible rows. Text in JSON is rendered as text, not executable HTML.

## Markdown, PDF and upcoming-events slides

```json
{ "id": "rules", "type": "markdown", "title": "Reminders", "markdown": "- Phones on **silent**\n- Visitors *welcome*" }
{ "id": "rules-file", "type": "markdown", "file": "slides/rules.md" }
{ "id": "newsletter", "type": "pdf", "file": "slides/newsletter.pdf", "page": 1 }
{ "id": "whats-on", "type": "upcoming", "title": "Upcoming events", "limit": 5, "days": 60 }
```

Markdown supports `#` headings, `**bold**`, `*italic*`, `-`/`1.` lists, `>` quotes, `---` rules and `https://` links; raw HTML is never rendered. PDFs show one page in the browser's built-in viewer (set `page` to choose which). The `upcoming` slide is generated automatically from `data/events.json` merged with the calendar feed.

## Calendar feed

Set `"calendar": { "feedUrl": "https://example.org/events.json" }` in `config/signage.json`. The feed may be an array or `{ "items": [...] }`; each entry needs a `title` and a `date` (ISO 8601; `start` is also accepted) and may have `id`, `description`, `location` and `redPoint`. Feed events are merged with `data/events.json` and drive the countdown, widgets and upcoming slide. The feed server must allow cross-origin requests (CORS); if it is unreachable only the local events are used. Feeds are not cached by the service worker.

## Transitions

Set `"transition"` in `config/signage.json` for the default, or on an individual slide. Options: `rise` (default), `fade`, `slide-left`, `slide-right`, `zoom`, `flip`, `blur`, `none`. Reduced-motion preferences are respected.

## Admin GUI

Run `node tools/admin-server.js` and open <http://localhost:8787/admin/> to edit all of the above visually. See the README for the security model.

## Scheduling and playlists

Each playlist has a `schedule`, `priority`, and a separate JSON file with its `slideIds`. Higher priority wins. Schedules support abbreviated days (`Mon`…`Sun`), local 24-hour `start`/`end` times (including overnight ranges), inclusive `startDate`/`endDate`, and an `expiresAt` timestamp. A slide may also have a schedule; it is omitted when not active.

Set a date-specific playlist priority above the regular playlists to take over for an event. Keep a default playlist without restrictions so there is always a fallback.

## Emergency message

Edit `config/emergency.json`. The display checks this file every minute and pauses slides while it is enabled:

```json
{ "enabled": true, "message": "Venue closed today. Please check the club website." }
```

Set `enabled` back to `false` to resume normal rotation.

## Club data

Edit the `items` arrays in `data/results.json`, `data/masterpoints.json`, `data/slams.json`, `data/birthdays.json`, or `data/events.json`. Keep dates in ISO format. `events` can have `redPoint: true`; birthdays use `YYYY-MM-DD`.

For generated results, edit `tools/source/club-data.json` and run `node tools/generate-data.js`. The script replaces results, masterpoints, slams, and events output files.
