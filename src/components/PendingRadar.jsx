import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Edit3,
  XCircle,
  RefreshCw,
  Search,
  BookOpen,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Moon,
  Ban,
  RotateCcw,
  CheckCheck,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCalendar } from '../context/CalendarContext';
import {
  fetchEnrolledCourses,
  fetchPendingStudentAssignments,
} from '../services/googleClassroom';
import { scan2026CoursesForHiddenDeadlines } from '../services/geminiExtractor';
import { syncClassroomAssignmentsToCalendar } from '../services/calendarSync';
import ConfirmTaskModal from './classroom/ConfirmTaskModal';
import {
  APPROVAL_STATES,
  APPROVAL_STATE_CONFIG,
  REJECTION_REASONS,
  useApprovalStore,
} from '../services/approvalStore';

// ─── Approval Filter Tabs ─────────────────────────────────────────────────────
const APPROVAL_FILTER_TABS = [
  { id: 'needs_review', label: 'Needs Review', icon: '⏳', state: APPROVAL_STATES.PENDING_REVIEW, activeClass: 'text-amber-700 neu-btn', dotClass: 'bg-amber-500' },
  { id: 'approved',     label: 'Approved',     icon: '✅', state: APPROVAL_STATES.APPROVED,        activeClass: 'text-emerald-700 neu-btn', dotClass: 'bg-emerald-500' },
  { id: 'snoozed',      label: 'Snoozed',      icon: '💤', state: APPROVAL_STATES.SNOOZED,          activeClass: 'text-purple-700 neu-btn', dotClass: 'bg-purple-500' },
  { id: 'rejected',     label: 'Rejected',     icon: '❌', state: APPROVAL_STATES.REJECTED,         activeClass: 'text-rose-700 neu-btn', dotClass: 'bg-rose-500' },
  { id: 'all',          label: 'All',          icon: '📋', state: null,                             activeClass: 'text-slate-700 neu-btn', dotClass: 'bg-slate-400' },
];

