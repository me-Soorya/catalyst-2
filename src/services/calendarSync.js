import { format } from 'date-fns';

/**
 * Build a normalized event title for assignment due dates.
 */
export function buildAssignmentCalendarTitle(title, courseName) {
  return `[DUE] ${title}${courseName ? ` (${courseName})` : ''}`;
}

/**
 * Normalize a due date value into ISO string for recurring comparison.
 */
export function normalizeDueDateIso(dueDateISO) {
  if (!dueDateISO) return null;
  const date = new Date(dueDateISO);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Convert a classroom due date ISO string into a calendar event payload.
 */
export function buildCalendarEventForAssignment(assignment) {
  const startDateTime = normalizeDueDateIso(assignment.dueDateISO);
  if (!startDateTime) return null;

  const endDate = new Date(startDateTime);
  endDate.setHours(endDate.getHours() + 1);

  return {
    title: buildAssignmentCalendarTitle(assignment.title, assignment.courseName),
    description: `Course: ${assignment.courseName}\nInstructions: ${assignment.description || ''}\nLink: ${assignment.alternateLink || ''}\n\n[Auto-synced via Catalyst Classroom Assignment Sync]`,
    startDateTime,
    endDateTime: endDate.toISOString(),
    colorId: '11',
  };
}

/**
 * Deduplicate and auto-sync classroom assignments with valid due dates.
 */
export async function syncClassroomAssignmentsToCalendar(assignments, calendarActions) {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return [];
  }

  const synced = [];
  for (const assignment of assignments) {
    if (!assignment.dueDateISO) continue;
    const dueDate = new Date(assignment.dueDateISO);
    if (Number.isNaN(dueDate.getTime()) || dueDate <= new Date()) continue;

    const eventPayload = buildCalendarEventForAssignment(assignment);
    if (!eventPayload) continue;

    const createdEvent = await calendarActions.ensureCalendarEventExists(eventPayload, { silent: true });
    synced.push({ assignment, event: createdEvent });
  }

  return synced;
}
