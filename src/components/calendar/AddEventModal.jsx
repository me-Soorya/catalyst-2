import React, { useState, useEffect } from 'react';
import {
  X, FileText, BookOpen, Clock, Plus, Loader2, Sparkles,
  Flag, Briefcase, Users, Zap, Calendar as CalendarIcon,
  MapPin, Link as LinkIcon, ChevronDown,
} from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { toDateTimeLocalString } from '../../utils/dateUtils';
import { addHours, addMinutes, setHours, setMinutes, addDays } from 'date-fns';

// ─── Preset chip data for College Fest tab ────────────────────────────────────
const FEST_PRESETS = [
  { emoji: '🚀', label: 'TechFest', title: "TechFest '26", category: 'techfest', venue: 'Main Auditorium' },
  { emoji: '🎨', label: 'ArtsFest', title: "ArtsFest '26", category: 'arts', venue: 'Open Air Theatre' },
  { emoji: '💻', label: 'Hackathon', title: "HackCatalyst '26", category: 'techfest', venue: 'Innovation Lab' },
];

const FEST_CATEGORIES = [
  { value: 'techfest', label: 'Tech Fest' },
  { value: 'arts', label: 'Arts & Cultural' },
  { value: 'club', label: 'Club' },
  { value: 'other', label: 'Other' },
];

// Maps fest category → whether it's a [FEST] or [EVENT] prefix
const getFestPrefix = (category) =>
  ['club', 'other'].includes(category) ? '[EVENT]' : '[FEST]';

// Maps fest category → Google Calendar colorId
const getFestColorId = (category) =>
  ['club', 'other'].includes(category) ? '3' : '5';

