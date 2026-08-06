import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, X, Plus, Clock,
  CalendarDays, FileText, BookOpen, Briefcase, Zap, CalendarCheck,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, isSameMonth, isSameDay, isToday,
  parseISO, eachDayOfInterval,
} from 'date-fns';
import { useCalendar } from '../context/CalendarContext';

// ─── Tag detection — LOGIC UNCHANGED ──────────────────────────────────────────
const getEventTag = (event) => {
  const t = event.summary || '';
  const d = event.description || '';
  if (t.includes('[DUE]')     || d.includes('ASSIGNMENT DEADLINE')) return 'DUE';
  if (t.includes('[STUDY]')   || d.includes('STUDY SESSION'))       return 'STUDY';
  if (t.includes('[PROJECT]') || d.includes('Project Activity'))    return 'PROJECT';
  if (t.includes('[CLUB]')    || d.includes('Club Activity'))       return 'CLUB';
  if (t.includes('[FEST]')    || d.includes('CAMPUS EVENT'))        return 'FEST';
  if (t.includes('[EVENT]'))                                         return 'EVENT';
  return 'OTHER';
};

// Visual styles — dot colors stay vibrant (they ARE the accent)
const TAG_STYLE = {
  DUE:     { dot: 'bg-rose-500',    badge: 'bg-rose-100 text-rose-600 border-rose-200',       label: 'Deadline',  icon: <FileText className="w-3 h-3" /> },
  STUDY:   { dot: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-600 border-indigo-200', label: 'Study',     icon: <BookOpen className="w-3 h-3" /> },
  PROJECT: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-600 border-emerald-200', label: 'Project', icon: <Briefcase className="w-3 h-3" /> },
  CLUB:    { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-600 border-emerald-200', label: 'Club',    icon: <Briefcase className="w-3 h-3" /> },
  FEST:    { dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-600 border-amber-200',    label: 'Fest',      icon: <Zap className="w-3 h-3" /> },
  EVENT:   { dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-600 border-amber-200',    label: 'Event',     icon: <Zap className="w-3 h-3" /> },
  OTHER:   { dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-500 border-slate-200',    label: 'Event',     icon: <CalendarDays className="w-3 h-3" /> },
};

const STRIP_PREFIXES = ['[DUE]', '[STUDY]', '[PROJECT]', '[CLUB]', '[FEST]', '[EVENT]'];
const stripTitle = (t) => {
  let s = t;
  STRIP_PREFIXES.forEach((p) => { s = s.replace(p, ''); });
  return s.trim();
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getEventDateStr(event) {
  const raw = event.start?.dateTime || event.start?.date;
  if (!raw) return null;
  return raw.split('T')[0];
}

function formatEventTime(event) {
  const raw = event.start?.dateTime;
  if (!raw) return 'All day';
  try { return format(parseISO(raw), 'h:mm a'); } catch { return ''; }
}

export default function CalendarModal({ isOpen, onClose, onAddEvent }) {
  const { events } = useCalendar();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // ── Escape key + reset — LOGIC UNCHANGED ──────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setCurrentMonth(new Date());
      setSelectedDate(null);
    }
  }, [isOpen]);

  // ── Build calendar grid — LOGIC UNCHANGED ─────────────────────────────────
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd   = endOfMonth(currentMonth);
    const gridStart  = startOfWeek(monthStart);
    const gridEnd    = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // ── Event lookup by day — LOGIC UNCHANGED ─────────────────────────────────
  const eventsByDateStr = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const ds = getEventDateStr(ev);
      if (!ds) return;
      if (!map[ds]) map[ds] = [];
      map[ds].push(ev);
    });
    return map;
  }, [events]);

  const eventsOnDay = useCallback(
    (day) => eventsByDateStr[format(day, 'yyyy-MM-dd')] || [],
    [eventsByDateStr]
  );

  // ── Unique dot types per day — LOGIC UNCHANGED ────────────────────────────
  const dotsForDay = useCallback((day) => {
    const dayEvents = eventsOnDay(day);
    const seen = new Set();
    const dots = [];
    for (const ev of dayEvents) {
      const tag    = getEventTag(ev);
      const dotKey = tag === 'CLUB' ? 'PROJECT' : tag === 'EVENT' ? 'FEST' : tag;
      if (!seen.has(dotKey)) { seen.add(dotKey); dots.push(dotKey); }
      if (dots.length === 4) break;
    }
    return dots;
  }, [eventsOnDay]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsOnDay(selectedDate);
  }, [selectedDate, eventsOnDay]);

  if (!isOpen) return null;

  const prevMonth = () => { setCurrentMonth((m) => subMonths(m, 1)); setSelectedDate(null); };
  const nextMonth = () => { setCurrentMonth((m) => addMonths(m, 1)); setSelectedDate(null); };
  const goToday   = () => { setCurrentMonth(new Date()); setSelectedDate(new Date()); };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-600/25 backdrop-blur-sm px-4 py-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-5xl neu-modal rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200/60 flex-shrink-0 bg-neu-dark/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center shadow-neu-xs">
              <CalendarCheck className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Calendar View</h2>
              <p className="text-[11px] text-slate-400">Your events at a glance</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-xl neu-btn text-slate-500 hover:text-slate-700">
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="min-w-[130px] text-center text-sm font-bold text-slate-800">
              {format(currentMonth, 'MMMM yyyy')}
            </span>

            <button onClick={nextMonth} className="p-2 rounded-xl neu-btn text-slate-500 hover:text-slate-700">
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={goToday}
              className="px-3 py-1.5 rounded-xl neu-pressed text-teal-700 text-xs font-bold hover:text-teal-800 transition-colors"
            >
              Today
            </button>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <button onClick={onClose} className="p-2 rounded-xl neu-btn text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Main: Grid + Detail Panel ── */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

          {/* ── Calendar Grid ── */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isCurrentDay   = isToday(day);
                const isSelected     = selectedDate ? isSameDay(day, selectedDate) : false;
                const dots           = dotsForDay(day);
                const dayEvents      = eventsOnDay(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(isSameDay(day, selectedDate) ? null : day)}
                    className={`
                      relative flex flex-col items-center rounded-xl p-1.5 sm:p-2 min-h-[54px] sm:min-h-[66px]
                      transition-all duration-150
                      ${!isCurrentMonth ? 'opacity-30' : ''}
                      ${isSelected
                        ? 'neu-pressed ring-2 ring-teal-400/60'
                        : 'neu-inset hover:shadow-neu-xs'
                      }
                    `}
                  >
                    {/* Day number */}
                    <span className={`
                      text-xs sm:text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                      ${isCurrentDay
                        ? 'bg-teal-500 text-white shadow-[0_2px_8px_rgba(20,184,166,0.4)]'
                        : isSelected
                        ? 'text-teal-700'
                        : 'text-slate-600'
                      }
                    `}>
                      {format(day, 'd')}
                    </span>

                    {/* Event dots */}
                    {dots.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
                        {dots.map((tag) => (
                          <span
                            key={tag}
                            className={`w-1.5 h-1.5 rounded-full ${TAG_STYLE[tag]?.dot || 'bg-slate-400'}`}
                          />
                        ))}
                        {dayEvents.length > dots.length && (
                          <span className="text-[9px] text-slate-400 font-bold">+{dayEvents.length - dots.length}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Dot legend */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-200/60">
              {[
                { dot: 'bg-rose-500',    label: 'Assignment' },
                { dot: 'bg-indigo-500',  label: 'Study' },
                { dot: 'bg-emerald-500', label: 'Project/Club' },
                { dot: 'bg-amber-500',   label: 'Fest/Event' },
              ].map(({ dot, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  {label}
                </div>
              ))}
              <span className="ml-auto text-[11px] text-slate-400">{events.length} total events</span>
            </div>
          </div>

          {/* ── Day Detail Panel ── */}
          <div
            className={`border-t lg:border-t-0 lg:border-l border-slate-200/60 flex flex-col transition-all duration-300
              ${selectedDate ? 'lg:w-72 xl:w-80' : 'lg:w-0 overflow-hidden'}`}
          >
            {selectedDate && (
              <div className="flex flex-col h-full min-w-[17rem] xl:min-w-[18rem]">
                {/* Panel header */}
                <div className="px-4 py-4 border-b border-slate-200/60 bg-neu-dark/20 flex-shrink-0">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                    {isToday(selectedDate) ? '📍 Today' : format(selectedDate, 'EEEE')}
                  </p>
                  <p className="text-lg font-bold text-slate-800">
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {selectedDayEvents.length === 0
                      ? 'No events scheduled'
                      : `${selectedDayEvents.length} event${selectedDayEvents.length > 1 ? 's' : ''}`}
                  </p>
                </div>

                {/* Event list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {selectedDayEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <CalendarDays className="w-10 h-10 text-slate-300 mb-3" />
                      <p className="text-xs text-slate-400">Nothing scheduled</p>
                      <p className="text-[11px] text-slate-300 mt-1">Tap below to add an event</p>
                    </div>
                  ) : (
                    selectedDayEvents.map((ev) => {
                      const tag   = getEventTag(ev);
                      const style = TAG_STYLE[tag] || TAG_STYLE.OTHER;
                      return (
                        <div key={ev.id} className="rounded-xl neu-inset p-3 hover:shadow-neu-xs transition-all">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.badge}`}>
                              {style.icon}
                              {style.label}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 leading-snug">
                            {stripTitle(ev.summary || 'Untitled')}
                          </p>
                          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            {formatEventTime(ev)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add event */}
                <div className="p-3 border-t border-slate-200/60 flex-shrink-0">
                  <button
                    onClick={onAddEvent}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-xs bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_4px_14px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)] hover:scale-[1.02] active:scale-[0.97] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    Add Event
                  </button>
                </div>
              </div>
            )}

            {/* Empty placeholder (desktop, no day selected) */}
            {!selectedDate && (
              <div className="hidden lg:flex flex-col items-center justify-center h-full p-8 text-center min-w-[12rem]">
                <CalendarDays className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-xs text-slate-400 font-semibold">Select a date</p>
                <p className="text-[11px] text-slate-300 mt-1">to see your events</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
