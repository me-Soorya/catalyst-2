import axios from 'axios';

const CLASSROOM_API_BASE = 'https://classroom.googleapis.com/v1';

/**
 * Creates an Axios client instance for Google Classroom API
 */
const createClassroomClient = (accessToken) => {
  return axios.create({
    baseURL: CLASSROOM_API_BASE,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
};

// ─── CURRENT-YEAR ACADEMIC FILTERING LOGIC ────────────────────────────────────

/**
 * Filter guard enforcing that Catalyst ONLY imports data from active courses
 * in the current academic year (2026 / Semester S4).
 * Excludes old/legacy classrooms from previous years (2024, 2025) or past terms (S1, S2, S3).
 *
 * @param {Object} course - Google Classroom course object
 * @returns {boolean} True if active 2026 course
 */
export function isCurrentYearAcademicCourse(course) {
  if (!course) return false;

  // 1. Must be ACTIVE
  if (course.courseState && course.courseState !== 'ACTIVE') {
    return false;
  }

  const creationTime = course.creationTime || '';
  const name = course.name || '';
  const section = course.section || '';
  const fullText = `${name} ${section}`.toUpperCase();

  // Current year string
  const currentYearStr = '2026';

  // Check if created in current year (2026)
  const isCreatedInCurrentYear = creationTime.startsWith(currentYearStr);

  // Check if title or section mentions 2026
  const containsCurrentYear = fullText.includes(currentYearStr);

  // Check if explicitly created in a prior year (e.g. 2025, 2024, 2023)
  const isPriorYearCreation = /^20(1\d|2[0-5])/.test(creationTime);

  // If created in a prior year (2025 or earlier) and section/title does not say 2026, EXCLUDE!
  if (isPriorYearCreation && !containsCurrentYear) {
    return false;
  }

  // If creationTime exists, require created in 2026 OR explicitly labeled 2026
  if (creationTime) {
    return isCreatedInCurrentYear || containsCurrentYear;
  }

  // If creationTime is not returned by API, exclude if title mentions prior years (2024, 2025, S1, S2, S3)
  const mentionsPriorTerms = ['2023', '2024', '2025', 'S1', 'S2', 'S3'].some((term) => fullText.includes(term));
  return !mentionsPriorTerms;
}

// ─── DEMO DATA (INCLUDES BOTH LEGACY AND CURRENT-YEAR COURSES) ────────────────

export const ALL_DEMO_COURSES = [
  // ── LEGACY COURSES (2024 & 2025 / S1, S2, S3) - MUST BE FILTERED OUT
  {
    id: 'demo-cs101-legacy',
    name: 'CS101: Programming Fundamentals',
    section: 'S1 2024',
    descriptionHeading: 'Legacy Course - Semester 1',
    room: 'Room 101',
    ownerId: 'prof-old',
    alternateLink: 'https://classroom.google.com/c/demo-cs101-legacy',
    creationTime: '2024-01-10T00:00:00Z',
    courseState: 'ACTIVE',
    theme: 'COMPUTERS',
  },
  {
    id: 'demo-cs201-legacy',
    name: 'CS201: Intermediate Data Structures',
    section: 'S2 2025',
    descriptionHeading: 'Legacy Course - Semester 2',
    room: 'Room 202',
    ownerId: 'prof-old2',
    alternateLink: 'https://classroom.google.com/c/demo-cs201-legacy',
    creationTime: '2025-01-15T00:00:00Z',
    courseState: 'ACTIVE',
    theme: 'SCIENCE',
  },

  // ── CURRENT ACADEMIC YEAR (2026 / S4) - MUST BE INCLUDED
  {
    id: 'demo-cs301',
    name: 'CS301: Algorithms & Data Structures',
    section: 'Fall 2026 · S4',
    descriptionHeading: 'Core Computer Science',
    room: 'Room 304',
    ownerId: 'prof-smith',
    alternateLink: 'https://classroom.google.com/c/demo-cs301',
    creationTime: '2026-01-10T00:00:00Z',
    courseState: 'ACTIVE',
    theme: 'COMPUTERS',
  },
  {
    id: 'demo-cs402',
    name: 'CS402: Artificial Intelligence & ML',
    section: 'Fall 2026 · S4',
    descriptionHeading: 'Advanced Elective',
    room: 'Auditorium B',
    ownerId: 'prof-johnson',
    alternateLink: 'https://classroom.google.com/c/demo-cs402',
    creationTime: '2026-01-15T00:00:00Z',
    courseState: 'ACTIVE',
    theme: 'SCIENCE',
  },
  {
    id: 'demo-eng102',
    name: 'ENG102: Academic Writing & Research',
    section: 'Fall 2026 · S4',
    descriptionHeading: 'Humanities & Communication',
    room: 'Online - Zoom',
    ownerId: 'prof-davis',
    alternateLink: 'https://classroom.google.com/c/demo-eng102',
    creationTime: '2026-01-20T00:00:00Z',
    courseState: 'ACTIVE',
    theme: 'LANGUAGE',
  },
];

export const DEMO_MATERIALS = {
  'demo-cs301': {
    announcements: [
      {
        id: 'ann-101',
        text: 'Important Update: Midterm Project Proposal is due next Wednesday, August 5 at 11:59 PM. Make sure to submit your PDF draft on GitHub Classroom or via the portal before the deadline.',
        creationTime: '2026-07-30T10:00:00Z',
        updateTime: '2026-07-30T10:00:00Z',
        alternateLink: 'https://classroom.google.com/c/demo-cs301',
        materials: [],
      },
      {
        id: 'ann-102',
        text: 'Lecture 12 slides on Graph Dynamic Programming have been uploaded. Please review exercise 4 before Friday\'s lab at 5 PM.',
        creationTime: '2026-07-28T14:30:00Z',
        updateTime: '2026-07-28T14:30:00Z',
        alternateLink: 'https://classroom.google.com/c/demo-cs301',
        materials: [],
      },
    ],
    materials: [
      {
        id: 'mat-101',
        title: 'Week 4 Reading: Dijkstra and A* Search Algorithms',
        description: 'Mandatory reading for upcoming quiz. Finish reading Chapter 8 by August 7th.',
        creationTime: '2026-07-29T09:00:00Z',
        alternateLink: 'https://classroom.google.com/c/demo-cs301',
      },
    ],
  },
  'demo-cs402': {
    announcements: [
      {
        id: 'ann-201',
        text: 'Reminder: Lab 3 - Fine-Tuning Transformer Models. The code submission deadline is Friday, August 7 at 5:00 PM (+05:30). Late submissions will incur a 10% penalty per day.',
        creationTime: '2026-07-31T08:00:00Z',
        updateTime: '2026-07-31T08:00:00Z',
        alternateLink: 'https://classroom.google.com/c/demo-cs402',
        materials: [],
      },
    ],
    materials: [
      {
        id: 'mat-201',
        title: 'Neural Network PyTorch Starter Template',
        description: 'Starter Jupyter notebook for Lab 3.',
        creationTime: '2026-07-30T16:00:00Z',
        alternateLink: 'https://classroom.google.com/c/demo-cs402',
      },
    ],
  },
  'demo-eng102': {
    announcements: [
      {
        id: 'ann-301',
        text: 'Peer review session scheduled! Please upload your Annotated Bibliography rough draft by August 10, 2026 at 6:00 PM.',
        creationTime: '2026-07-31T11:15:00Z',
        updateTime: '2026-07-31T11:15:00Z',
        alternateLink: 'https://classroom.google.com/c/demo-eng102',
        materials: [],
      },
    ],
    materials: [
      {
        id: 'mat-301',
        title: 'MLA Citation Guidelines 9th Edition',
        description: 'Reference style guide for research papers.',
        creationTime: '2026-07-25T12:00:00Z',
        alternateLink: 'https://classroom.google.com/c/demo-eng102',
      },
    ],
  },
};

export const DEMO_COURSEWORK = {
  'demo-cs301': [
    {
      id: 'cw-101',
      title: 'Assignment 2: Red-Black Tree Implementation',
      description: 'Implement a self-balancing Red-Black Tree in Java/C++ with full unit test coverage.',
      creationTime: '2026-07-26T10:00:00Z',
      dueDate: { year: 2026, month: 8, day: 6 },
      dueTime: { hours: 23, minutes: 59 },
      maxPoints: 100,
      alternateLink: 'https://classroom.google.com/c/demo-cs301/a/cw-101',
      workType: 'ASSIGNMENT',
      submissionState: 'NEW',
    },
    {
      id: 'cw-102',
      title: 'Problem Set 3: Complexity Analysis',
      description: 'Solve problems 1-5 in Chapter 4.',
      creationTime: '2026-07-27T10:00:00Z',
      dueDate: { year: 2026, month: 8, day: 12 },
      dueTime: { hours: 18, minutes: 0 },
      maxPoints: 50,
      alternateLink: 'https://classroom.google.com/c/demo-cs301/a/cw-102',
      workType: 'ASSIGNMENT',
      submissionState: 'TURNED_IN',
    },
  ],
  'demo-cs402': [
    {
      id: 'cw-201',
      title: 'Lab 3: Fine-Tuning Transformer Models',
      description: 'Fine-tune BERT for text classification on IMDb dataset.',
      creationTime: '2026-07-30T09:00:00Z',
      dueDate: { year: 2026, month: 8, day: 7 },
      dueTime: { hours: 17, minutes: 0 },
      maxPoints: 100,
      alternateLink: 'https://classroom.google.com/c/demo-cs402/a/cw-201',
      workType: 'ASSIGNMENT',
      submissionState: 'NEW',
    },
    {
      id: 'cw-202',
      title: 'Project Topic Proposal & Group Setup',
      description: 'Submit your 1-page proposal and list of group members.',
      creationTime: '2026-07-31T09:00:00Z',
      dueDate: null,
      maxPoints: 25,
      alternateLink: 'https://classroom.google.com/c/demo-cs402/a/cw-202',
      workType: 'ASSIGNMENT',
      submissionState: 'CREATED',
    },
  ],
  'demo-eng102': [
    {
      id: 'cw-301',
      title: 'Annotated Bibliography First Draft',
      description: 'Submit 5 peer-reviewed sources with 150-word annotations.',
      creationTime: '2026-07-28T14:00:00Z',
      dueDate: { year: 2026, month: 8, day: 10 },
      dueTime: { hours: 18, minutes: 0 },
      maxPoints: 50,
      alternateLink: 'https://classroom.google.com/c/demo-eng102/a/cw-301',
      workType: 'ASSIGNMENT',
      submissionState: 'RETURNED',
    },
    {
      id: 'cw-302',
      title: 'Research Paper Outline & Thesis Statement',
      description: 'Detail your main arguments and working bibliography.',
      creationTime: '2026-07-29T11:00:00Z',
      dueDate: { year: 2026, month: 8, day: 14 },
      dueTime: { hours: 23, minutes: 59 },
      maxPoints: 50,
      alternateLink: 'https://classroom.google.com/c/demo-eng102/a/cw-302',
      workType: 'ASSIGNMENT',
      submissionState: 'NEW',
    },
  ],
};

// ─── API FUNCTIONS ────────────────────────────────────────────────────────────

/**
 * Fetches active courses enrolled by the student and strictly applies
 * the Current-Year Academic Filter (2026 / Semester S4).
 * Legacy/archived classrooms from previous years (2024, 2025) or past terms (S1, S2, S3) are ignored.
 *
 * @param {string} accessToken - Valid OAuth access token
 * @returns {Promise<Array>} List of filtered 2026 active course objects
 */
export async function fetchEnrolledCourses(accessToken) {
  if (!accessToken) {
    const demoFiltered = ALL_DEMO_COURSES.filter(isCurrentYearAcademicCourse);
    console.log('[Classroom API] Enrolled Active Courses (Demo Mode):', demoFiltered);
    return demoFiltered;
  }

  try {
    const client = createClassroomClient(accessToken);

    // Fetch all courses with pagination loop (pageSize=100)
    let rawCourses = [];
    let pageToken = null;

    do {
      const response = await client.get('/courses', {
        params: {
          studentId: 'me',
          courseStates: 'ACTIVE',
          pageSize: 100,
          ...(pageToken ? { pageToken } : {}),
        },
      });

      rawCourses = rawCourses.concat(response.data.courses || []);
      pageToken = response.data.nextPageToken || null;
    } while (pageToken);

    const activeCurrentYearCourses = rawCourses.filter(isCurrentYearAcademicCourse);
    console.log('[Classroom API] Enrolled Active Courses:', activeCurrentYearCourses);

    return activeCurrentYearCourses.length > 0
      ? activeCurrentYearCourses
      : ALL_DEMO_COURSES.filter(isCurrentYearAcademicCourse);
  } catch (err) {
    console.warn('fetchEnrolledCourses error (using filtered demo fallback):', err.message);
    const demoFiltered = ALL_DEMO_COURSES.filter(isCurrentYearAcademicCourse);
    console.log('[Classroom API] Enrolled Active Courses (Fallback):', demoFiltered);
    return demoFiltered;
  }
}

/**
 * Fetches announcements and materials for a course.
 */
export async function fetchCourseMaterials(accessToken, courseId) {
  if (!accessToken || courseId?.startsWith('demo-')) {
    return DEMO_MATERIALS[courseId] || { announcements: [], materials: [] };
  }

  try {
    const client = createClassroomClient(accessToken);
    const [announcementsRes, materialsRes] = await Promise.allSettled([
      client.get(`/courses/${courseId}/announcements`),
      client.get(`/courses/${courseId}/courseWorkMaterials`),
    ]);

    const announcements = announcementsRes.status === 'fulfilled'
      ? (announcementsRes.value.data.announcements || [])
      : [];

    const materials = materialsRes.status === 'fulfilled'
      ? (materialsRes.value.data.courseWorkMaterial || [])
      : [];

    return { announcements, materials };
  } catch (err) {
    console.warn(`fetchCourseMaterials fallback for ${courseId}:`, err.message);
    return DEMO_MATERIALS[courseId] || { announcements: [], materials: [] };
  }
}

export async function fetchCourseWork(accessToken, courseId) {
  if (!accessToken || courseId?.startsWith('demo-')) {
    return DEMO_COURSEWORK[courseId] || [];
  }

  try {
    const client = createClassroomClient(accessToken);
    let courseWork = [];
    let pageToken = null;

    do {
      const response = await client.get(`/courses/${courseId}/courseWork`, {
        params: {
          pageSize: 100,
          ...(pageToken ? { pageToken } : {}),
        },
      });
      courseWork = courseWork.concat(response.data.courseWork || []);
      pageToken = response.data.nextPageToken || null;
    } while (pageToken);

    return courseWork;
  } catch (err) {
    console.warn(`fetchCourseWork fallback for ${courseId}:`, err.message);
    return DEMO_COURSEWORK[courseId] || [];
  }
}

/**
 * Helper to convert Google Classroom API dueDate & dueTime into ISO string
 */
function formatDueDateISO(dueDate, dueTime) {
  if (!dueDate || !dueDate.year || !dueDate.month || !dueDate.day) return null;
  const { year, month, day } = dueDate;
  const { hours = 23, minutes = 59 } = dueTime || {};
  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+05:30`;
}

export const COURSEWORK_STATUS = {
  NO_DUE_DATE: '⚠️ No Due Date',
  MISSING: '❌ Missing',
  PENDING: '⏳ Pending',
  SUBMITTED: 'Submitted',
};

function getCourseWorkStatus(submissionState, dueDateISO) {
  const unsubmittedStates = ['NEW', 'CREATED'];
  if (!unsubmittedStates.includes(submissionState)) {
    return COURSEWORK_STATUS.SUBMITTED;
  }

  if (!dueDateISO) {
    return COURSEWORK_STATUS.NO_DUE_DATE;
  }

  const dueDate = new Date(dueDateISO);
  if (Number.isNaN(dueDate.getTime())) {
    return COURSEWORK_STATUS.NO_DUE_DATE;
  }

  return dueDate < new Date() ? COURSEWORK_STATUS.MISSING : COURSEWORK_STATUS.PENDING;
}

/**
 * Fetches pending coursework strictly for current-year (2026 / S4) active courses.
 * Excludes submitted/returned items ("TURNED_IN", "RETURNED").
 * Flags missing due dates with `hasNoDueDate: true`.
 *
 * @param {string} accessToken
 * @returns {Promise<Array>} List of pending assignment items
 */
export async function fetchPendingStudentAssignments(accessToken) {
  // 1. Fetch strictly filtered current-year (2026) courses
  const currentYearCourses = await fetchEnrolledCourses(accessToken);
  const pendingAssignments = [];

  for (const course of currentYearCourses) {
    const courseId = course.id;

    if (!accessToken || courseId.startsWith('demo-')) {
      const cwItems = DEMO_COURSEWORK[courseId] || [];
      for (const item of cwItems) {
        if (item.submissionState === 'TURNED_IN' || item.submissionState === 'RETURNED') {
          continue;
        }

        const dueDateISO = formatDueDateISO(item.dueDate, item.dueTime);
        pendingAssignments.push({
          id: item.id,
          courseId: course.id,
          courseName: course.name,
          title: item.title,
          description: item.description || '',
          alternateLink: item.alternateLink || course.alternateLink,
          maxPoints: item.maxPoints,
          dueDateISO,
          hasNoDueDate: !dueDateISO,
          submissionState: item.submissionState || 'NEW',
          assignmentStatus: getCourseWorkStatus(item.submissionState || 'NEW', dueDateISO),
        });
      }
      continue;
    }

    try {
      const client = createClassroomClient(accessToken);

      // Fetch all courseWork with pagination (pageSize=100)
      let courseWorkList = [];
      let cwPageToken = null;
      do {
        const cwRes = await client.get(`/courses/${courseId}/courseWork`, {
          params: {
            pageSize: 100,
            ...(cwPageToken ? { pageToken: cwPageToken } : {}),
          },
        });
        courseWorkList = courseWorkList.concat(cwRes.data.courseWork || []);
        cwPageToken = cwRes.data.nextPageToken || null;
      } while (cwPageToken);

      // Fetch all studentSubmissions with pagination (pageSize=100)
      let submissionsList = [];
      let subPageToken = null;
      do {
        const subRes = await client.get(`/courses/${courseId}/courseWork/-/studentSubmissions`, {
          params: {
            userId: 'me',
            pageSize: 100,
            ...(subPageToken ? { pageToken: subPageToken } : {}),
          },
        });
        submissionsList = submissionsList.concat(subRes.data.studentSubmissions || []);
        subPageToken = subRes.data.nextPageToken || null;
      } while (subPageToken);

      const submissionStateMap = {};
      for (const sub of submissionsList) {
        submissionStateMap[sub.courseWorkId] = sub.state;
      }

      for (const cw of courseWorkList) {
        const state = submissionStateMap[cw.id] || 'NEW';

        // Exclude Submitted Work
        if (state === 'TURNED_IN' || state === 'RETURNED') {
          continue;
        }

        const dueDateISO = formatDueDateISO(cw.dueDate, cw.dueTime);
        pendingAssignments.push({
          id: cw.id,
          courseId: course.id,
          courseName: course.name,
          title: cw.title,
          description: cw.description || '',
          alternateLink: cw.alternateLink || course.alternateLink,
          maxPoints: cw.maxPoints,
          dueDateISO,
          hasNoDueDate: !dueDateISO,
          submissionState: state,
          assignmentStatus: getCourseWorkStatus(state, dueDateISO),
        });
      }
    } catch (err) {
      console.warn(`Error fetching pending assignments for course ${courseId}:`, err.message);
    }
  }

  // Sort by nearest due date
  pendingAssignments.sort((a, b) => {
    if (a.hasNoDueDate && !b.hasNoDueDate) return 1;
    if (!a.hasNoDueDate && b.hasNoDueDate) return -1;
    if (a.hasNoDueDate && b.hasNoDueDate) return 0;
    return new Date(a.dueDateISO) - new Date(b.dueDateISO);
  });

  return pendingAssignments;
}
