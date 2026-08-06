import React, { useState } from 'react';
import {
  Clock, ExternalLink, Trash2, ChevronDown, ChevronUp,
  FileText, BookOpen, Briefcase, Users, Zap, CalendarDays,
} from 'lucide-react';
import { formatEventTimeRange, calculateDuration } from '../../utils/dateUtils';
import { useCalendar } from '../../context/CalendarContext';

// ─── Tag detection helpers ─────────────────────────────────────────────────────
// LOGIC UNCHANGED — only visual styling in TAG_META changes
const detectTag = (rawTitle = '', description = '') => {
  if (rawTitle.includes('[DUE]')     || description.includes('ASSIGNMENT DEADLINE')) return 'DUE';
  if (rawTitle.includes('[STUDY]')   || description.includes('STUDY SESSION'))       return 'STUDY';
  if (rawTitle.includes('[PROJECT]') || description.includes('Project Activity'))    return 'PROJECT';
  if (rawTitle.includes('[CLUB]')    || description.includes('Club Activity'))       return 'CLUB';
  if (rawTitle.includes('[FEST]')    || description.includes('CAMPUS EVENT'))        return 'FEST';
  if (rawTitle.includes('[EVENT]'))                                                   return 'EVENT';
  return 'OTHER';
};

const TAG_META = {
  DUE: {
    label: 'Deadline',
    icon: <FileText className="w-3 h-3 text-rose-500" />,
    badge: 'bg-rose-100 text-rose-600 border-rose-200',
    border: 'bg-gradient-to-b from-rose-500 via-pink-500 to-amber-500',
  },
  STUDY: {
    label: 'Study Session',
    icon: <BookOpen className="w-3 h-3 text-indigo-500" />,
    badge: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    border: 'bg-gradient-to-b from-indigo-400 via-violet-500 to-purple-500',
  },
  PROJECT: {
    label: 'Project',
    icon: <Briefcase className="w-3 h-3 text-emerald-500" />,
    badge: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    border: 'bg-gradient-to-b from-emerald-400 via-teal-500 to-cyan-500',
  },
  CLUB: {
    label: 'Club',
    icon: <Users className="w-3 h-3 text-emerald-500" />,
    badge: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    border: 'bg-gradient-to-b from-emerald-400 via-teal-500 to-cyan-500',
  },
  FEST: {
    label: 'College Fest',
    icon: <Zap className="w-3 h-3 text-amber-500" />,
    badge: 'bg-amber-100 text-amber-600 border-amber-200',
    border: 'bg-gradient-to-b from-amber-400 via-orange-400 to-yellow-400',
  },
  EVENT: {
    label: 'Campus Event',
    icon: <CalendarDays className="w-3 h-3 text-violet-500" />,
    badge: 'bg-violet-100 text-violet-600 border-violet-200',
    border: 'bg-gradient-to-b from-violet-400 via-purple-500 to-indigo-500',
  },
  OTHER: {
    label: 'Event',
    icon: <CalendarDays className="w-3 h-3 text-slate-400" />,
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
    border: 'bg-gradient-to-b from-slate-300 to-slate-400',
  },
};

// Strip all known prefixes from display title — LOGIC UNCHANGED
const PREFIXES = ['[DUE]', '[STUDY]', '[PROJECT]', '[CLUB]', '[FEST]', '[EVENT]'];
const stripPrefix = (title) => {
  let t = title;
  for (const p of PREFIXES) t = t.replace(p, '');
  return t.trim();
};

export default function EventCard({ event }) {
  const { removeEvent } = useCalendar();
  const [showNotes, setShowNotes] = useState(false);

  const rawTitle   = event.summary || 'Untitled Event';
  const description = event.description || '';

  const tag  = detectTag(rawTitle, description);
  const meta = TAG_META[tag];

  const displayTitle = stripPrefix(rawTitle);

  const startStr = event.start?.dateTime || event.start?.date;
  const endStr   = event.end?.dateTime   || event.end?.date;

  const { dateStr, timeStr, relativeBadge } = formatEventTimeRange(startStr, endStr);
  const duration = calculateDuration(startStr, endStr);

  return (
    <div className="neu-card-sm neu-card-hover relative group transition-all">
      {/* Vivid left accent border — kept as visual identity strip */}
      <div className={`absolute left-0 top-4 bottom-4 w-1.5 rounded-r-full ${meta.border}`} />

      <div className="p-5 pl-5">
        <div className="pl-2">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              {/* Type Badge */}
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full border flex items-center gap-1.5 ${meta.badge}`}>
                {meta.icon}
                <span>{meta.label}</span>
              </span>

              {/* Relative Time Pill */}
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-lg neu-inset text-slate-500">
                {relativeBadge}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {duration && (
                <span className="px-2 py-0.5 rounded-lg neu-inset text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-teal-500" />
                  {duration}
                </span>
              )}

              {event.htmlLink && (
                <a
                  href={event.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in Google Calendar"
                  className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg transition-colors neu-btn"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <button
                onClick={() => removeEvent(event.id)}
                title="Delete Event"
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors neu-btn opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-display font-bold text-lg text-slate-800 group-hover:text-teal-700 transition-colors leading-snug mb-1">
            {displayTitle}
          </h3>

          {/* Date & time */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-2">
            <span>{dateStr}</span>
            <span className="text-slate-300">•</span>
            <span className="text-teal-600 font-semibold">{timeStr}</span>
          </div>

          {/* Notes / Details Collapsible — LOGIC UNCHANGED */}
          {description && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-600 transition-colors font-medium"
              >
                {showNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showNotes ? 'Hide Details' : 'View Notes & Links'}</span>
              </button>

              {showNotes && (
                <div className="mt-2.5 p-3 rounded-xl neu-inset text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {description}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
