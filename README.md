# Joondalup Bridge Club Digital Signage

A static, browser-based signage player for the club TV. It rotates promotional slides, club announcements, event information and JSON-driven results; it needs no server-side runtime, package installation or build step. Publish this repository to GitHub Pages or Cloudflare Pages and open the site in a full-screen browser.

## Quick start

1. Clone the repository.
2. From the repository folder, start a local static server:

   ```sh
   python3 -m http.server 8000
   ```

3. Open <http://localhost:8000> in a browser.
4. Change the JSON files in `config/` and `data/` to try different announcements, schedules and results.

Use a local web server rather than opening `index.html` as a `file://` URL: browsers require HTTP(S) for ES modules, fetch requests and service workers.

## Admin GUI (local only)

Volunteers can manage slides, playlists, schedules, events and club data without editing JSON by hand. The admin GUI is **not** deployed as an editor: it runs on a computer with a checkout of this repository, served by a small Node.js helper (built-ins only, no install step).

```sh
node tools/admin-server.js          # optional port argument, default 8787
```

Open <http://localhost:8787/admin/>. Drag the ⠿ handles (mouse or touch) to reorder slides, then press **Save changes**. Edits are written to the project JSON files; review, commit and push them in VS Code to publish. The browser never holds GitHub credentials.

The helper listens on `127.0.0.1` only, rejects other host names and cross-site requests, and can only write an allowlist: `config/signage.json`, `config/emergency.json`, `config/playlists/*.json`, `data/*.json`, `tools/source/club-data.json`, plus uploads of images, PDFs, Markdown and video into `slides/`. The signage player stays fully static.

## Project structure

```text
index.html                 Signage page
admin/                     Local admin GUI (used with tools/admin-server.js)
css/style.css              TV-first, responsive dark theme
js/                        Player, reusable slide renderers, scheduler and widgets
config/signage.json        Slides, playlists, widgets and ticker configuration
config/emergency.json      Emergency message switch
config/playlists/          Day, evening, weekend and special-event playlists
data/                      Generated or volunteer-maintained JSON data
slides/                    Canva exports and included working sample slides
tools/admin-server.js      Local-only helper that serves the admin GUI and saves JSON
tools/generate-data.js     Optional Node.js data-file generator
tools/source/              Input JSON for the data generator
providers/                 Design notes for future data-source adapters
service-worker.js          Static asset and JSON offline cache
docs/                      Content-management guidance and API options
```

## Content and slide types

The signage player reads all content from JSON and local assets. Supported slide types are `image`, `video`, `html`, `pdf`, `markdown`, `upcoming`, `announcement`, `event`, `sponsor`, `leaderboard`, `results`, `statistics` and `countdown`. See [content management](./docs/content-management.md) for slide fields, data shapes, scheduling and emergency-message examples.

Live data from an API is not implemented yet; the options are written up in [API options](./docs/api-options.md).

The four included sample art slides are SVGs; replace them with your Canva exports whenever ready. To add a Canva slide:

1. Create a landscape design in Canva and export it as a PNG.
2. Copy the PNG into `slides/`.
3. Add a slide entry to `config/signage.json` and its `id` to the appropriate playlist file in `config/playlists/`.
4. Commit and push. The display refreshes content every 15 minutes.

Static hosts do not provide a portable directory-listing API. For that reason the player cannot automatically discover a newly copied image; adding its JSON entry is required, but no JavaScript changes are needed.

## Club data generator

The player only reads the published JSON files and never connects to a database. To regenerate results, masterpoints, slams and events from the included example source:

```sh
node tools/generate-data.js
```

Edit `tools/source/club-data.json` with the club's current data before running it. The script uses Node.js built-ins only. Birthdays are edited directly in `data/birthdays.json`. Review generated files, then commit and push them with the rest of the site. Future Pianola, BridgeScore, CSV or REST integrations should normalize data outside the player; see [provider notes](./providers/README.md).

## GitHub Pages deployment

The included workflow at `.github/workflows/deploy-pages.yml` publishes the static site on pushes to `main`.

1. In the repository, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.
2. Push a commit to `main` (or run the workflow manually from the Actions tab).
3. Wait for the **Deploy to GitHub Pages** workflow to finish; open the URL shown in the Pages settings.

No custom build command is needed. If your default branch is not named `main`, update the workflow branch filter before enabling it.

## Cloudflare Pages deployment

1. In the Cloudflare dashboard, choose **Workers & Pages → Create → Pages → Connect to Git**.
2. Select this GitHub repository and the production branch.
3. Set **Framework preset** to **None**, leave the build command blank, and set the build output directory to `/` (the repository root).
4. Save and deploy. Subsequent pushes to the connected branch publish automatically.

The player has no third-party runtime dependencies and works from a project subpath as well as a domain root.

## TV and kiosk setup

For every display, use the deployed HTTPS URL, configure the browser to launch at login/startup, enable automatic OS updates/restarts as appropriate, and disable display sleep. Confirm the display clock and timezone are set correctly because schedules use the device's local time. Keep the display connected to power and network; the service worker caches the app and recently fetched content for temporary internet outages.

### Raspberry Pi

Use Raspberry Pi OS with desktop, install Chromium and `unclutter`, and configure the desktop session to launch Chromium after login. For example, add a Chromium command to the desktop autostart mechanism for the installed OS version:

```sh
chromium --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble https://YOUR-SITE.example/
```

Add `unclutter -idle 0.5 -root` to hide the pointer. Disable screen blanking in the desktop power settings. Newer Raspberry Pi OS releases have changed session/autostart defaults, so use their current desktop documentation for the correct autostart location.

### Windows mini PC

Install and update Microsoft Edge or Chrome. Create a startup shortcut with the browser executable and the following arguments, replacing the URL:

```text
--kiosk --no-first-run --disable-features=Translate https://YOUR-SITE.example/
```

Put the shortcut in the signed-in account's Startup folder (`shell:startup`). Set Windows power options to never sleep or turn off the display while plugged in. For managed unattended machines, use a dedicated standard user account and configure automatic sign-in only if consistent with the club's physical security requirements.

### Android TV

Use a kiosk-capable browser that supports auto-launch after boot, full-screen display, and screen-awake mode. Configure the site URL as its start page, enable start-on-boot and keep-screen-on, and hide browser controls. Menu names and capabilities differ by TV manufacturer; check that browser updates do not reset kiosk settings.

## Offline behavior and emergency messages

The service worker precaches the player and sample JSON, caches same-origin content as it is fetched, and uses cached responses when the network is unavailable. Newly added slides are available offline after they have been displayed at least once. A deployment update is fetched on the next refresh/reload. Test offline startup on the actual TV before relying on it.

Set `enabled` to `true` and enter the message in `config/emergency.json` to show the full-screen venue notice. The player checks for emergency changes once per minute and pauses normal slides while an emergency is active.

## Accessibility and display notes

The layout is designed for large screens and remains usable on a mobile browser for previewing. It uses a high-contrast dark theme, respects reduced-motion preferences, provides accessible alternative text for images, and renders configured text as text rather than HTML. A web font is not downloaded; typography uses system fonts so the player remains self-contained.