// ─── Approval State Badge Component ──────────────────────────────────────────
function ApprovalBadge({ state }) {
  const cfg = APPROVAL_STATE_CONFIG[state] || APPROVAL_STATE_CONFIG[APPROVAL_STATES.PENDING_REVIEW];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${cfg.badgeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Snooze countdown display ─────────────────────────────────────────────────
function SnoozeCountdown({ snoozeUntil }) {
  if (!snoozeUntil) return null;
  const until = new Date(snoozeUntil);
  const now = new Date();
  const diffMs = until - now;
  if (diffMs <= 0) return <span className="text-[10px] text-slate-400">Snooze expired</span>;
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
      <Moon className="w-3 h-3" />
      {diffHrs > 0 ? `${diffHrs}h ` : ''}{diffMins}m left
    </span>
  );
}

export default function PendingRadar() {
  const { accessToken } = useAuth();
  const { addEvent, ensureCalendarEventExists, events, showToast } = useCalendar();
  const { records, getStatus, getRecord, approve, reject, snooze, reset } = useApprovalStore();

  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [hiddenDeadlines, setHiddenDeadlines] = useState([]);
  const [courses, setCourses] = useState([]);

  const [loadingPending, setLoadingPending] = useState(true);
  const [isScanningAI, setIsScanningAI] = useState(false);

  // Approval filter tab
  const [approvalFilter, setApprovalFilter] = useState('needs_review');

  // Edit / Confirm Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState(null);

  // Quick reject dropdown: { [itemId]: boolean }
  const [rejectMenuOpen, setRejectMenuOpen] = useState({});

  // Load pending assignments on mount or auth change
  useEffect(() => {
    let isCancelled = false;

    async function loadRadarData() {
      setLoadingPending(true);
      try {
        const [courseList, pendingList] = await Promise.all([
          fetchEnrolledCourses(accessToken),
          fetchPendingStudentAssignments(accessToken),
        ]);

        if (isCancelled) return;
        setCourses(courseList);
        setPendingAssignments(pendingList);

        if (accessToken && pendingList.length > 0) {
          await syncClassroomAssignmentsToCalendar(pendingList, {
            ensureCalendarEventExists,
          });
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load pending assignments:', err);
          showToast('Error loading pending assignments', 'error');
        }
      } finally {
        if (!isCancelled) {
          setLoadingPending(false);
        }
      }
    }

    loadRadarData();
    return () => { isCancelled = true; };
  }, [accessToken]);

  // Run AI scan on 2026 courses for hidden deadlines
  const handleRunAIScan = async () => {
    setIsScanningAI(true);
    showToast('Scanning 2026 course announcements & materials for hidden deadlines...', 'info');
    try {
      const results = await scan2026CoursesForHiddenDeadlines(accessToken, courses, pendingAssignments);
      setHiddenDeadlines(results);
      if (results.length > 0) {
        showToast(`AI Radar detected ${results.length} hidden assignment deadline(s)!`, 'success');
      } else {
        showToast('No new hidden deadlines detected in 2026 courses.', 'info');
      }
    } catch (err) {
      console.error('AI Scan error:', err);
      showToast('AI scanning encountered an issue', 'error');
    } finally {
      setIsScanningAI(false);
    }
  };

  // Quick approve hidden deadline directly
  const handleApproveDeadline = async (deadline) => {
    try {
      const startDateTime = deadline.dueDateISO || new Date().toISOString();
      const endDate = new Date(startDateTime);
      endDate.setHours(endDate.getHours() + 1);

      const createdEvent = await addEvent({
        title: `[DUE] ${deadline.title} (${deadline.courseName})`,
        description: `Course: ${deadline.courseName}\nAI Extracted Summary: ${deadline.summary}\nSource Post: ${deadline.link}\n\n[Approved & Synced via Catalyst AI Approval Pipeline]`,
        startDateTime,
        endDateTime: endDate.toISOString(),
        colorId: '11',
      });

      approve(deadline.id, {
        calendarEventId: createdEvent?.id,
        calendarLink: createdEvent?.htmlLink,
        approvedDetails: { title: deadline.title, dueDate: startDateTime },
      });

      showToast(`✅ "${deadline.title}" approved and synced to Google Calendar!`, 'success');
    } catch (err) {
      console.error('Failed to approve & sync:', err);
    }
  };

  // Snooze a hidden deadline
  const handleSnoozeDeadline = (deadlineId, hours = 24) => {
    snooze(deadlineId, hours);
    showToast(`💤 Task snoozed for ${hours} hours`, 'info');
  };

  // Reject a hidden deadline with reason
  const handleRejectDeadline = (deadlineId, reason) => {
    reject(deadlineId, reason);
    setRejectMenuOpen((prev) => ({ ...prev, [deadlineId]: false }));
    showToast(`❌ Task rejected: "${reason}"`, 'info');
  };

  // Restore (reset) any item back to PENDING_REVIEW
  const handleRestoreItem = (itemId) => {
    reset(itemId);
    showToast('↩️ Task restored to "Needs Review"', 'info');
  };

  // Edit action: open confirmation modal
  const handleOpenEdit = (deadline) => {
    setSelectedTaskToEdit({
      id: deadline.id,
      sourceId: deadline.sourceId,
      title: deadline.title,
      course: deadline.courseName,
      summary: deadline.summary,
      dueDateISO: deadline.dueDateISO,
      isAssignment: true,
    });
    setEditModalOpen(true);
  };

  // Quick sync pending assignment to calendar and approve
  const handleSyncPendingToCalendar = async (assignment) => {
    try {
      const startDateTime = assignment.dueDateISO || new Date().toISOString();
      const endDate = new Date(startDateTime);
      endDate.setHours(endDate.getHours() + 1);

      const createdEvent = await addEvent({
        title: `[DUE] ${assignment.title} (${assignment.courseName})`,
        description: `Course: ${assignment.courseName}\nInstructions: ${assignment.description}\nDirect Submission Link: ${assignment.alternateLink}\n\n[Approved & Synced via Catalyst Pending Radar]`,
        startDateTime,
        endDateTime: endDate.toISOString(),
        colorId: '11',
      });

      approve(assignment.id, {
        calendarEventId: createdEvent?.id,
        calendarLink: createdEvent?.htmlLink,
      });

      showToast(`✅ "${assignment.title}" approved and added to Google Calendar!`, 'success');
    } catch (err) {
      console.error('Error syncing assignment:', err);
    }
  };

  // ─── Combine all items for approval pipeline ──────────────────────────────
  const allApprovalItems = useMemo(() => {
    const deadlineItems = hiddenDeadlines.map((d) => ({ ...d, _type: 'hidden', _id: d.id }));
    const assignmentItems = pendingAssignments.map((a) => ({ ...a, _type: 'pending', _id: a.id }));
    return [...deadlineItems, ...assignmentItems];
  }, [hiddenDeadlines, pendingAssignments]);

  // ─── Compute approval metrics ─────────────────────────────────────────────
  const metrics = useMemo(() => {
    const counts = { PENDING_REVIEW: 0, APPROVED: 0, SNOOZED: 0, REJECTED: 0 };
    allApprovalItems.forEach((item) => {
      const s = getStatus(item._id);
      if (counts[s] !== undefined) counts[s]++;
      else counts.PENDING_REVIEW++;
    });
    return counts;
  }, [allApprovalItems, records]);

  // ─── Filter items by approval tab ─────────────────────────────────────────
  const activeTabConfig = APPROVAL_FILTER_TABS.find((t) => t.id === approvalFilter);
  const filteredHiddenDeadlines = useMemo(() => {
    if (approvalFilter === 'all') return hiddenDeadlines;
    return hiddenDeadlines.filter((d) => {
      const s = getStatus(d.id);
      if (approvalFilter === 'needs_review') return s === APPROVAL_STATES.PENDING_REVIEW || s === APPROVAL_STATES.UNDER_REVIEW;
      return s === activeTabConfig?.state;
    });
  }, [hiddenDeadlines, approvalFilter, records]);

  const filteredPendingAssignments = useMemo(() => {
    if (approvalFilter === 'all') return pendingAssignments;
    return pendingAssignments.filter((a) => {
      const s = getStatus(a.id);
      if (approvalFilter === 'needs_review') return s === APPROVAL_STATES.PENDING_REVIEW || s === APPROVAL_STATES.UNDER_REVIEW;
      return s === activeTabConfig?.state;
    });
  }, [pendingAssignments, approvalFilter, records]);

  const totalFiltered = filteredHiddenDeadlines.length + filteredPendingAssignments.length;

  return (
    <div className="space-y-8">

      {/* ── APPROVAL PIPELINE HEADER ─────────────────────────────────────── */}
      <div className="neu-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full neu-inset text-indigo-700 text-[10px] font-extrabold uppercase tracking-widest">
                <Filter className="w-3.5 h-3.5" />
                Approval Pipeline
              </span>
            </div>
            <h2 className="font-display font-extrabold text-xl text-slate-800">Review & Approve Deadlines</h2>
            <p className="text-xs text-slate-500 mt-0.5">Track approval states for all AI-detected and pending deadlines</p>
          </div>

          {/* Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { label: 'Needs Review', count: metrics.PENDING_REVIEW, color: 'text-amber-600 bg-amber-50 border-amber-200' },
              { label: 'Approved',     count: metrics.APPROVED,       color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
              { label: 'Snoozed',      count: metrics.SNOOZED,        color: 'text-purple-700 bg-purple-50 border-purple-200' },
              { label: 'Rejected',     count: metrics.REJECTED,       color: 'text-rose-700 bg-rose-50 border-rose-200' },
            ].map((m) => (
              <div key={m.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold ${m.color}`}>
                <span className="text-base font-extrabold">{m.count}</span>
                <span className="text-[10px] uppercase tracking-wide">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl neu-inset flex-wrap">
          {APPROVAL_FILTER_TABS.map((tab) => {
            const count = tab.state === null
              ? allApprovalItems.length
              : allApprovalItems.filter((i) => {
                  const s = getStatus(i._id);
                  if (tab.id === 'needs_review') return s === APPROVAL_STATES.PENDING_REVIEW || s === APPROVAL_STATES.UNDER_REVIEW;
                  return s === tab.state;
                }).length;
            const isActive = approvalFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setApprovalFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive ? tab.activeClass : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                  isActive ? 'bg-slate-900/10 text-slate-800' : 'bg-slate-200 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🤖 AI SCANNER BANNER */}
      <div className="neu-card p-6 sm:p-8 relative overflow-hidden bg-gradient-to-br from-neu to-indigo-50/40">
        <div className="absolute -top-12 -right-12 w-56 h-56 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full neu-inset text-indigo-700 text-[10px] font-extrabold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-600" />
                Gemini 2.5 Flash AI Radar
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-teal-100 text-teal-800 text-[10px] font-extrabold uppercase">
                Academic Year 2026 · Semester S4
              </span>
            </div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-800 tracking-tight">
              Hidden Deadline Radar
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Scan plain-text announcements and course materials across active 2026 courses to surface implicit assignment deadlines.
            </p>
          </div>

          <button
            onClick={handleRunAIScan}
            disabled={isScanningAI}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-xs sm:text-sm bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex-shrink-0"
          >
            <Search className={`w-4 h-4 ${isScanningAI ? 'animate-spin' : ''}`} />
            <span>{isScanningAI ? 'Scanning 2026 Courses...' : '🔍 Scan 2026 Courses for Hidden Deadlines'}</span>
          </button>
        </div>

        {/* AI DETECTED CARDS */}
        {filteredHiddenDeadlines.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              AI Hidden Deadlines ({filteredHiddenDeadlines.length})
              {approvalFilter !== 'all' && (
                <ApprovalBadge state={activeTabConfig?.state || APPROVAL_STATES.PENDING_REVIEW} />
              )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHiddenDeadlines.map((item) => {
                const itemState = getStatus(item.id);
                const itemRecord = getRecord(item.id);
                const isApproved = itemState === APPROVAL_STATES.APPROVED;
                const isSnoozed = itemState === APPROVAL_STATES.SNOOZED;
                const isRejected = itemState === APPROVAL_STATES.REJECTED;
                const isPending = !isApproved && !isSnoozed && !isRejected;

                return (
                  <div
                    key={item.id}
                    className={`neu-card p-5 border-l-4 flex flex-col justify-between gap-4 bg-white/70 transition-all ${
                      isApproved ? 'border-l-emerald-500 opacity-90' :
                      isSnoozed  ? 'border-l-purple-400' :
                      isRejected ? 'border-l-rose-300 opacity-70' :
                      'border-l-indigo-500'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-extrabold text-[10px]">
                          {item.courseName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {item.hasDueDate && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3" />
                              {new Date(item.dueDateISO).toLocaleDateString()}
                            </span>
                          )}
                          <ApprovalBadge state={itemState} />
                        </div>
                      </div>

                      <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{item.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.summary}</p>

                      {/* Extra info for special states */}
                      {isSnoozed && itemRecord?.snoozeUntil && (
                        <SnoozeCountdown snoozeUntil={itemRecord.snoozeUntil} />
                      )}
                      {isRejected && itemRecord?.rejectionReason && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                          <Ban className="w-3 h-3" /> {itemRecord.rejectionReason}
                        </span>
                      )}
                      {isApproved && itemRecord?.calendarLink && (
                        <a
                          href={itemRecord.calendarLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-emerald-700 underline"
                        >
                          <Calendar className="w-3 h-3" /> View in Google Calendar
                        </a>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/70 text-xs">
                      {/* Restore action for non-pending states */}
                      {(isApproved || isSnoozed || isRejected) ? (
                        <button
                          onClick={() => handleRestoreItem(item.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl neu-btn text-slate-600 hover:text-indigo-600 font-bold text-[11px]"
                          title="Restore to Needs Review"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore to Review
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {/* Approve */}
                          <button
                            onClick={() => handleApproveDeadline(item)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-neu-xs transition-all"
                            title="Approve & Sync to Google Calendar"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </button>

                          {/* Edit / Full Review Modal */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl neu-btn text-slate-600 hover:text-indigo-600 font-bold text-[11px]"
                            title="Review & edit details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Review
                          </button>

                          {/* Snooze */}
                          <button
                            onClick={() => handleSnoozeDeadline(item.id, 24)}
                            className="p-1.5 rounded-xl neu-btn text-purple-500 hover:text-purple-700 transition-colors"
                            title="Snooze for 24 hours"
                          >
                            <Moon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Reject (only when pending) */}
                      {isPending && (
                        <div className="relative">
                          <button
                            onClick={() => setRejectMenuOpen((p) => ({ ...p, [item.id]: !p[item.id] }))}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>

                          {rejectMenuOpen[item.id] && (
                            <div className="absolute right-0 bottom-full mb-2 bg-white border border-slate-200 rounded-2xl shadow-neu-xl p-3 min-w-[200px] z-20">
                              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Rejection Reason</p>
                              {REJECTION_REASONS.map((reason) => (
                                <button
                                  key={reason}
                                  onClick={() => handleRejectDeadline(item.id, reason)}
                                  className="w-full text-left text-xs px-3 py-1.5 rounded-xl hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-medium transition-colors"
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state for AI section */}
        {hiddenDeadlines.length > 0 && filteredHiddenDeadlines.length === 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200/80 text-center">
            <p className="text-xs text-slate-400">No AI hidden deadlines in this filter.</p>
          </div>
        )}
      </div>

      {/* 🚨 FOCUS SECTION: Pending Assignments */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h3 className="font-display font-extrabold text-xl text-slate-800 flex items-center gap-2">
              <span>🚨 Pending Assignments</span>
              <span className="px-2.5 py-0.5 rounded-xl neu-inset text-xs font-extrabold text-rose-600">
                {pendingAssignments.length} Total
              </span>
              {filteredPendingAssignments.length !== pendingAssignments.length && (
                <span className="px-2.5 py-0.5 rounded-xl neu-inset text-xs font-extrabold text-amber-600">
                  {filteredPendingAssignments.length} Shown
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Unsubmitted coursework excluding turned-in and returned assignments.
            </p>
          </div>

          <button
            onClick={async () => {
              setLoadingPending(true);
              const data = await fetchPendingStudentAssignments(accessToken);
              setPendingAssignments(data);
              setLoadingPending(false);
              showToast('Pending assignments refreshed', 'info');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl neu-btn text-xs text-slate-600 font-bold self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPending ? 'animate-spin' : ''}`} />
            Refresh Radar
          </button>
        </div>

        {/* LIST OF PENDING ASSIGNMENTS */}
        {loadingPending ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="neu-card p-6 h-36 animate-pulse flex flex-col justify-between">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : pendingAssignments.length === 0 ? (
          <div className="neu-card p-12 text-center max-w-md mx-auto">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700">All Caught Up!</h4>
            <p className="text-xs text-slate-500 mt-1">No unsubmitted or pending coursework found.</p>
          </div>
        ) : filteredPendingAssignments.length === 0 ? (
          <div className="neu-card p-10 text-center max-w-md mx-auto">
            <CheckCheck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-600">No items in this filter</h4>
            <p className="text-xs text-slate-400 mt-1">Switch to another approval tab to see items.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPendingAssignments.map((assignment) => {
              const itemState = getStatus(assignment.id);
              const itemRecord = getRecord(assignment.id);
              const isApproved = itemState === APPROVAL_STATES.APPROVED;
              const isSnoozed = itemState === APPROVAL_STATES.SNOOZED;
              const isRejected = itemState === APPROVAL_STATES.REJECTED;
              const isPending = !isApproved && !isSnoozed && !isRejected;

              return (
                <div
                  key={assignment.id}
                  className={`neu-card neu-card-hover p-6 flex flex-col justify-between gap-4 relative overflow-hidden transition-all ${
                    isApproved ? 'opacity-90' : isRejected ? 'opacity-70' : ''
                  }`}
                >
                  <div className="space-y-2">
                    {/* Status Badges Row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-xl neu-inset text-[10px] font-extrabold uppercase text-slate-700">
                        {assignment.courseName}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Google Classroom status */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                          assignment.assignmentStatus === '❌ Missing'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : assignment.assignmentStatus === '⚠️ No Due Date'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          {assignment.assignmentStatus === '❌ Missing' ? (
                            <XCircle className="w-3 h-3" />
                          ) : assignment.assignmentStatus === '⚠️ No Due Date' ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {assignment.assignmentStatus || (assignment.hasNoDueDate ? '⚠️ No Due Date' : '⏳ Pending')}
                        </span>

                        {/* Approval state badge */}
                        <ApprovalBadge state={itemState} />
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="font-display font-extrabold text-base text-slate-800 leading-snug">
                      {assignment.title}
                    </h4>

                    {/* Description */}
                    {assignment.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {assignment.description}
                      </p>
                    )}

                    {/* State-specific info */}
                    {isSnoozed && itemRecord?.snoozeUntil && (
                      <SnoozeCountdown snoozeUntil={itemRecord.snoozeUntil} />
                    )}
                    {isRejected && itemRecord?.rejectionReason && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                        <Ban className="w-3 h-3" /> {itemRecord.rejectionReason}
                      </span>
                    )}
                    {isApproved && itemRecord?.calendarLink && (
                      <a
                        href={itemRecord.calendarLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-700 underline"
                      >
                        <Calendar className="w-3 h-3" /> View in Google Calendar
                      </a>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                    {/* Open in Classroom */}
                    <a
                      href={assignment.alternateLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl neu-btn text-teal-700 hover:text-teal-900 font-bold transition-all"
                    >
                      <span>Open in Classroom</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>

                    {/* Approval actions */}
                    {(isApproved || isSnoozed || isRejected) ? (
                      <button
                        onClick={() => handleRestoreItem(assignment.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl neu-btn text-slate-600 hover:text-indigo-700 font-bold"
                        title="Restore to Needs Review"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {/* Approve & Sync */}
                        <button
                          onClick={() => handleSyncPendingToCalendar(assignment)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold bg-emerald-600 hover:bg-emerald-700 shadow-neu-xs transition-all"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        {/* Snooze */}
                        <button
                          onClick={() => handleSnoozeDeadline(assignment.id, 24)}
                          className="p-2 rounded-xl neu-btn text-purple-500 hover:text-purple-700"
                          title="Snooze 24h"
                        >
                          <Moon className="w-3.5 h-3.5" />
                        </button>

                        {/* Reject */}
                        <div className="relative">
                          <button
                            onClick={() => setRejectMenuOpen((p) => ({ ...p, [assignment.id]: !p[assignment.id] }))}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>

                          {rejectMenuOpen[assignment.id] && (
                            <div className="absolute right-0 bottom-full mb-2 bg-white border border-slate-200 rounded-2xl shadow-neu-xl p-3 min-w-[200px] z-20">
                              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Rejection Reason</p>
                              {REJECTION_REASONS.map((reason) => (
                                <button
                                  key={reason}
                                  onClick={() => {
                                    reject(assignment.id, reason);
                                    setRejectMenuOpen((p) => ({ ...p, [assignment.id]: false }));
                                    showToast(`❌ Rejected: "${reason}"`, 'info');
                                  }}
                                  className="w-full text-left text-xs px-3 py-1.5 rounded-xl hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-medium transition-colors"
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation / Review Modal */}
      <ConfirmTaskModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        extractedTask={selectedTaskToEdit}
        courseName={selectedTaskToEdit?.course}
        onStateChange={(taskId, newState) => {
          // If approved via modal, keep in list but update badge
          console.log('Approval state changed:', taskId, newState);
        }}
      />
    </div>
  );
}
