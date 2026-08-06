import React, { useState, useEffect } from 'react';
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

export default function PendingRadar() {
  const { accessToken } = useAuth();
  const { addEvent, ensureCalendarEventExists, events, showToast } = useCalendar();

  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [hiddenDeadlines, setHiddenDeadlines] = useState([]);
  const [courses, setCourses] = useState([]);

  const [loadingPending, setLoadingPending] = useState(true);
  const [isScanningAI, setIsScanningAI] = useState(false);

  // Edit / Confirm Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState(null);

  // Load pending assignments on mount or auth change
  useEffect(() => {
    async function loadRadarData() {
      setLoadingPending(true);
      try {
        const [courseList, pendingList] = await Promise.all([
          fetchEnrolledCourses(accessToken),
          fetchPendingStudentAssignments(accessToken),
        ]);
        setCourses(courseList);
        setPendingAssignments(pendingList);

        if (accessToken && pendingList.length > 0) {
          await syncClassroomAssignmentsToCalendar(pendingList, {
            ensureCalendarEventExists,
          });
        }
      } catch (err) {
        console.error('Failed to load pending assignments:', err);
        showToast('Error loading pending assignments', 'error');
      } finally {
        setLoadingPending(false);
      }
    }
    loadRadarData();
  }, [accessToken, ensureCalendarEventExists]);

  // Run AI scan on 2026 courses for hidden deadlines
  const handleRunAIScan = async () => {
    setIsScanningAI(true);
    showToast('Scanning 2026 course announcements & materials for hidden deadlines...', 'info');
    try {
      const results = await scan2026CoursesForHiddenDeadlines(
        accessToken,
        courses,
        pendingAssignments
      );
      setHiddenDeadlines(results);
      if (results.length > 0) {
        showToast(`AI Radar detected ${results.length} hidden assignment deadline(s)!`, 'success');
      } else {
        showToast('No new hidden deadlines detected in 2026 courses.', 'info');
      }
    } catch (err) {
      console.error('AI Scan error:', err);
      showToast('AI scanning encounter an issue', 'error');
    } finally {
      setIsScanningAI(false);
    }
  };

  // Confirm & Sync AI-detected hidden deadline to Google Calendar directly
  const handleConfirmAndSync = async (deadline) => {
    try {
      const startDateTime = deadline.dueDateISO || new Date().toISOString();
      const endDate = new Date(startDateTime);
      endDate.setHours(endDate.getHours() + 1);

      await addEvent({
        title: `[DUE] ${deadline.title} (${deadline.courseName})`,
        description: `Course: ${deadline.courseName}\nAI Extracted Summary: ${deadline.summary}\nSource Post: ${deadline.link}\n\n[Synced via Catalyst AI Hidden Deadline Radar]`,
        startDateTime,
        endDateTime: endDate.toISOString(),
        colorId: '11', // Red Tomato for due assignments
      });

      showToast(`Synced "${deadline.title}" to Google Calendar!`, 'success');
      // Dismiss from radar list after confirming
      setHiddenDeadlines((prev) => prev.filter((item) => item.id !== deadline.id));
    } catch (err) {
      console.error('Failed to sync to calendar:', err);
    }
  };

  // Edit action: open confirmation modal with prefilled task
  const handleOpenEdit = (deadline) => {
    setSelectedTaskToEdit({
      title: deadline.title,
      course: deadline.courseName,
      summary: deadline.summary,
      dueDateISO: deadline.dueDateISO,
      isAssignment: true,
    });
    setEditModalOpen(true);
    // Dismiss from radar after edit confirmation
    setHiddenDeadlines((prev) => prev.filter((item) => item.id !== deadline.id));
  };

  // Dismiss action
  const handleDismiss = (deadlineId) => {
    setHiddenDeadlines((prev) => prev.filter((item) => item.id !== deadlineId));
    showToast('Hidden deadline dismissed', 'info');
  };

  // Quick sync pending assignment to calendar
  const handleSyncPendingToCalendar = async (assignment) => {
    try {
      const startDateTime = assignment.dueDateISO || new Date().toISOString();
      const endDate = new Date(startDateTime);
      endDate.setHours(endDate.getHours() + 1);

      await addEvent({
        title: `[DUE] ${assignment.title} (${assignment.courseName})`,
        description: `Course: ${assignment.courseName}\nInstructions: ${assignment.description}\nDirect Submission Link: ${assignment.alternateLink}\n\n[Synced via Catalyst Pending Radar]`,
        startDateTime,
        endDateTime: endDate.toISOString(),
        colorId: '11',
      });

      showToast(`Added "${assignment.title}" to Google Calendar!`, 'success');
    } catch (err) {
      console.error('Error syncing assignment:', err);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 🤖 AI SCANNER BANNER: "Hidden Deadlines (Current Year 2026)" */}
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
              Scan plain-text announcements and course materials across active 2026 courses to surface implicit assignment deadlines (e.g. <em>"Submit draft next Wednesday at 5 PM"</em>).
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
        {hiddenDeadlines.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              AI Detected Hidden Deadlines ({hiddenDeadlines.length}) — Explicit Confirmation Required
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hiddenDeadlines.map((item) => (
                <div
                  key={item.id}
                  className="neu-card p-5 border-l-4 border-l-indigo-500 flex flex-col justify-between gap-4 bg-white/70"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-extrabold text-[10px]">
                        {item.courseName}
                      </span>
                      {item.hasDueDate && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" />
                          {new Date(item.dueDateISO).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{item.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.summary}</p>
                  </div>

                  {/* Confirmation Action Triggers */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/70 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleConfirmAndSync(item)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-neu-xs transition-all"
                        title="Confirm & Sync to Google Calendar"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm & Sync
                      </button>

                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl neu-btn text-slate-600 hover:text-indigo-600 font-bold text-[11px]"
                        title="Edit details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </div>

                    <button
                      onClick={() => handleDismiss(item.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                      title="Dismiss notification"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 🚨 FOCUS SECTION: "Pending Assignments" */}
      <div className="space-y-4">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h3 className="font-display font-extrabold text-xl text-slate-800 flex items-center gap-2">
              <span>🚨 Pending Assignments</span>
              <span className="px-2.5 py-0.5 rounded-xl neu-inset text-xs font-extrabold text-rose-600">
                {pendingAssignments.length} Active
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Unsubmitted coursework excluding turned-in and returned assignments.
            </p>
          </div>

          {/* Quick Refresh */}
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="neu-card neu-card-hover p-6 flex flex-col justify-between gap-4 relative overflow-hidden"
              >
                <div className="space-y-2">
                  
                  {/* Status Badges & Course Name */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-xl neu-inset text-[10px] font-extrabold uppercase text-slate-700">
                      {assignment.courseName}
                    </span>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                      assignment.assignmentStatus === '❌ Missing'
                        ? 'bg-rose-50 border border-rose-200 text-rose-700'
                        : assignment.assignmentStatus === '⚠️ No Due Date'
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                        : 'bg-amber-50 border border-amber-200 text-amber-700'
                    }`}>
                      {assignment.assignmentStatus === '❌ Missing' ? (
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      ) : assignment.assignmentStatus === '⚠️ No Due Date' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-indigo-500" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      {assignment.assignmentStatus || (assignment.hasNoDueDate ? '⚠️ No Due Date' : '⏳ Pending')}
                    </span>
                  </div>

                  {/* Assignment Title */}
                  <h4 className="font-display font-extrabold text-base text-slate-800 leading-snug">
                    {assignment.title}
                  </h4>

                  {/* Description / Instructions */}
                  {assignment.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {assignment.description}
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                  
                  {/* Direct Classroom Link */}
                  <a
                    href={assignment.alternateLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl neu-btn text-teal-700 hover:text-teal-900 font-bold transition-all"
                  >
                    <span>Open in Classroom</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>

                  {/* Quick Add to Calendar */}
                  <button
                    onClick={() => handleSyncPendingToCalendar(assignment)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold bg-indigo-600 hover:bg-indigo-700 shadow-neu-xs transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Sync to Calendar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation / Edit Modal */}
      <ConfirmTaskModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        extractedTask={selectedTaskToEdit}
        courseName={selectedTaskToEdit?.course}
      />
    </div>
  );
}
