import React, { useState } from 'react';
import { Search, RefreshCw, Calendar as CalendarIcon, Plus, BookOpenCheck, AlertTriangle } from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { useAuth } from '../../context/AuthContext';
import EventCard from './EventCard';
import LoadingSpinner from '../common/LoadingSpinner';
import { isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';

// ─── Filter tab definitions ── LOGIC UNCHANGED ─────────────────────────────────
const FILTER_TABS = [
  {
    id: 'all',
    label: 'All Schedule',
    activeText: 'text-teal-700',
    activeDot:  'bg-teal-500',
    match: () => true,
  },
  {
    id: 'academics',
    label: 'Academics',
    activeText: 'text-indigo-700',
    activeDot:  'bg-indigo-500',
    match: (title, desc) =>
      title.includes('[DUE]') ||
      title.includes('[STUDY]') ||
      desc.includes('ASSIGNMENT DEADLINE') ||
      desc.includes('STUDY SESSION'),
  },
  {
    id: 'projects',
    label: 'Projects & Clubs',
    activeText: 'text-emerald-700',
    activeDot:  'bg-emerald-500',
    match: (title, desc) =>
      title.includes('[PROJECT]') ||
      title.includes('[CLUB]') ||
      desc.includes('Project Activity') ||
      desc.includes('Club Activity'),
  },
  {
    id: 'fests',
    label: 'College Fests',
    activeText: 'text-amber-700',
    activeDot:  'bg-amber-500',
    match: (title, desc) =>
      title.includes('[FEST]') ||
      title.includes('[EVENT]') ||
      desc.includes('CAMPUS EVENT'),
  },
];

export default function EventList({ onOpenCreateModal }) {
  const { events, loading, loadEvents } = useCalendar();
  const { isAuthenticated, login }       = useAuth();
  const [searchTerm, setSearchTerm]      = useState('');
  const [filterTab, setFilterTab]        = useState('all');

  const activeFilter = FILTER_TABS.find((t) => t.id === filterTab) || FILTER_TABS[0];

  // ── Filter logic — LOGIC UNCHANGED ──────────────────────────────────────────
  const filteredEvents = events.filter((event) => {
    const rawTitle = event.summary || '';
    const desc     = event.description || '';

    const matchesSearch =
      rawTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    return activeFilter.match(rawTitle, desc);
  });

  // ── Group events by date bucket — LOGIC UNCHANGED ───────────────────────────
  const groupedEvents = { today: [], tomorrow: [], thisWeek: [], upcoming: [] };

  filteredEvents.forEach((event) => {
    const startStr = event.start?.dateTime || event.start?.date;
    if (!startStr) { groupedEvents.upcoming.push(event); return; }
    try {
      const date = parseISO(startStr);
      if (isToday(date))        groupedEvents.today.push(event);
      else if (isTomorrow(date)) groupedEvents.tomorrow.push(event);
      else if (isThisWeek(date)) groupedEvents.thisWeek.push(event);
      else                       groupedEvents.upcoming.push(event);
    } catch {
      groupedEvents.upcoming.push(event);
    }
  });

  const renderEventBucket = (title, items, dotClass) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
          <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-600">{title}</h3>
          <span className="text-xs text-slate-400 font-semibold neu-inset px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="mt-8">
      {/* ── Header Controls Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2.5">
            <BookOpenCheck className="w-6 h-6 text-teal-600" />
            Focus Schedule
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAuthenticated
              ? 'Synced directly with your primary Google Calendar.'
              : 'Connect your Google Account to sync calendar events.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh */}
          <button
            onClick={loadEvents}
            disabled={loading || !isAuthenticated}
            title="Refresh events"
            className="p-2.5 rounded-xl neu-btn text-slate-500 hover:text-teal-600 disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-500' : ''}`} />
          </button>

          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search schedule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl neu-inset text-xs text-slate-700 placeholder-slate-400 outline-none border-0 bg-transparent focus:ring-2 focus:ring-teal-300/40 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-2 mb-6 pb-4 flex-wrap">
        {FILTER_TABS.map((tab) => {
          const isActive = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all
                ${isActive
                  ? `neu-pressed ${tab.activeText}`
                  : 'neu-btn text-slate-500 hover:text-slate-700'
                }
              `}
            >
              {isActive && <span className={`w-1.5 h-1.5 rounded-full ${tab.activeDot}`} />}
              {tab.label}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-slate-400 font-medium hidden sm:inline">
          {filteredEvents.length} / {events.length} events
        </span>
      </div>

      {/* ── Content Section ── */}
      {loading ? (
        <LoadingSpinner label="Fetching your academic schedule..." />
      ) : !isAuthenticated ? (
        /* ── Disconnected State ── */
        <div className="neu-card p-10 sm:p-12 text-center flex flex-col items-center justify-center my-8">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-500 mb-5 shadow-neu-xs">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="font-display font-extrabold text-xl text-slate-800 mb-2">Account not connected</h3>
          <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
            Connect your Google Account to view, schedule, and sync your academic deadlines to Google Calendar.
          </p>
          <button
            onClick={() => login()}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-white font-bold text-sm bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_4px_16px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.5)] hover:scale-[1.02] active:scale-[0.97] transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#ffffff" fillOpacity="0.9" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#ffffff" fillOpacity="0.9" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#ffffff" fillOpacity="0.9" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#ffffff" fillOpacity="0.9" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Connect Google Account
          </button>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div>
          {renderEventBucket('Today',             groupedEvents.today,    'bg-emerald-500 animate-pulse')}
          {renderEventBucket('Tomorrow',          groupedEvents.tomorrow, 'bg-cyan-500')}
          {renderEventBucket('This Week',         groupedEvents.thisWeek, 'bg-indigo-400')}
          {renderEventBucket('Upcoming & Future', groupedEvents.upcoming, 'bg-slate-400')}
        </div>
      ) : (
        /* ── Empty State ── */
        <div className="neu-card p-12 text-center flex flex-col items-center justify-center my-8">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-600 mb-4 shadow-neu-xs">
            <CalendarIcon className="w-8 h-8" />
          </div>
          <h3 className="font-display font-bold text-lg text-slate-700 mb-1">
            {searchTerm
              ? 'No matching events found'
              : filterTab === 'all'
              ? 'No upcoming events'
              : `No ${activeFilter.label} events`}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-6">
            {searchTerm
              ? `No events found matching "${searchTerm}". Try clearing your search.`
              : 'Your schedule is empty for this category. Add an event to get started.'}
          </p>
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_4px_14px_rgba(99,102,241,0.35)] hover:scale-[1.02] active:scale-[0.97] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Event
          </button>
        </div>
      )}
    </section>
  );
}
