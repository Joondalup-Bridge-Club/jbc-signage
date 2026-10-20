Enhance the digital signage system with:

- Web-based admin GUI for managing slides, playlists, schedules, events, and club data
- GUI edits are saved to the local project JSON files; review and commit/push changes separately in VS Code
- Admin GUI is for local use, not a hosted editor; no GitHub credentials or commit actions in the browser
- Use a small local-only helper to read/write an allowlist of project JSON files, keeping the deployed signage player static
- Drag-and-drop slide ordering in the admin GUI
- Markdown slide support
- PDF slide support
- Sponsor impression statistics (NOT REQUIRED)
- Transition effects library
- Full screen image zoom (Ken Burns effect)(NOT REQUIRED)
- Club calendar integration from JSON feed
- Auto-generated upcoming events slide
- Offline mode using service workers (already implemented in V1)
- Touchscreen support for gui ONLY
- Multi-screen support(NOT REQUIRED)