export default function AddEventModal({ isOpen, onClose }) {
  const { addEvent, showToast } = useCalendar();

  // ── Top-level tab ─────────────────────────────────────────────────────────
  // 'academics' | 'project' | 'fest'
  const [eventType, setEventType] = useState('academics');

  // ── Academics sub-toggle ──────────────────────────────────────────────────
  // 'assignment' | 'study'
  const [academicMode, setAcademicMode] = useState('assignment');

  // ── Shared ────────────────────────────────────────────────────────────────
  const [subject, setSubject] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Assignment fields ─────────────────────────────────────────────────────
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [portalLink, setPortalLink] = useState('');

  // ── Study fields ──────────────────────────────────────────────────────────
  const [focusTopic, setFocusTopic] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [studyNotes, setStudyNotes] = useState('');

  // ── Project / Club fields ─────────────────────────────────────────────────
  const [projectTitle, setProjectTitle] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [projectCategory, setProjectCategory] = useState('project'); // 'project' | 'club'

  // ── College Fest fields ───────────────────────────────────────────────────
  const [festTitle, setFestTitle] = useState('');
  const [festCategory, setFestCategory] = useState('techfest');
  const [festVenue, setFestVenue] = useState('');
  const [festDetails, setFestDetails] = useState('');
  const [festAllDay, setFestAllDay] = useState(false);
  const [festAllDayDate, setFestAllDayDate] = useState('');
  const [festStartDate, setFestStartDate] = useState('');
  const [festEndDate, setFestEndDate] = useState('');

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const now = new Date();

      // Default due date: tonight 11:59 PM
      const tonight1159 = setMinutes(setHours(now, 23), 59);
      setDueDate(toDateTimeLocalString(tonight1159));

      // Default study/project start = rounded up to next 30m, end = +1h
      const remainder = 30 - (now.getMinutes() % 30);
      const start = addMinutes(now, remainder);
      const end = addHours(start, 1);
      setStartDateTime(toDateTimeLocalString(start));
      setEndDateTime(toDateTimeLocalString(end));

      // Fest defaults
      setFestStartDate(toDateTimeLocalString(start));
      setFestEndDate(toDateTimeLocalString(addHours(start, 3)));

      // Reset all fields
      setEventType('academics');
      setAcademicMode('assignment');
      setSubject('');
      setAssignmentTitle('');
      setPriority('Medium');
      setPortalLink('');
      setFocusTopic('');
      setStudyNotes('');
      setProjectTitle('');
      setProjectNotes('');
      setProjectCategory('project');
      setFestTitle('');
      setFestCategory('techfest');
      setFestVenue('');
      setFestDetails('');
      setFestAllDay(false);
      setFestAllDayDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Quick preset helpers ──────────────────────────────────────────────────
  const setAssignmentPreset = (type) => {
    const now = new Date();
    if (type === 'tonight') {
      setDueDate(toDateTimeLocalString(setMinutes(setHours(now, 23), 59)));
    } else if (type === 'tomorrow') {
      setDueDate(toDateTimeLocalString(setMinutes(setHours(addDays(now, 1), 23), 59)));
    } else if (type === '3days') {
      setDueDate(toDateTimeLocalString(setMinutes(setHours(addDays(now, 3), 23), 59)));
    }
  };

  const setDurationPreset = (hours, setEnd = setEndDateTime, getStart = () => startDateTime) => {
    const s = getStart();
    if (!s) return;
    try {
      setEnd(toDateTimeLocalString(addHours(new Date(s), hours)));
    } catch (err) {
      console.error(err);
    }
  };

  const setTonightPreset = (setEnd) => {
    setEnd(toDateTimeLocalString(setMinutes(setHours(new Date(), 23), 59)));
  };

  const applyFestPreset = (preset) => {
    setFestTitle(preset.title);
    setFestCategory(preset.category);
    setFestVenue(preset.venue);
  };

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (eventType === 'academics') {
        if (!subject.trim()) {
          showToast('Please enter a course or subject name', 'error');
          return;
        }

        if (academicMode === 'assignment') {
          if (!assignmentTitle.trim()) { showToast('Please enter an assignment title', 'error'); return; }
          if (!dueDate) { showToast('Please select a due date and time', 'error'); return; }

          const dueDateObj = new Date(dueDate);
          const startObj = addMinutes(dueDateObj, -30);
          const summary = `[DUE] ${subject.trim().toUpperCase()}: ${assignmentTitle.trim()}`;
          const description = `📌 ASSIGNMENT DEADLINE\nPriority: ${priority}\nSubject: ${subject.trim()}${portalLink ? `\nSubmission Link: ${portalLink.trim()}` : ''}`;

          await addEvent({
            title: summary,
            description,
            startDateTime: startObj.toISOString(),
            endDateTime: dueDateObj.toISOString(),
            colorId: priority === 'High' ? '11' : priority === 'Medium' ? '5' : '9',
          });

        } else {
          // Study session
          if (!focusTopic.trim()) { showToast('Please enter a focus topic', 'error'); return; }
          if (!startDateTime || !endDateTime) { showToast('Please select valid start and end times', 'error'); return; }
          if (new Date(endDateTime) <= new Date(startDateTime)) { showToast('End time must be after start time', 'error'); return; }

          const summary = `[STUDY] ${subject.trim().toUpperCase()}: ${focusTopic.trim()}`;
          const description = `⚡ STUDY SESSION\nSubject: ${subject.trim()}\nFocus: ${focusTopic.trim()}${studyNotes ? `\nNotes: ${studyNotes.trim()}` : ''}`;

          await addEvent({
            title: summary,
            description,
            startDateTime,
            endDateTime,
            colorId: '7',
          });
        }

      } else if (eventType === 'project') {
        if (!subject.trim()) { showToast('Please enter an organization or project name', 'error'); return; }
        if (!projectTitle.trim()) { showToast('Please enter a task or meeting title', 'error'); return; }
        if (!startDateTime || !endDateTime) { showToast('Please select valid start and end times', 'error'); return; }
        if (new Date(endDateTime) <= new Date(startDateTime)) { showToast('End time must be after start time', 'error'); return; }

        const prefix = projectCategory === 'club' ? '[CLUB]' : '[PROJECT]';
        const summary = `${prefix} ${subject.trim().toUpperCase()} - ${projectTitle.trim()}`;
        const description = `✨ ${projectCategory === 'club' ? 'Club' : 'Project'} Activity\nOrganization/Project: ${subject.trim()}\nTask: ${projectTitle.trim()}${projectNotes ? `\nNotes / Link: ${projectNotes.trim()}` : ''}`;

        await addEvent({
          title: summary,
          description,
          startDateTime,
          endDateTime,
          colorId: projectCategory === 'club' ? '6' : '2',
        });

      } else {
        // College Fest
        if (!festTitle.trim()) { showToast('Please enter an event title', 'error'); return; }
        if (festAllDay && !festAllDayDate) {
          showToast('Please select an event date', 'error'); return;
        }
        if (!festAllDay && (!festStartDate || !festEndDate)) {
          showToast('Please select start and end date/time', 'error'); return;
        }
        if (!festAllDay && new Date(festEndDate) <= new Date(festStartDate)) {
          showToast('End time must be after start time', 'error'); return;
        }

        const prefix = getFestPrefix(festCategory);
        const summary = `${prefix} ${festTitle.trim()}${festVenue ? ` - ${festVenue.trim()}` : ''}`;
        const categoryLabel = FEST_CATEGORIES.find((c) => c.value === festCategory)?.label || festCategory;
        const description = `🎉 CAMPUS EVENT\nCategory: ${categoryLabel}${festVenue ? `\nVenue: ${festVenue.trim()}` : ''}${festDetails ? `\nDetails / Link: ${festDetails.trim()}` : ''}`;

        const payload = {
          title: summary,
          description,
          colorId: getFestColorId(festCategory),
        };

        if (festAllDay) {
          // All-day events: use the user-selected date
          payload.startDateTime = new Date(festAllDayDate).toISOString();
          payload.endDateTime = new Date(festAllDayDate).toISOString();
          payload.allDay = true;
        } else {
          payload.startDateTime = festStartDate;
          payload.endDateTime = festEndDate;
        }

        await addEvent(payload);
      }

      onClose();
    } catch (err) {
      // Toast handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived accent helpers for button / border theming ────────────────────
  const tabAccent = eventType === 'academics'
    ? (academicMode === 'assignment' ? 'rose' : 'cyan')
    : eventType === 'project'
      ? 'emerald'
      : 'amber';

  const submitGradient =
    eventType === 'academics' && academicMode === 'assignment'
      ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-slate-950 shadow-rose-500/20'
      : eventType === 'academics' && academicMode === 'study'
        ? 'bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-500 text-slate-950 shadow-teal-500/25'
        : eventType === 'project'
          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 shadow-emerald-500/25'
          : 'bg-gradient-to-r from-amber-500 via-orange-500 to-violet-600 text-slate-950 shadow-amber-500/25';

  const inputFocus =
    eventType === 'academics' && academicMode === 'assignment' ? 'focus:border-rose-400'
      : eventType === 'academics' && academicMode === 'study' ? 'focus:border-cyan-400'
        : eventType === 'project' ? 'focus:border-emerald-400'
          : 'focus:border-amber-400';

  const presetHover =
    eventType === 'academics' && academicMode === 'assignment'
      ? 'hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300'
      : eventType === 'academics' && academicMode === 'study'
        ? 'hover:bg-cyan-500/20 hover:border-cyan-500/40 hover:text-cyan-300'
        : eventType === 'project'
          ? 'hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-300'
          : 'hover:bg-amber-500/20 hover:border-amber-500/40 hover:text-amber-300';

  // Neumorphic input classes
  const baseInputClass = `w-full px-4 py-2.5 rounded-xl neu-inset text-xs text-slate-700 placeholder-slate-400 outline-none border-0 bg-transparent transition-all`;
  const baseDateClass  = `w-full px-3 py-2 rounded-xl neu-inset text-xs text-slate-700 outline-none border-0 bg-transparent transition-all`;
  const presetBtnClass = `px-3 py-1.5 rounded-xl neu-btn text-xs font-semibold text-slate-500 hover:text-slate-700 transition-all`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-600/25 backdrop-blur-sm px-4 py-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl neu-modal flex flex-col max-h-[92vh]">

        {/* ── Modal Header ── */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/60 px-6 py-5 flex-shrink-0 bg-neu-dark/20">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Quick Add</p>
            <h2 className="mt-1 text-lg font-bold text-slate-800">Add Calendar Event</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Assignments, study sessions, projects, clubs &amp; campus fests.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-slate-400 hover:text-slate-700 neu-btn flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="px-6 py-6 overflow-y-auto flex-1">

          {/* ── 3 Main Tabs ── */}
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl neu-inset mb-6">
            <button
              type="button"
              onClick={() => setEventType('academics')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                eventType === 'academics'
                  ? academicMode === 'assignment'
                    ? 'neu-pressed text-rose-600'
                    : 'neu-pressed text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Academics</span>
            </button>

            <button
              type="button"
              onClick={() => setEventType('project')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                eventType === 'project'
                  ? 'neu-pressed text-emerald-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Project / Club</span>
            </button>

            <button
              type="button"
              onClick={() => setEventType('fest')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                eventType === 'fest'
                  ? 'neu-pressed text-amber-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>College Fest</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ════════════════════════════════════════════════════════════════
                TAB 1: ACADEMICS
            ════════════════════════════════════════════════════════════════ */}
            {eventType === 'academics' && (
              <>
                {/* ── Academic Sub-Toggle (Assignment ↔ Study Session) ── */}
                <div className="flex items-center justify-center mb-1">
                  <div className="relative flex items-center neu-inset rounded-2xl p-1 gap-1">
                    {/* Sliding pill */}
                    <div
                      className={`absolute top-1 bottom-1 rounded-xl transition-all duration-300 ease-in-out neu-pressed ${
                        academicMode === 'assignment'
                          ? 'left-1 w-[calc(50%-4px)]'
                          : 'left-[calc(50%+0px)] w-[calc(50%-4px)]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setAcademicMode('assignment')}
                      className={`relative z-10 flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-colors duration-200 ${
                        academicMode === 'assignment' ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Assignment
                    </button>
                    <button
                      type="button"
                      onClick={() => setAcademicMode('study')}
                      className={`relative z-10 flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-colors duration-200 ${
                        academicMode === 'study' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Study Session
                    </button>
                  </div>
                </div>

                {/* ── Shared: Subject / Course ── */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    {academicMode === 'assignment' ? 'Course / Subject' : 'Subject'}
                    <span className="text-teal-400 ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      academicMode === 'assignment'
                        ? 'e.g. CS201, Physics, Organic Chem'
                        : 'e.g. Organic Chemistry, Operating Systems'
                    }
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={baseInputClass}
                  />
                </div>

                {/* ── ASSIGNMENT MODE ── */}
                {academicMode === 'assignment' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Assignment Title <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Lab Report 3, Problem Set 2"
                        value={assignmentTitle}
                        onChange={(e) => setAssignmentTitle(e.target.value)}
                        className={baseInputClass}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                          Priority Level
                        </label>
                        <div className="flex gap-1.5">
                          {['High', 'Medium', 'Low'].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setPriority(p)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                                priority === p
                                  ? p === 'High'
                                    ? 'neu-pressed text-rose-600'
                                    : p === 'Medium'
                                      ? 'neu-pressed text-amber-600'
                                      : 'neu-pressed text-teal-600'
                                  : 'neu-btn text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                          Due Date &amp; Time
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className={baseDateClass}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-400 mb-1.5">Quick Due Date Presets:</span>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setAssignmentPreset('tonight')} className={presetBtnClass}>Tonight @ 11:59 PM</button>
                        <button type="button" onClick={() => setAssignmentPreset('tomorrow')} className={presetBtnClass}>Tomorrow @ 11:59 PM</button>
                        <button type="button" onClick={() => setAssignmentPreset('3days')} className={presetBtnClass}>In 3 Days</button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Submission Link / Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Canvas link, Google Classroom URL, or notes"
                        value={portalLink}
                        onChange={(e) => setPortalLink(e.target.value)}
                        className={baseInputClass}
                      />
                    </div>
                  </>
                )}

                {/* ── STUDY SESSION MODE ── */}
                {academicMode === 'study' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Study Focus Topic <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Graph Algorithms, Chapter 4 Revision"
                        value={focusTopic}
                        onChange={(e) => setFocusTopic(e.target.value)}
                        className={baseInputClass}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Start Time</label>
                        <input
                          type="datetime-local"
                          required
                          value={startDateTime}
                          onChange={(e) => setStartDateTime(e.target.value)}
                          className={baseDateClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">End Time</label>
                        <input
                          type="datetime-local"
                          required
                          value={endDateTime}
                          onChange={(e) => setEndDateTime(e.target.value)}
                          className={baseDateClass}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-400 mb-1.5">Quick Duration Presets:</span>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setDurationPreset(1)} className={presetBtnClass}>1 Hour</button>
                        <button type="button" onClick={() => setDurationPreset(2)} className={presetBtnClass}>2 Hours</button>
                        <button type="button" onClick={() => setTonightPreset(setEndDateTime)} className={presetBtnClass}>Tonight @ 11:59 PM</button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Material / Checklist Notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Solve 5 practice problems, review lecture slides..."
                        value={studyNotes}
                        onChange={(e) => setStudyNotes(e.target.value)}
                        className={`${baseInputClass} resize-none`}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 2: PROJECT / CLUB
            ════════════════════════════════════════════════════════════════ */}
            {eventType === 'project' && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Organization / Project Name <span className="text-teal-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSI Chapter, Hackathon Team, Personal App"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={baseInputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Task / Meeting Title <span className="text-teal-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CSI Tech Sync, Sprint Review"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      className={baseInputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'project', label: 'Project', icon: <Briefcase className="w-3.5 h-3.5" /> },
                        { value: 'club', label: 'Club', icon: <Users className="w-3.5 h-3.5" /> },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setProjectCategory(opt.value)}
                          className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all border ${projectCategory === opt.value
                            ? opt.value === 'club'
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Start Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={startDateTime}
                      onChange={(e) => setStartDateTime(e.target.value)}
                      className={baseDateClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">End Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={endDateTime}
                      onChange={(e) => setEndDateTime(e.target.value)}
                      className={baseDateClass}
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-400 mb-1.5">Quick Duration Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setDurationPreset(1)} className={presetBtnClass}>1 Hour</button>
                    <button type="button" onClick={() => setDurationPreset(2)} className={presetBtnClass}>2 Hours</button>
                    <button type="button" onClick={() => setTonightPreset(setEndDateTime)} className={presetBtnClass}>Tonight @ 11:59 PM</button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Notes / Link
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Zoom link, GitHub repo, agenda notes..."
                    value={projectNotes}
                    onChange={(e) => setProjectNotes(e.target.value)}
                    className={`${baseInputClass} resize-none`}
                  />
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 3: COLLEGE FEST & EVENTS
            ════════════════════════════════════════════════════════════════ */}
            {eventType === 'fest' && (
              <>
                {/* Quick Preset Chips */}
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-amber-600/80 mb-2">
                    ⚡ Quick Preset
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {FEST_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyFestPreset(preset)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 text-xs font-bold transition-all hover:scale-[1.03] active:scale-[0.98] shadow-neu-xs"
                      >
                        <span className="text-sm">{preset.emoji}</span>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-slate-200/80" />

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Event Title <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TechFest '26 - Main Stage"
                    value={festTitle}
                    onChange={(e) => setFestTitle(e.target.value)}
                    className={baseInputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Event Category
                    </label>
                    <div className="relative">
                      <select
                        value={festCategory}
                        onChange={(e) => setFestCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl neu-inset text-xs text-slate-700 outline-none border-0 bg-transparent appearance-none"
                      >
                        {FEST_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value} className="bg-[#e0e8f0] text-slate-700">
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Venue / Location</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Main Auditorium, Open Air Theatre"
                      value={festVenue}
                      onChange={(e) => setFestVenue(e.target.value)}
                      className={baseInputClass}
                    />
                  </div>
                </div>

                {/* All-Day Toggle */}
                <div className="flex items-center justify-between rounded-xl neu-inset px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-600">All-Day Event</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Marks this as a full-day calendar event</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFestAllDay((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${festAllDay ? 'bg-amber-500' : 'bg-slate-700'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${festAllDay ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>

                {/* All-day date picker */}
                {festAllDay && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Event Date <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={festAllDayDate}
                      onChange={(e) => setFestAllDayDate(e.target.value)}
                      className={baseDateClass}
                    />
                  </div>
                )}

                {/* Date/Time pickers (shown when NOT all-day) */}
                {!festAllDay && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Start Date &amp; Time</label>
                        <input
                          type="datetime-local"
                          required
                          value={festStartDate}
                          onChange={(e) => setFestStartDate(e.target.value)}
                          className={baseDateClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">End Date &amp; Time</label>
                        <input
                          type="datetime-local"
                          required
                          value={festEndDate}
                          onChange={(e) => setFestEndDate(e.target.value)}
                          className={baseDateClass}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-slate-400 mb-1.5">Quick Duration Presets:</span>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setDurationPreset(1, setFestEndDate, () => festStartDate)} className={presetBtnClass}>1 Hour</button>
                        <button type="button" onClick={() => setDurationPreset(2, setFestEndDate, () => festStartDate)} className={presetBtnClass}>2 Hours</button>
                        <button type="button" onClick={() => setTonightPreset(setFestEndDate)} className={presetBtnClass}>Tonight @ 11:59 PM</button>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    <span className="flex items-center gap-1.5"><LinkIcon className="w-3 h-3" /> Event Details / Registration Link</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Registration link, event description, schedule..."
                    value={festDetails}
                    onChange={(e) => setFestDetails(e.target.value)}
                    className={`${baseInputClass} resize-none`}
                  />
                </div>

                {/* Prefix preview pill */}
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Will be tagged as:</span>
                  <span className={`px-2 py-0.5 rounded-lg font-bold text-[11px] shadow-neu-xs ${
                    getFestPrefix(festCategory) === '[FEST]'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-violet-100 text-violet-600'
                  }`}>
                    {getFestPrefix(festCategory)}
                  </span>
                </div>
              </>
            )}

            {/* ── Footer Actions ── */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl neu-btn text-slate-500 hover:text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_4px_16px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.5)] transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.97]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adding Event...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Save to Google Calendar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
