import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, BookOpen, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';

export default function ConfirmTaskModal({ isOpen, onClose, extractedTask, courseName }) {
  const { addEvent, showToast } = useCalendar();
  const [title, setTitle] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [dueTimeStr, setDueTimeStr] = useState('23:59');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('[DUE]');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (extractedTask) {
      setTitle(extractedTask.title || 'New Assignment');
      setDescription(extractedTask.summary || '');
      setCategory(extractedTask.isAssignment ? '[DUE]' : '[STUDY]');

      if (extractedTask.dueDateISO) {
        const d = new Date(extractedTask.dueDateISO);
        if (!isNaN(d.getTime())) {
          const pad = (n) => String(n).padStart(2, '0');
          setDueDateStr(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          setDueTimeStr(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
        } else {
          setDueDateStr(new Date().toISOString().split('T')[0]);
        }
      } else {
        setDueDateStr(new Date().toISOString().split('T')[0]);
      }
    }
  }, [extractedTask]);

  if (!isOpen || !extractedTask) return null;

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dueDateStr) {
      showToast('Please specify title and valid date', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const startDateTime = `${dueDateStr}T${dueTimeStr || '23:59'}:00`;
      // End time 1 hour after start
      const endDate = new Date(startDateTime);
      endDate.setHours(endDate.getHours() + 1);

      const formattedTitle = `${category} ${title} (${courseName || extractedTask.course || 'Classroom'})`;
      const formattedDescription = `Course: ${courseName || extractedTask.course}\nAI Summary: ${description}\n\n[Detected & Synced via Catalyst AI Classroom Hub]`;

      await addEvent({
        title: formattedTitle,
        description: formattedDescription,
        startDateTime,
        endDateTime: endDate.toISOString(),
        colorId: category === '[DUE]' ? '11' : '5', // 11 is Red (Tomato), 5 is Yellow (Banana)
      });

      showToast('AI Task confirmed and added to Google Calendar!', 'success');
      onClose();
    } catch (err) {
      console.error('Failed to add confirmed task to Google Calendar:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-neu w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-neu-xl border border-white/60 relative overflow-hidden">
        
        {/* Decorative AI Glow header */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-300/30 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-neu-xs">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-lg text-slate-800">
                Confirm AI-Detected Task
              </h3>
              <p className="text-xs text-slate-400 font-medium">Review and customize before adding to Google Calendar</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl neu-btn text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm} className="space-y-4">
          
          {/* AI Badge info */}
          <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">AI Parser Verification:</span> Gemini detected an implicit deadline for{' '}
              <span className="font-semibold text-indigo-700">{courseName || extractedTask.course}</span>.
            </div>
          </div>

          {/* Title input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl neu-inset text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
              required
            />
          </div>

          {/* Category selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Category Tag
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl neu-inset text-slate-800 text-xs font-semibold focus:outline-none"
              >
                <option value="[DUE]">[DUE] Assignment Deadline</option>
                <option value="[STUDY]">[STUDY] Study Session</option>
                <option value="[PROJECT]">[PROJECT] Project Work</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Course
              </label>
              <div className="px-3 py-2.5 rounded-2xl neu-inset text-slate-700 text-xs font-bold truncate">
                {courseName || extractedTask.course}
              </div>
            </div>
          </div>

          {/* Date & Time picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due Date
              </label>
              <input
                type="date"
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl neu-inset text-slate-800 text-xs font-semibold focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Due Time
              </label>
              <input
                type="time"
                value={dueTimeStr}
                onChange={(e) => setDueTimeStr(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl neu-inset text-slate-800 text-xs font-semibold focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Instructions Summary */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Parsed Instructions & Summary
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl neu-inset text-slate-700 text-xs focus:outline-none resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl neu-btn text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-2xl text-white font-bold text-xs bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_4px_14px_rgba(99,102,241,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Sync to Calendar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
