# Catalyst

Catalyst is an AI-first productivity dashboard for students that connects Google Calendar and Google Classroom into a single planning experience. It helps users track pending assignments, detect hidden deadlines, and turn academic tasks into scheduled calendar events with minimal friction.

## Overview

This project is built with React + Vite and focuses on a student workflow:

- Connect a Google account
- View and manage upcoming calendar events
- Monitor pending Classroom assignments
- Detect hidden academic deadlines using AI
- Convert tasks into calendar events with one click
- Keep a clean dashboard for due assignments, study sessions, projects, and campus events

## Why this project exists

Students often juggle:

- Google Calendar for scheduling
- Google Classroom for coursework
- Multiple assignment deadlines and announcements
- Hidden deadlines buried inside course materials or announcements

Catalyst brings these signals together so the user can see the most important academic commitments in one dashboard and sync them directly to their calendar.

## Features

### Dashboard experience
- Personalized greeting and live time display
- KPI cards for due assignments, study sessions, projects, and campus events
- Quick access to the Google Calendar view
- One-click event creation flow

### Google Calendar integration
- Fetches upcoming events from the user’s primary calendar
- Creates new events directly through the Google Calendar API
- Prevents duplicate event creation when a similar task already exists
- Visualizes sessions and deadlines in a task-friendly dashboard

### Google Classroom integration
- Reads active coursework and assignment data
- Pulls pending student assignments
- Highlights the current academic workload in a dedicated Pending Radar view

### AI-powered deadline detection
- Scans Classroom announcements and materials for due dates
- Uses Gemini API when available for structured extraction
- Falls back to a local rule-based parser when AI is unavailable
- Converts discovered deadlines into calendar-ready tasks

### Student productivity workflow
- Converts tasks into scheduled study/project blocks
- Creates calendar entries with contextual descriptions
- Keeps lifecycle of academic commitments visible in one place

## Tech Stack

- React 18
- Vite
- JavaScript
- Tailwind CSS
- Google OAuth 2.0
- Google Calendar API
- Google Classroom API
- Gemini API (optional AI extraction)
- Axios
- date-fns
- lucide-react

## Project Structure

```text
catalyst-2/
├── public/
│   └── logo.png
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── components/
│   │   ├── CalendarModal.jsx
│   │   ├── PendingRadar.jsx
│   │   ├── calendar/
│   │   ├── classroom/
│   │   ├── common/
│   │   └── layout/
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── CalendarContext.jsx
│   ├── services/
│   │   ├── calendarSync.js
│   │   ├── geminiExtractor.js
│   │   ├── googleCalendar.js
│   │   └── googleClassroom.js
│   └── utils/
│       └── dateUtils.js
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json
└── README.md
```

## Prerequisites

Before running this application, make sure you have:

- Node.js 18 or newer
- npm or yarn
- A Google Cloud project with OAuth credentials
- Access to the Google Calendar and Google Classroom APIs
- A Gemini API key if you want AI-powered extraction enabled

## Environment Variables

Create a `.env` file in the project root with the following values:

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Notes
- `VITE_GOOGLE_CLIENT_ID` is required for Google sign-in and Calendar/Classroom API access.
- `VITE_GEMINI_API_KEY` is optional, but enables smarter deadline parsing for assignments and announcements.
- If keys are missing, the app may still run in limited/demo behavior, but full Google integrations will not work properly.

## Installation

1. Clone the repository:

```bash
git clone <your-repository-url>
cd catalyst-2
```

2. Install dependencies:

```bash
npm install
```

3. Set up your environment variables in a `.env` file.

4. Start the development server:

```bash
npm run dev
```

The app will be available at the local Vite URL, usually:

```text
http://localhost:5173
```

## Production Build

To generate a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Google Setup

To fully enable Google features:

1. Create a project in Google Cloud Console.
2. Enable:
   - Google Calendar API
   - Google Classroom API
3. Create OAuth 2.0 credentials.
4. Add your app URL to authorized redirect sources.
5. Configure the OAuth client ID in `VITE_GOOGLE_CLIENT_ID`.

The application uses Google OAuth with scopes for:

- Calendar event access
- Classroom course read access
- Classroom coursework read access
- Classroom announcement read access
- Classroom material read access

## Gemini Setup

To enable AI deadline detection:

1. Create a Gemini API key in Google AI Studio or the relevant Gemini platform.
2. Add it to `VITE_GEMINI_API_KEY`.
3. Restart the dev server after updating environment variables.

If the key is missing or the API call fails, the app automatically falls back to a local rule-based parser.

## Usage

### Connect account
- Click the Connect button in the header.
- Sign in with a Google account.
- Grant the required permissions.

### View calendar and tasks
- Open the dashboard to see summary KPIs.
- Use the calendar view to inspect upcoming events.
- Switch to Pending Radar to inspect classroom tasks and hidden deadlines.

### Sync tasks to calendar
- Review detected assignments or manually added events.
- Confirm and add them to Google Calendar.
- Use the app as a study-planning workflow that combines academic tasks and scheduling.

## Notes on app behavior

The application is designed for modern student productivity workflows and prioritizes a polished dashboard experience. It is production-ready in structure, but it still depends on valid Google and AI credentials to unlock its full functionality.

## License

This project is currently unlicensed unless you add a license file for your own use case.

If you want to publish or distribute it publicly, consider adding an appropriate license such as MIT.

## Contributing

Contributions are welcome. A good workflow is:

1. Fork the repository
2. Create a feature branch
3. Make focused changes
4. Validate with the app locally
5. Open a pull request with a clear description

## Acknowledgements

- Google Calendar API
- Google Classroom API
- Google Gemini API
- React and Vite ecosystem
- Tailwind CSS

## Future improvements

Possible enhancements include:

- user preferences and smart filters
- recurring class schedule sync
- notifications and reminders
- richer AI task classification
- drag-and-drop scheduling
- weekly planner and focus mode
- multi-tenant or team workspace support

## Summary

Catalyst is a modern student planning dashboard that unifies calendars, coursework, and AI-assisted deadline detection into a focused, useful experience. It is a strong foundation for an academic planning product and is structured in a way that is easy to extend as the product grows.
