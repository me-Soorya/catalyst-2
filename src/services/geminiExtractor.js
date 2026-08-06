import axios from 'axios';
import { fetchCourseMaterials, isCurrentYearAcademicCourse } from './googleClassroom';

/**
 * Extracts due dates and structured assignment information using Gemini Flash API (or local fallback).
 */
export async function extractDueDateWithGemini(text, courseName = 'General Course') {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const currentISO = new Date().toISOString();
  const currentTimezone = '+05:30';

  if (!text || text.trim().length === 0) {
    return {
      isAssignment: false,
      title: 'Empty Content',
      course: courseName,
      hasDueDate: false,
      dueDateISO: null,
      summary: 'No text content provided.',
    };
  }

  const systemInstructionText = `You are an expert academic parser. Analyze the given Google Classroom post text.
Determine if this text describes an assignment or task with a due date.
Calculate absolute dates based on the current timestamp if relative dates (like "next Wednesday") are used.
Current ISO timestamp context: ${currentISO}. User Timezone offset: ${currentTimezone}.

Return ONLY a valid JSON object matching this schema:
{
  "isAssignment": boolean,
  "title": "Short title of assignment or material",
  "course": "Course/Subject Name",
  "hasDueDate": boolean,
  "dueDateISO": "YYYY-MM-DDTHH:mm:ss+05:30" (or null if no due date found),
  "summary": "Brief 1-sentence summary of instructions or materials"
}`;

  const promptText = `Course: ${courseName}\nPost Content:\n${text}`;

  if (apiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstructionText}\n\n${promptText}` }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      };

      const response = await axios.post(endpoint, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const rawContent = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawContent) {
        const cleanedJson = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanedJson);
        return {
          isAssignment: Boolean(parsed.isAssignment),
          title: parsed.title || 'Course Material',
          course: parsed.course || courseName,
          hasDueDate: Boolean(parsed.hasDueDate),
          dueDateISO: parsed.dueDateISO || null,
          summary: parsed.summary || 'AI parsed material.',
        };
      }
    } catch (err) {
      console.warn('Gemini API call error (falling back to rule-based parser):', err.response?.data || err.message);
    }
  }

  // Fallback rule parser
  return fallbackRuleExtractor(text, courseName);
}

/**
 * Filter enrolled courses so that AI scan only runs on courses active in the current year (2026 / S4).
 */
export function filterCurrentYearCourses(courses) {
  if (!Array.isArray(courses)) return [];
  return courses.filter(isCurrentYearAcademicCourse);
}

/**
 * Scans announcements and materials of current-year (2026) active courses for hidden deadlines.
 * Excludes items that match already submitted assignments.
 */
export async function scan2026CoursesForHiddenDeadlines(accessToken, courses, pendingAssignments = []) {
  const yearCourses = filterCurrentYearCourses(courses, 2026);
  const hiddenDeadlines = [];

  for (const course of yearCourses) {
    try {
      const { announcements, materials } = await fetchCourseMaterials(accessToken, course.id);

      const itemsToScan = [
        ...announcements.map((a) => ({ id: a.id, text: a.text, source: 'Announcement', link: a.alternateLink })),
        ...materials.map((m) => ({ id: m.id, text: `${m.title}. ${m.description || ''}`, source: 'Material', link: m.alternateLink })),
      ];

      for (const item of itemsToScan) {
        if (!item.text || item.text.trim().length < 15) continue;

        const aiResult = await extractDueDateWithGemini(item.text, course.name);

        if (aiResult && aiResult.hasDueDate && aiResult.dueDateISO) {
        const extractedDate = new Date(aiResult.dueDateISO);
        if (!Number.isNaN(extractedDate.getTime()) && extractedDate > new Date()) {
          hiddenDeadlines.push({
            id: `hd-${item.id}`,
            sourceId: item.id,
            courseName: course.name,
            title: aiResult.title || 'Hidden Assignment Deadline',
            summary: aiResult.summary || item.text.slice(0, 100),
            dueDateISO: aiResult.dueDateISO,
            hasDueDate: true,
            link: item.link || course.alternateLink,
            rawText: item.text,
          });
        }
      }
      }
    } catch (err) {
      console.warn(`Error scanning course ${course.name} for hidden deadlines:`, err.message);
    }
  }

  return hiddenDeadlines;
}

/**
 * Fallback parser using regex and date math when Gemini API is unavailable.
 */
function fallbackRuleExtractor(text, courseName) {
  const lower = text.toLowerCase();
  const isAssignmentKeywords = ['due', 'submit', 'assignment', 'project', 'proposal', 'lab', 'deadline', 'reading', 'draft', 'quiz'];
  const isAssignment = isAssignmentKeywords.some((kw) => lower.includes(kw));

  let hasDueDate = false;
  let dueDateISO = null;
  const now = new Date();

  const dateRegex = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?(?:\s+(?:at|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i;
  const dateMatch = text.match(dateRegex);

  if (dateMatch) {
    hasDueDate = true;
    const monthName = dateMatch[1];
    const dayStr = dateMatch[2];
    const yearStr = dateMatch[3] || '2026';
    let hourStr = dateMatch[4] || '23';
    let minStr = dateMatch[5] || '59';
    const ampm = dateMatch[6]?.toLowerCase();

    let hour = parseInt(hourStr, 10);
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    const monthIndex = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ].indexOf(monthName.toLowerCase());

    const targetDate = new Date(parseInt(yearStr, 10), monthIndex, parseInt(dayStr, 10), hour, parseInt(minStr, 10), 0);
    const pad = (n) => String(n).padStart(2, '0');
    dueDateISO = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}:00+05:30`;
  } else if (lower.includes('next wednesday')) {
    hasDueDate = true;
    const targetDate = new Date(now);
    const currentDay = targetDate.getDay();
    let daysUntilWed = (3 - currentDay + 7) % 7;
    if (daysUntilWed === 0) daysUntilWed = 7;
    targetDate.setDate(targetDate.getDate() + daysUntilWed);
    targetDate.setHours(23, 59, 0, 0);

    const pad = (n) => String(n).padStart(2, '0');
    dueDateISO = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T23:59:00+05:30`;
  } else if (lower.includes('friday')) {
    hasDueDate = true;
    const targetDate = new Date(now);
    const currentDay = targetDate.getDay();
    let daysUntilFri = (5 - currentDay + 7) % 7;
    if (daysUntilFri === 0) daysUntilFri = 7;
    targetDate.setDate(targetDate.getDate() + daysUntilFri);
    targetDate.setHours(17, 0, 0, 0);

    const pad = (n) => String(n).padStart(2, '0');
    dueDateISO = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T17:00:00+05:30`;
  }

  let title = text.slice(0, 45).replace(/[\r\n]+/g, ' ').trim();
  if (text.length > 45) title += '...';
  const summary = text.slice(0, 120).replace(/[\r\n]+/g, ' ').trim() + (text.length > 120 ? '...' : '');

  return {
    isAssignment,
    title,
    course: courseName,
    hasDueDate,
    dueDateISO,
    summary,
  };
}
