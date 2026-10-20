Build a production-quality digital signage platform for Joondalup Bridge Club.

# Objective

Create a browser-based digital signage system that runs continuously on a TV in kiosk mode.

The system will be hosted on Cloudflare Pages and managed through GitHub.

The display must combine:

1. Canva-generated promotional content
2. Automatically generated club statistics
3. Results and leaderboards
4. Upcoming events
5. Sponsor recognition
6. Club announcements

The system must require minimal technical knowledge for volunteers.

---

# Technology

Use:

- HTML5
- CSS3
- Vanilla JavaScript
- ES6 Modules

Do NOT use:

- React
- Angular
- Vue
- jQuery
- Build tools
- Node runtime dependencies for the player

The signage player must work as a completely static website.

---

# Architecture

Create:

/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── player.js
│   ├── scheduler.js
│   ├── slides.js
│   ├── ticker.js
│   ├── widgets.js
│   └── emergency.js
├── config/
│   ├── signage.json
│   ├── emergency.json
│   └── playlists/
├── data/
│   ├── results.json
│   ├── masterpoints.json
│   ├── slams.json
│   ├── birthdays.json
│   └── events.json
├── slides/
├── assets/
├── docs/
└── README.md

---

# Slide Types

Support:

- image
- video
- html
- announcement
- event
- sponsor
- leaderboard
- results
- statistics
- countdown

Each slide type must be implemented as a reusable renderer.

---

# Canva Integration

The club designs most promotional slides in Canva.

Store exported Canva PNG files in:

slides/

Examples:

slides/
  melbourne-cup.png
  lessons.png
  swiss-pairs.png
  sponsors.png

The signage system should automatically display Canva slides without any code changes.

Volunteers should only need to:

1. Create design in Canva
2. Export PNG
3. Copy file into slides folder
4. Git commit
5. Git push

---

# Dynamic Data Slides

Generate slides from JSON data.

Support:

results.json
masterpoints.json
slams.json
birthdays.json
events.json

Examples:

Grand Slams This Year

John Smith    5
Mary Jones    3
David Brown   2

---

Monthly Masterpoints

1. Jones/Smith      2.15
2. Brown/White      1.87
3. Green/Black      1.55

---

Most Improved Pair

+0.42 MPs

John Smith
Mary Jones

---

# Scheduling

Support:

- days of week
- time ranges
- date ranges
- expiry dates
- recurring schedules

Example:

{
  "days": ["Mon","Wed"],
  "start": "08:00",
  "end": "17:00"
}

Slides automatically appear and disappear according to schedule.

---

# Playlist Support

Create:

day playlist
evening playlist
weekend playlist
special event playlist

System automatically selects playlist based on current time.

Example:

06:00 - 16:00 Day

16:00 - 22:00 Evening

22:00 - 06:00 Overnight

---

# Header

Display:

- Club logo
- Current date
- Current time

Update time every second.

---

# Footer

Scrolling ticker.

Ticker text stored in configuration.

Example:

Welcome to Joondalup Bridge Club

Lessons Available

Next Red Point Event Friday

Visitors Welcome

---

# Emergency Override

If emergency.json contains:

{
  "enabled": true,
  "message": "Venue Closed Today"
}

Display a full-screen overlay.

Suspend normal operation.

---

# Widgets

Create optional widgets:

- countdown to next event
- weather placeholder
- birthday recognitions
- today's sessions
- next red point event

Widgets can be enabled or disabled via JSON.

---

# Dynamic Content Generator

Create a separate generator system.

Folder:

tools/

Create:

generate-data.js

This script reads club data and produces JSON files for the signage player.

Example outputs:

data/results.json
data/masterpoints.json
data/slams.json
data/events.json

The player should only read JSON and never connect directly to a database.

---

# Future Database Integration

Design a provider architecture.

Create:

providers/

with interfaces for:

- Pianola
- BridgeScore
- CSV files
- Custom REST API

Future integrations should only require creating a new provider.

---

# Offline Support

Implement a Service Worker.

Requirements:

- Continue displaying existing content during internet outage
- Fetch updates when internet returns

---

# Visual Design

Style requirements:

- Modern
- Professional
- Easy to read from 5-10 metres
- High contrast
- Dark mode first
- Large typography
- Smooth fade transitions

The signage should resemble commercial airport, conference, and event displays.

---

# Sample Data

Generate example:

- Melbourne Cup slide
- Lessons slide
- Swiss Pairs slide
- Sponsor slide
- Results slide
- Grand Slam leaderboard
- Masterpoint leaderboard
- Birthday slide

---

# Documentation

Create a complete README that explains:

- local development
- GitHub deployment
- Cloudflare Pages deployment
- Raspberry Pi kiosk setup
- Windows kiosk setup
- Android TV setup
- how volunteers update Canva slides
- how automated statistics are generated

---

# Copilot Requirements

Act as a senior software architect.

Prioritise:

1. Simplicity
2. Reliability
3. Static hosting compatibility
4. Separation of concerns
5. Volunteer usability

Generate all files and code necessary for a complete working first version.