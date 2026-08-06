import { format, parseISO, isToday, isTomorrow, isThisWeek, differenceInMinutes, addHours, addMinutes } from 'date-fns';

/**
 * Formats a Google Calendar event date range nicely
 */
export function formatEventTimeRange(startStr, endStr) {
  if (!startStr) return { dateStr: 'No date', timeStr: 'All day', relativeBadge: 'Scheduled' };

  try {
    const startDate = typeof startStr === 'string' ? parseISO(startStr) : new Date(startStr);
    const endDate = endStr ? (typeof endStr === 'string' ? parseISO(endStr) : new Date(endStr)) : null;

    let relativeBadge = 'Upcoming';
    if (isToday(startDate)) {
      relativeBadge = 'Today';
    } else if (isTomorrow(startDate)) {
      relativeBadge = 'Tomorrow';
    } else if (isThisWeek(startDate)) {
      relativeBadge = format(startDate, 'EEEE'); // e.g. "Thursday"
    } else {
      relativeBadge = format(startDate, 'MMM d');
    }

    const dateStr = format(startDate, 'EEE, MMM d, yyyy');
    let timeStr = format(startDate, 'h:mm a');

    if (endDate) {
      timeStr += ` - ${format(endDate, 'h:mm a')}`;
    }

    return { dateStr, timeStr, relativeBadge };
  } catch (err) {
    return { dateStr: startStr, timeStr: '', relativeBadge: 'Scheduled' };
  }
}

/**
 * Calculates duration string (e.g. "1h 30m")
 */
export function calculateDuration(startStr, endStr) {
  if (!startStr || !endStr) return '';
  try {
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    const totalMinutes = Math.max(0, differenceInMinutes(end, start));
    
    if (totalMinutes === 0) return 'All Day';

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  } catch {
    return '';
  }
}

/**
 * Helper to get ISO string formatted for datetime-local input
 */
export function toDateTimeLocalString(date) {
  const d = new Date(date);
  const pad = (n) => (n < 10 ? '0' + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Generate default start and end times for form (start = now rounded to next 30m, end = +1 hour)
 */
export function getDefaultFormTimes() {
  const now = new Date();
  // Round to next 30 mins
  const remainder = 30 - (now.getMinutes() % 30);
  const start = addMinutes(now, remainder);
  const end = addHours(start, 1);

  return {
    start: toDateTimeLocalString(start),
    end: toDateTimeLocalString(end),
  };
}
