import { useState, useEffect, useCallback } from 'react';

export const APPROVAL_STATES = {
  PENDING_REVIEW: 'PENDING_REVIEW', // ⏳ Needs Review
  UNDER_REVIEW: 'UNDER_REVIEW',     // 📝 Under Review
  APPROVED: 'APPROVED',             // ✅ Approved & Synced
  REJECTED: 'REJECTED',             // ❌ Rejected / Dismissed
  SNOOZED: 'SNOOZED',               // 💤 Snoozed / Deferred
};

export const APPROVAL_STATE_CONFIG = {
  [APPROVAL_STATES.PENDING_REVIEW]: {
    label: 'Needs Review',
    icon: '⏳',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
    description: 'Pending student review & approval',
  },
  [APPROVAL_STATES.UNDER_REVIEW]: {
    label: 'Under Review',
    icon: '📝',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    dotClass: 'bg-blue-500',
    description: 'Currently being reviewed or edited',
  },
  [APPROVAL_STATES.APPROVED]: {
    label: 'Approved & Synced',
    icon: '✅',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
    description: 'Approved and added to Google Calendar',
  },
  [APPROVAL_STATES.REJECTED]: {
    label: 'Rejected',
    icon: '❌',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    dotClass: 'bg-rose-500',
    description: 'Rejected or dismissed from schedule',
  },
  [APPROVAL_STATES.SNOOZED]: {
    label: 'Snoozed',
    icon: '💤',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    dotClass: 'bg-purple-500',
    description: 'Deferred for later review',
  },
};

export const REJECTION_REASONS = [
  'Not an assignment',
  'Duplicate or already tracked',
  'Already completed / turned in',
  'Irrelevant notice or announcement',
  'Optional / Not attending',
  'Other',
];

const STORAGE_KEY = 'catalyst_approval_records_v1';
const APPROVAL_EVENT_NAME = 'catalyst_approval_change';

/**
 * Load all approval records from localStorage.
 */
export function getAllApprovalRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse approval records from localStorage:', err);
    return {};
  }
}

/**
 * Save all approval records to localStorage and dispatch update event.
 */
function saveAllApprovalRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent(APPROVAL_EVENT_NAME, { detail: records }));
  } catch (err) {
    console.error('Failed to save approval records to localStorage:', err);
  }
}

/**
 * Get approval record for a specific task ID.
 * Returns default PENDING_REVIEW if not found or if snooze expired.
 */
export function getApprovalRecord(taskId) {
  if (!taskId) return null;
  const records = getAllApprovalRecords();
  const record = records[taskId];

  if (!record) {
    return {
      taskId,
      state: APPROVAL_STATES.PENDING_REVIEW,
      updatedAt: null,
    };
  }

  // Check if snooze has expired
  if (record.state === APPROVAL_STATES.SNOOZED && record.snoozeUntil) {
    if (new Date(record.snoozeUntil) <= new Date()) {
      // Auto-revert expired snooze to PENDING_REVIEW
      return {
        ...record,
        state: APPROVAL_STATES.PENDING_REVIEW,
        snoozeExpired: true,
      };
    }
  }

  return record;
}

/**
 * Update approval state for a task.
 */
export function setApprovalState(taskId, state, metadata = {}) {
  if (!taskId || !APPROVAL_STATES[state]) return;
  const records = getAllApprovalRecords();

  records[taskId] = {
    taskId,
    state,
    updatedAt: new Date().toISOString(),
    ...metadata,
  };

  saveAllApprovalRecords(records);
  return records[taskId];
}

/**
 * Mark a task as Approved.
 */
export function approveTask(taskId, { calendarEventId, calendarLink, approvedDetails } = {}) {
  return setApprovalState(taskId, APPROVAL_STATES.APPROVED, {
    calendarEventId,
    calendarLink,
    approvedDetails,
  });
}

/**
 * Mark a task as Rejected with an optional reason.
 */
export function rejectTask(taskId, reason = 'Not an assignment', customNotes = '') {
  return setApprovalState(taskId, APPROVAL_STATES.REJECTED, {
    rejectionReason: reason,
    rejectionNotes: customNotes,
  });
}

/**
 * Snooze a task for a specified duration in hours (default 24h).
 */
export function snoozeTask(taskId, hours = 24) {
  const snoozeUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  return setApprovalState(taskId, APPROVAL_STATES.SNOOZED, {
    snoozeUntil,
    snoozeHours: hours,
  });
}

/**
 * Reset / Restore task approval state back to PENDING_REVIEW.
 */
export function resetTaskApproval(taskId) {
  if (!taskId) return;
  const records = getAllApprovalRecords();
  delete records[taskId];
  saveAllApprovalRecords(records);
}

/**
 * React hook to access and manage approval states with reactive re-renders.
 */
export function useApprovalStore() {
  const [records, setRecords] = useState(() => getAllApprovalRecords());

  useEffect(() => {
    const handleUpdate = (e) => {
      setRecords(e.detail || getAllApprovalRecords());
    };

    window.addEventListener(APPROVAL_EVENT_NAME, handleUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        setRecords(getAllApprovalRecords());
      }
    });

    return () => {
      window.removeEventListener(APPROVAL_EVENT_NAME, handleUpdate);
    };
  }, []);

  const getStatus = useCallback(
    (taskId) => {
      if (!taskId) return APPROVAL_STATES.PENDING_REVIEW;
      const rec = records[taskId];
      if (!rec) return APPROVAL_STATES.PENDING_REVIEW;

      // Auto-expire snooze
      if (rec.state === APPROVAL_STATES.SNOOZED && rec.snoozeUntil) {
        if (new Date(rec.snoozeUntil) <= new Date()) {
          return APPROVAL_STATES.PENDING_REVIEW;
        }
      }
      return rec.state || APPROVAL_STATES.PENDING_REVIEW;
    },
    [records]
  );

  const getRecord = useCallback(
    (taskId) => {
      if (!taskId) return null;
      const rec = records[taskId];
      if (!rec) {
        return { taskId, state: APPROVAL_STATES.PENDING_REVIEW, updatedAt: null };
      }
      if (rec.state === APPROVAL_STATES.SNOOZED && rec.snoozeUntil) {
        if (new Date(rec.snoozeUntil) <= new Date()) {
          return { ...rec, state: APPROVAL_STATES.PENDING_REVIEW, snoozeExpired: true };
        }
      }
      return rec;
    },
    [records]
  );

  const approve = useCallback((taskId, meta) => approveTask(taskId, meta), []);
  const reject = useCallback((taskId, reason, notes) => rejectTask(taskId, reason, notes), []);
  const snooze = useCallback((taskId, hours) => snoozeTask(taskId, hours), []);
  const reset = useCallback((taskId) => resetTaskApproval(taskId), []);
  const setUnderReview = useCallback((taskId) => setApprovalState(taskId, APPROVAL_STATES.UNDER_REVIEW), []);

  return {
    records,
    getStatus,
    getRecord,
    approve,
    reject,
    snooze,
    reset,
    setUnderReview,
  };
}
