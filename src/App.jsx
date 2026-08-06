import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { GraduationCap, BookOpen, Briefcase, Zap, LogOut, AlertCircle, Plus, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import AddEventModal from './components/calendar/AddEventModal';
import CalendarModal from './components/CalendarModal';
import EventList from './components/calendar/EventList';
import PendingRadar from './components/PendingRadar';
import Toast from './components/common/Toast';
import { useAuth } from './context/AuthContext';
import { useCalendar, CalendarProvider } from './context/CalendarContext';
import { fetchPendingStudentAssignments } from './services/googleClassroom';

// ─── KPI card accent configs ──────────────────────────────────────────────────
const KPI_CARDS = [
  {
    key: 'due',
    label: 'Due Assignments',
    sublabel: 'Pending deadlines',
    icon: GraduationCap,
    accent: {
      iconBg:     'bg-rose-100',
      iconColor:  'text-rose-600',
      countColor: 'text-rose-600',
      dot:        'bg-rose-400',
      label:      'text-rose-500',
    },
    match: (e) => (e.summary || '').includes('[DUE]') || (e.description || '').includes('ASSIGNMENT DEADLINE'),
  },
  {
    key: 'study',
    label: 'Study Sessions',
    sublabel: 'Upcoming sessions',
    icon: BookOpen,
    accent: {
      iconBg:     'bg-indigo-100',
      iconColor:  'text-indigo-600',
      countColor: 'text-indigo-600',
      dot:        'bg-indigo-400',
      label:      'text-indigo-500',
    },
    match: (e) => (e.summary || '').includes('[STUDY]') || (e.description || '').includes('STUDY SESSION'),
  },
  {
    key: 'projects',
    label: 'Projects & Clubs',
    sublabel: 'Active commitments',
    icon: Briefcase,
    accent: {
      iconBg:     'bg-emerald-100',
      iconColor:  'text-emerald-600',
      countColor: 'text-emerald-600',
      dot:        'bg-emerald-400',
      label:      'text-emerald-500',
    },
    match: (e) => (e.summary || '').includes('[PROJECT]') || (e.summary || '').includes('[CLUB]') ||
      (e.description || '').includes('Project Activity') || (e.description || '').includes('Club Activity'),
  },
  {
    key: 'fests',
    label: 'College Fests',
    sublabel: 'Campus events',
    icon: Zap,
    accent: {
      iconBg:     'bg-amber-100',
      iconColor:  'text-amber-600',
      countColor: 'text-amber-600',
      dot:        'bg-amber-400',
      label:      'text-amber-500',
    },
    match: (e) => (e.summary || '').includes('[FEST]') || (e.summary || '').includes('[EVENT]') ||
      (e.description || '').includes('CAMPUS EVENT'),
  },
];

// ─── Dashboard (inner) ────────────────────────────────────────────────────────
function Dashboard() {
  const { accessToken, user, isAuthenticated, login, logout } = useAuth();
  const { events, addEvent, showToast } = useCalendar();

  const [activeView, setActiveView]         = useState('dashboard'); // 'dashboard' | 'classroom'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [clock, setClock]                   = useState(new Date());
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [syncingId, setSyncingId]           = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch pending live assignments
  useEffect(() => {
    async function loadPending() {
      try {
        const data = await fetchPendingStudentAssignments(accessToken);
        setPendingAssignments(data);
      } catch (err) {
        console.warn('Dashboard pending assignments fetch error:', err);
      }
    }
    loadPending();
  }, [accessToken]);

  const displayName = user?.name?.split(' ')[0] || 'Student';
  const currentDate = format(clock, 'EEEE, MMMM d');
  const currentTime = format(clock, 'h:mm:ss a');
  const currentYear = format(clock, 'yyyy');

  // KPI counts — dynamically combine calendar events and pending assignments
  const kpiCounts = useMemo(
    () =>
      KPI_CARDS.map((card) => {
        const calendarMatchCount = events.filter(card.match).length;
        if (card.key === 'due') {
          return calendarMatchCount + pendingAssignments.length;
        }
        return calendarMatchCount;
      }),
    [events, pendingAssignments]
  );

  const greetHour = clock.getHours();
  const greeting  = greetHour < 12 ? 'Good Morning' : greetHour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="min-h-screen flex flex-col bg-neu text-slate-700 selection:bg-teal-300 selection:text-slate-900">

      {/* ════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 w-full bg-neu">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="neu-card rounded-none sm:rounded-2xl sm:mx-4 sm:mt-4 px-5 h-16 flex items-center justify-between gap-4 shadow-neu-sm">

            {/* Left: Brand & Navigation Tabs */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('dashboard')}>
                <div className="w-10 h-10 rounded-2xl neu-btn flex items-center justify-center p-1.5 flex-shrink-0">
                  <img src="/logo.png" alt="Catalyst" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-extrabold text-base text-slate-800">
                      Catalyst
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] font-extrabold tracking-widest uppercase rounded-lg bg-teal-100 text-teal-700 shadow-neu-xs">
                      v1.0
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 hidden sm:block">AI-First Google Calendar Planner</p>
                </div>
              </div>

              {/* View Nav Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl neu-inset text-xs font-bold">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeView === 'dashboard'
                      ? 'neu-btn text-teal-700 shadow-neu-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView('classroom')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeView === 'classroom'
                      ? 'neu-btn text-indigo-700 shadow-neu-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pending Radar</span>
                  <span className="sm:hidden">Radar</span>
                </button>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3">

              {/* Sync status */}
              {isAuthenticated ? (
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl neu-inset text-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-slate-600 font-semibold truncate max-w-[100px]">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <button
                    onClick={logout}
                    className="p-0.5 rounded text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => login()}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl neu-btn text-slate-600 text-xs font-semibold"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Connect
                </button>
              )}

              {/* Calendar View */}
              <button
                onClick={() => setIsCalendarOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl neu-btn text-slate-600 hover:text-teal-700 text-xs font-semibold"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calendar</span>
              </button>

              {/* Quick Add */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs sm:text-sm bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_4px_16px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)] hover:scale-[1.02] active:scale-[0.97] transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="hidden sm:inline">Quick Add</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'classroom' ? (
          <PendingRadar />
        ) : (
          <>
            {/* ── Hero Banner ── */}
            <div className="neu-card p-6 sm:p-8 mb-8 relative overflow-hidden">
              {/* Subtle color accent blobs */}
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />

              {/* Watermark logo */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-25 pointer-events-none hidden lg:block">
                <img src="/logo.png" alt="" className="w-64 h-64 object-contain" />
              </div>

              <div className="relative z-10">
                {/* Greeting */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full neu-inset text-teal-700 text-[10px] font-bold uppercase tracking-widest mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                  Dashboard
                </span>

                <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-slate-800 tracking-tight leading-tight">
                  {greeting},{' '}
                  <span className="text-teal-600">{displayName}</span> 👋
                </h1>

                <p className="text-slate-500 text-sm mt-2">
                  {isAuthenticated
                    ? `${events.length} upcoming event${events.length !== 1 ? 's' : ''} synced from Google Calendar.`
                    : 'Connect your Google account to sync your academic calendar.'}
                </p>

                {/* Date / Clock cards */}
                <div className="flex flex-wrap gap-4 mt-6">

                  {/* Date card */}
                  <div className="flex items-center gap-3 px-5 py-4 rounded-2xl neu-inset">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <CalendarIcon className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Today's Date</p>
                      <p className="text-xl sm:text-2xl font-extrabold text-slate-800 leading-tight">{currentDate}</p>
                      <p className="text-xs text-teal-600 font-semibold mt-0.5">{currentYear}</p>
                    </div>
                  </div>

                  {/* Clock card */}
                  <div className="flex items-center gap-3 px-5 py-4 rounded-2xl neu-inset">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl leading-none">⏱</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Live Clock</p>
                      <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600 font-mono tabular-nums leading-tight">{currentTime}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Real-time</p>
                    </div>
                  </div>

                  {!isAuthenticated && (
                    <button
                      onClick={() => login()}
                      className="flex items-center gap-2 px-5 py-4 rounded-2xl neu-btn text-rose-600 text-sm font-semibold self-stretch"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Connect Google Calendar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── 4-Column KPI Bar ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {KPI_CARDS.map((card, i) => {
                const Icon  = card.icon;
                const count = kpiCounts[i];
                const a     = card.accent;
                return (
                  <div
                    key={card.key}
                    className="neu-card neu-card-hover p-5 cursor-default"
                  >
                    {/* Icon + count row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-11 h-11 rounded-2xl ${a.iconBg} flex items-center justify-center shadow-neu-xs`}>
                        <Icon className={`w-5 h-5 ${a.iconColor}`} />
                      </div>
                      <span className={`text-3xl font-extrabold ${a.countColor} font-display tabular-nums`}>
                        {count}
                      </span>
                    </div>

                    {/* Label */}
                    <p className="text-sm font-bold text-slate-700 leading-tight">{card.label}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`w-2 h-2 rounded-full ${a.dot}`} />
                      <p className={`text-[11px] font-semibold ${a.label}`}>{card.sublabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── 🤖 AI DETECTED & PENDING CLASSROOM ASSIGNMENTS PANEL ── */}
            {pendingAssignments.length > 0 && (
              <div className="neu-card p-6 mb-8 border-l-4 border-l-rose-500 relative overflow-hidden">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-display font-extrabold text-lg text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                      <span>AI Detected & Pending Classroom Deadlines</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
                        {pendingAssignments.length} Pending
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Unsubmitted assignments automatically fetched from active 2026 Google Classrooms. Click to sync directly to your Google Calendar.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveView('classroom')}
                    className="hidden sm:flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    View Radar Hub &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingAssignments.slice(0, 4).map((assignment) => {
                    const isSyncing = syncingId === assignment.id;
                    return (
                      <div
                        key={assignment.id}
                        className="p-4 rounded-2xl neu-inset bg-white/60 flex flex-col justify-between gap-3 border border-white/80"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-extrabold text-[10px] uppercase">
                              {assignment.courseName}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wide rounded-md px-2 py-0.5 ${
                              assignment.assignmentStatus === '❌ Missing'
                                ? 'bg-rose-50 text-rose-700'
                                : assignment.assignmentStatus === '⚠️ No Due Date'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {assignment.assignmentStatus || (assignment.hasNoDueDate ? '⚠️ No Due Date' : '⏳ Pending')}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-slate-800 text-sm">{assignment.title}</h4>
                          {assignment.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{assignment.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                          <a
                            href={assignment.alternateLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-teal-700 hover:underline"
                          >
                            Open Classroom
                          </a>

                          <button
                            onClick={async () => {
                              setSyncingId(assignment.id);
                              try {
                                const startDateTime = assignment.dueDateISO || new Date().toISOString();
                                const endDate = new Date(startDateTime);
                                endDate.setHours(endDate.getHours() + 1);

                                await addEvent({
                                  title: `[DUE] ${assignment.title} (${assignment.courseName})`,
                                  description: `Course: ${assignment.courseName}\nInstructions: ${assignment.description}\nLink: ${assignment.alternateLink}\n\n[Synced via Catalyst AI Dashboard]`,
                                  startDateTime,
                                  endDateTime: endDate.toISOString(),
                                  colorId: '11',
                                });

                                setPendingAssignments((prev) => prev.filter((item) => item.id !== assignment.id));
                              } catch (err) {
                                console.error('Sync failed:', err);
                              } finally {
                                setSyncingId(null);
                              }
                            }}
                            disabled={isSyncing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white font-bold text-xs bg-indigo-600 hover:bg-indigo-700 shadow-neu-xs transition-all disabled:opacity-50"
                          >
                            {isSyncing ? (
                              <span>Syncing...</span>
                            ) : (
                              <>
                                <CalendarIcon className="w-3.5 h-3.5" />
                                <span>📅 Sync to Google Calendar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Event List ── */}
            <EventList onOpenCreateModal={() => setIsAddModalOpen(true)} />
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-neu-dark/60 py-5 bg-neu-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Catalyst" className="w-4 h-4 object-contain opacity-40" />
            <span className="font-display font-bold text-slate-500">Catalyst Study Planner</span>
          </div>
          <div>Powered by React · Vite · Google Calendar API v3</div>
        </div>
      </footer>

      {/* ── Modals ── */}
      <AddEventModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onAddEvent={() => { setIsCalendarOpen(false); setIsAddModalOpen(true); }}
      />

      <Toast />
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <CalendarProvider>
      <Dashboard />
    </CalendarProvider>
  );
}
