Build a complete digital signage web application suitable for a community bridge club.

Technology:
- Static site only
- HTML5, CSS, JavaScript
- No server required
- Deployable to GitHub Pages or Cloudflare Pages
- Mobile responsive
- Full-screen TV display optimized for 1920x1080
- Dark mode default

Requirements
============

Create a digital signage system with the following features:

1. SLIDE TYPES
- Image slides (jpg/png/webp)
- Video slides (mp4)
- HTML content slides
- Announcement slides
- Event slides
- Sponsor slides

2. AUTOMATIC ROTATION
- Rotate slides automatically
- Configurable duration per slide
- Fade transition between slides
- Infinite loop
- Auto-reload content every 15 minutes

3. SCHEDULING
Create a JSON-driven scheduler.

Example:

{
  "slides": [
    {
      "id": "monday_pairs",
      "type": "image",
      "file": "slides/monday-pairs.jpg",
      "duration": 15,
      "schedule": {
        "days": ["Mon"],
        "start": "00:00",
        "end": "23:59"
      }
    }
  ]
}

Support:
- Date ranges
- Days of week
- Time ranges
- Permanent slides
- Expiry dates

4. CONTENT MANAGEMENT

All signage content must be controlled from:
signage.json

No code changes required to update content.

5. ADMIN FRIENDLY

Club volunteers should only need to:
- Upload image/video files
- Edit signage.json
- Commit to GitHub

System automatically updates.

6. LAYOUT

Header:
- Club logo
- Current date/time

Body:
- Active slide

Footer:
- Rotating ticker

Ticker examples:
- Welcome to Joondalup Bridge Club
- Next Swiss Pairs Friday
- Lessons available for beginners

7. EMERGENCY MESSAGE SYSTEM

If emergency.json exists:

{
  "enabled": true,
  "message": "Venue Closed Today"
}

Display:
- Full screen red overlay
- Overrides all scheduled slides

8. MULTIPLE PLAYLISTS

Support:

playlist-day.json
playlist-evening.json
playlist-weekend.json

Automatically switch playlist by time.

Example:

06:00-16:00 day playlist
16:00-22:00 evening playlist
22:00-06:00 overnight playlist

9. CLIMATE / NEWS WIDGETS

Create optional widgets:
- Weather
- Countdown to next event
- Upcoming tournament list

Widgets can be enabled/disabled in JSON.

10. KIOSK MODE

Provide instructions for:

- Raspberry Pi
- Windows Mini PC
- Android TV browser

System must:
- Start automatically after power failure
- Launch browser full screen
- Hide mouse cursor
- Prevent screen sleep

11. PROJECT STRUCTURE

/
├── index.html
├── css/
├── js/
├── config/
│   ├── signage.json
│   ├── emergency.json
│   └── playlists/
├── slides/
├── videos/
├── assets/
└── docs/

12. SAMPLE CONTENT

Generate:
- Five example event slides
- Three sponsor slides
- One Melbourne Cup Day slide
- One Welcome slide

13. DOCUMENTATION

Create README.md containing:
- Installation
- Deployment to GitHub Pages
- Deployment to Cloudflare Pages
- How volunteers update content
- Scheduling examples

14. CODE QUALITY

- Modern ES6 modules
- Well-commented
- No external dependencies
- Fast loading
- Graceful error handling
- Local caching of content

15. BONUS FEATURES

Add:
- QR code slide support
- Club results slide
- Birthday/member recognition slide
- Automatic "Today's Sessions" slide generated from JSON

Generate the entire project with all files, sample configuration, and deployment instructions.