import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus, Loader2 } from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { getDefaultFormTimes, toDateTimeLocalString } from '../../utils/dateUtils';
import { addMinutes } from 'date-fns';

export default function CreateEventModal({ isOpen, onClose }) {
  const { addEvent, showToast } = useCalendar();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [colorId, setColorId] = useState('9');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const { start, end } = getDefaultFormTimes();
      setStartDateTime(start);
      setEndDateTime(end);
      setTitle('');
      setDescription('');
      setColorId('9');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const applyPresetDuration = (minutes) => {
    if (!startDateTime) return;
    try {
      const startDate = new Date(startDateTime);
      const endDate = addMinutes(startDate, minutes);
      setEndDateTime(toDateTimeLocalString(endDate));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please enter a task title', 'error');
      return;
    }
    if (!startDateTime || !endDateTime) {
      showToast('Please select valid start and end times', 'error');
      return;
    }

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      showToast('End time must be after start time', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addEvent({
        title: title.trim(),
        description: description.trim(),
        startDateTime,
        endDateTime,
        colorId,
      });
      onClose();
    } catch (err) {
      // Handled by toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const colorOptions = [
    { id: '9', name: 'Turquoise / CS', bg: 'bg-teal-400' },
    { id: '5', name: 'Amber / Chem', bg: 'bg-amber-400' },
    { id: '10', name: 'Emerald / Math', bg: 'bg-emerald-400' },
    { id: '11', name: 'Coral / Revision', bg: 'bg-rose-400' },
    { id: '3', name: 'Cyan / General', bg: 'bg-cyan-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      
      {/* Modal Container */}
      <div className="glass-modal w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-teal-500/20">
        
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-teal-500/20 rounded-full blur-2xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-teal-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-slate-100">Add Study Session</h2>
              <p className="text-xs text-slate-400">Schedule task to Google Calendar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Title Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Task / Event Title <span className="text-teal-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Physics Chapter 3 Revision"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-400 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Date & Time Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Start Time
              </label>
              <input
                type="datetime-local"
                required
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-400 text-xs text-slate-100 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                End Time
              </label>
              <input
                type="datetime-local"
                required
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-400 text-xs text-slate-100 outline-none transition-all"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="block text-[11px] font-medium text-slate-400 mb-2">Quick Duration Presets:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '+30 mins', mins: 30 },
                { label: '+1 hour', mins: 60 },
                { label: '+2 hours', mins: 120 },
                { label: '+3 hours', mins: 180 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPresetDuration(p.mins)}
                  className="px-3 py-1 rounded-lg bg-slate-850 hover:bg-teal-500/20 border border-slate-700 hover:border-teal-500/40 text-xs text-slate-300 hover:text-teal-300 transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Color Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Category Tag
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorId(c.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    colorId === c.id
                      ? 'bg-slate-800 border-teal-400 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${c.bg}`}></span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Description / Notes Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Description & Notes
            </label>
            <textarea
              rows={3}
              placeholder="Add key goals, chapter topics, or study links..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-teal-400 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-teal-900/30">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Dispatching...</span>
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
  );
}
