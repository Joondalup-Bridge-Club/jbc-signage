# Pulling live data from an API (options, not yet implemented)

Today the player reads only static files: `config/*.json`, `data/*.json` and local assets. The one runtime fetch is the optional calendar feed (`calendar.feedUrl` in `config/signage.json`). This page records the ways live data could be added later.

## Constraints

- **Static hosting:** the player is served by GitHub/Cloudflare Pages, so there is no server code of its own.
- **CORS:** a browser may only read another site's API if that site sends `Access-Control-Allow-Origin`. Many club-software APIs do not.
- **Secrets:** anything in the repo or the player's JavaScript is public. API keys must never be placed there.
- **Offline resilience:** the TV must keep working when the network or the API is down, so the last good data must always be available.
- **Simplicity:** the project prefers vanilla JS, no dependencies, and things a volunteer can maintain.

## Option 1: fetch directly from the player

Add a `dataSources` map in `config/signage.json` (data name to URL). On load, the player fetches each URL and falls back to the matching `data/<name>.json` if the request fails.

| | |
|---|---|
| Good | Smallest change; no extra infrastructure; always up to date |
| Bad | Needs a public API that allows CORS and needs no key; every TV calls the API directly |
| Use when | The source is a public JSON or ICS feed (for example a published calendar) |

## Option 2: Cloudflare Worker proxy

A small Worker, hosted alongside the Pages site, calls the API, keeps the key as a Worker secret, adds CORS headers and caches the response for a few minutes. The player fetches the Worker URL (as in Option 1).

| | |
|---|---|
| Good | Keys stay private; fixes CORS; can reshape the response into the player's data format; the cache protects the API from many TVs |
| Bad | One more thing to deploy and maintain; free-tier limits apply |
| Use when | The API needs a key, lacks CORS, or returns a format the player cannot use directly |

## Option 3: scheduled fetch into the repo (GitHub Action)

A scheduled GitHub Action calls the API every few hours, converts the result into `data/*.json` (reusing `tools/generate-data.js` conventions) and commits it. The player stays fully static.

| | |
|---|---|
| Good | Works offline; no CORS or key exposure (the key is a GitHub secret); simplest runtime; history in git |
| Bad | Data is only as fresh as the schedule; adds commits; the Action needs maintaining |
| Use when | Data changes slowly (results, leaderboards, masterpoints) and a delay of hours is fine |

## Comparison

| | Fresh data | Keeps keys private | Handles no CORS | Works offline | Extra infrastructure |
|---|---|---|---|---|---|
| 1. Direct fetch | Yes | No | No | With fallback | None |
| 2. Worker proxy | Yes | Yes | Yes | With fallback | Worker |
| 3. Scheduled Action | Hours old | Yes | Yes | Yes | GitHub Action |

## Recommended approach

1. Keep static JSON as the source of truth and the fallback in every case.
2. Use Option 3 for results, leaderboards and similar slow-changing data.
3. Use Option 1 for public feeds such as the calendar.
4. Add Option 2 only if a source needs a key and must be live.

## Design notes for whichever option is built

- **Fallback order:** live response, then the last cached copy (service worker or `localStorage`), then the bundled `data/*.json`.
- **Timeouts:** use a short fetch timeout (about 5 seconds) so a slow API never blocks the slides.
- **Validation:** check the shape of the response before use, and ignore bad data rather than showing broken slides.
- **Safe rendering:** render API text with `textContent` (as the existing renderers do), never `innerHTML`.
- **Refresh:** re-fetch on an interval (for example every 15 minutes) rather than on every slide change.
- **Admin GUI:** the Club data tab would show which data is fed live and treat it as read-only.

## Candidate sources to investigate

These have not been checked for API availability, terms of use, CORS or keys:

- Calendar: a Google Calendar or other published ICS feed (already supported through `calendar.feedUrl`).
- Results and masterpoints: the club's scoring or management software, ABF Live, or Pianola.
- Weather or other widgets: a public weather API.
