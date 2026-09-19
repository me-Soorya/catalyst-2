import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, BookOpen, Sparkles, CheckCircle2, AlertCircle, Moon, Ban } from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import {
  APPROVAL_STATES,
  REJECTION_REASONS,
  useApprovalStore,
} from '../../services/approvalStore';

export default function ConfirmTaskModal({ isOpen, onClose, extractedTask, courseName, onStateChange }) {
  const { addEvent, showToast } = useCalendar();
  const { approve, reject, snooze, setUnderReview, reset } = useApprovalStore();

  const [title, setTitle] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [dueTimeStr, setDueTimeStr] = useState('23:59');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('[DUE]');
  const [submitting, setSubmitting] = useState(false);

  // Reject reason selection
  const [showRejectOptions, setShowRejectOptions] = useState(false);
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0]);
  const [customRejectNote, setCustomRejectNote] = useState('');

  const taskId = extractedTask?.id || extractedTask?.sourceId;

  useEffect(() => {
    if (isOpen && extractedTask) {
      setTitle(extractedTask.title || 'New Assignment');
      setDescription(extractedTask.summary || '');
      setCategory(extractedTask.isAssignment ? '[DUE]' : '[STUDY]');
      setShowRejectOptions(false);

      // Transition to UNDER_REVIEW state
      if (taskId) {
        setUnderReview(taskId);
      }

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
  }, [isOpen, extractedTask, taskId, setUnderReview]);

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
      const endDate = new Date(startDateTime);
      endDate.setHours(endDate.getHours() + 1);

      const formattedTitle = `${category} ${title} (${courseName || extractedTask.course || 'Classroom'})`;
      const formattedDescription = `Course: ${courseName || extractedTask.course}\nAI Summary: ${description}\n\n[Detected & Synced via Catalyst AI Approval Pipeline]`;

      const createdEvent = await addEvent({
        title: formattedTitle,
        description: formattedDescription,
        startDateTime,
        endDateTime: endDate.toISOString(),
        colorId: category === '[DUE]' ? '11' : '5',
      });

      // Update approval state to APPROVED
      if (taskId) {
        approve(taskId, {
          calendarEventId: createdEvent?.id,
          calendarLink: createdEvent?.htmlLink,
          approvedDetails: { title: formattedTitle, dueDate: startDateTime },
        });
        if (onStateChange) onStateChange(taskId, APPROVAL_STATES.APPROVED);
      }

      showToast('Task approved and synced to Google Calendar!', 'success');
      onClose();
    } catch (err) {
      console.error('Failed to add confirmed task to Google Calendar:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSnooze = (hours = 24) => {
    if (taskId) {
      snooze(taskId, hours);
      if (onStateChange) onStateChange(taskId, APPROVAL_STATES.SNOOZED);
      showToast(`Task snoozed for ${hours} hours. Moved to Snoozed tab.`, 'info');
    }
    onClose();
  };

  const handleReject = () => {
    if (taskId) {
      reject(taskId, rejectReason, customRejectNote);
      if (onStateChange) onStateChange(taskId, APPROVAL_STATES.REJECTED);
      showToast(`Task rejected: "${rejectReason}". Moved to Rejected tab.`, 'info');
    }
    onClose();
  };

  const handleCancel = () => {
    // If cancelling without decision, restore to PENDING_REVIEW
    if (taskId) {
      reset(taskId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-neu w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-neu-xl border border-white/60 relative overflow-hidden max-h-[90vh] overflow-y-auto">
        
        {/* Decorative AI Glow header */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-300/30 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-neu-xs">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-lg text-slate-800">
                  Review & Approve Task
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  Under Review
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Verify details before approving or deferring</p>
            </div>
          </div>

          <button
            onClick={handleCancel}
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
              <span className="font-bold">Approval Pipeline:</span> Gemini detected an implicit deadline for{' '}
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

          {/* Rejection Options Collapse */}
          {showRejectOptions && (
            <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  Select Rejection Reason
                </span>
                <button
                  type="button"
                  onClick={() => setShowRejectOptions(false)}
                  className="text-[11px] text-rose-500 hover:underline"
                >
                  Cancel Rejection
                </button>
              </div>

              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-slate-700 text-xs font-semibold focus:outline-none"
              >
                {REJECTION_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>

              {rejectReason === 'Other' && (
                <input
                  type="text"
                  placeholder="Optional custom reason..."
                  value={customRejectNote}
                  onChange={(e) => setCustomRejectNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-slate-700 text-xs focus:outline-none"
                />
              )}

              <button
                type="button"
                onClick={handleReject}
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                Confirm Rejection & Move to Rejected Tab
              </button>
            </div>
          )}

          {/* Meaningful State Action Buttons */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Secondary Actions: Snooze & Reject */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSnooze(24)}
                  className="px-3 py-2 rounded-xl neu-btn text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1.5"
                  title="Snooze review for 24 hours"
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Snooze 24h</span>
                </button>

                {!showRejectOptions && (
                  <button
                    type="button"
                    onClick={() => setShowRejectOptions(true)}
                    className="px-3 py-2 rounded-xl neu-btn text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1.5"
                    title="Reject or dismiss task"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                )}
              </div>

              {/* Primary Actions: Cancel & Approve */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl neu-btn text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-white font-bold text-xs bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-neu-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Sync</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

