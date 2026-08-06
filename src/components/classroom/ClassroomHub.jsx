import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  FileText,
  Megaphone,
  Sparkles,
  ArrowLeft,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Paperclip,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCalendar } from '../../context/CalendarContext';
import {
  fetchEnrolledCourses,
  fetchCourseMaterials,
  fetchCourseWork,
} from '../../services/googleClassroom';
import { extractDueDateWithGemini } from '../../services/geminiExtractor';
import ConfirmTaskModal from './ConfirmTaskModal';

export default function ClassroomHub() {
  const { accessToken } = useAuth();
  const { showToast } = useCalendar();

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'announcements', 'materials', 'coursework'

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [announcements, setAnnouncements] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [courseWork, setCourseWork] = useState([]);

  // AI Extraction state
  const [scanningItemId, setScanningItemId] = useState(null);
  const [isBatchScanning, setIsBatchScanning] = useState(false);
  const [aiScanResults, setAiScanResults] = useState({}); // { itemId: extractedResult }

  // Confirmation Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [taskToConfirm, setTaskToConfirm] = useState(null);

  // Load courses on mount
  useEffect(() => {
    async function loadCourses() {
      setLoadingCourses(true);
      try {
        const data = await fetchEnrolledCourses(accessToken);
        setCourses(data);
      } catch (err) {
        console.error('Failed to load Google Classroom courses:', err);
        showToast('Error loading Google Classroom courses', 'error');
      } finally {
        setLoadingCourses(false);
      }
    }
    loadCourses();
  }, [accessToken]);

  // Load details when selectedCourse changes
  useEffect(() => {
    if (!selectedCourse) return;

    async function loadDetails() {
      setLoadingDetails(true);
      try {
        const [mats, cw] = await Promise.all([
          fetchCourseMaterials(accessToken, selectedCourse.id),
          fetchCourseWork(accessToken, selectedCourse.id),
        ]);
        setAnnouncements(mats.announcements || []);
        setMaterials(mats.materials || []);
        setCourseWork(cw || []);
      } catch (err) {
        console.error('Failed to fetch course materials:', err);
        showToast('Failed to load course contents', 'error');
      } finally {
        setLoadingDetails(false);
      }
    }

    loadDetails();
  }, [selectedCourse, accessToken]);

  // Scan single item with Gemini AI
  const handleScanItem = async (itemId, text, fallbackTitle) => {
    setScanningItemId(itemId);
    try {
      const result = await extractDueDateWithGemini(
        text || fallbackTitle,
        selectedCourse?.name || 'Classroom'
      );

      if (result?.hasDueDate && result.dueDateISO && new Date(result.dueDateISO) > new Date()) {
        setAiScanResults((prev) => ({ ...prev, [itemId]: result }));
        showToast('Gemini AI successfully scanned post!', 'success');
      } else {
        setAiScanResults((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
        showToast('No valid future due date detected.', 'info');
      }
    } catch (err) {
      console.error('Error scanning post:', err);
      showToast('Failed to analyze with AI', 'error');
    } finally {
      setScanningItemId(null);
    }
  };

  // Batch scan all items in current course
  const handleBatchScan = async () => {
    if (!selectedCourse) return;
    setIsBatchScanning(true);
    showToast('Starting Gemini AI batch scan across course materials...', 'info');

    const allItemsToScan = [
      ...announcements.map((a) => ({ id: a.id, text: a.text, title: 'Announcement' })),
      ...materials.map((m) => ({ id: m.id, text: `${m.title}. ${m.description || ''}`, title: m.title })),
    ];

    let foundCount = 0;
    const newResults = { ...aiScanResults };

    for (const item of allItemsToScan) {
      if (!newResults[item.id]) {
        try {
          const res = await extractDueDateWithGemini(item.text, selectedCourse.name);
          if (res.hasDueDate && res.dueDateISO && new Date(res.dueDateISO) > new Date()) {
            newResults[item.id] = res;
            foundCount++;
          } else {
            newResults[item.id] = { ...res, hasDueDate: false, dueDateISO: null };
          }
        } catch (err) {
          console.warn('Batch scan item failed:', item.id);
        }
      } else if (newResults[item.id]?.hasDueDate || newResults[item.id]?.isAssignment) {
        foundCount++;
      }
    }

    setAiScanResults(newResults);
    setIsBatchScanning(false);
    showToast(`Batch scan complete! Found ${foundCount} assignment items with deadlines.`, 'success');
  };

  // Open confirmation modal for scanned item
  const openConfirmModal = (scannedResult) => {
    setTaskToConfirm(scannedResult);
    setConfirmModalOpen(true);
  };

  // Helper to format due dates from Google Classroom CourseWork items
  const formatCourseWorkDueDate = (cw) => {
    if (!cw.dueDate) return null;
    const { year, month, day } = cw.dueDate;
    const { hours = 23, minutes = 59 } = cw.dueTime || {};
    const pad = (n) => String(n).padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+05:30`;
  };

  return (
    <div className="space-y-6">
      
      {/* ── HEADER BANNER ── */}
      <div className="neu-card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full neu-inset text-teal-700 text-[10px] font-bold uppercase tracking-widest">
                <GraduationCap className="w-3.5 h-3.5" />
                Classroom & Notes Hub
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 text-[10px] font-extrabold uppercase">
                Gemini 2.5 Flash AI Powered
              </span>
            </div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-800 tracking-tight">
              {selectedCourse ? selectedCourse.name : 'Enrolled Courses & Materials'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              {selectedCourse
                ? `${selectedCourse.section || 'Active Course'} · Scan announcements and hidden materials for assignment due dates.`
                : 'Drill down into your Google Classroom courses, view announcements, notes, and automatically extract due dates into Google Calendar.'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {selectedCourse ? (
              <>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl neu-btn text-slate-600 text-xs font-bold hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  All Courses
                </button>
                <button
                  onClick={handleBatchScan}
                  disabled={isBatchScanning}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-xs font-bold bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_4px_16px_rgba(99,102,241,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isBatchScanning ? 'animate-spin' : ''}`} />
                  {isBatchScanning ? 'Scanning Materials...' : 'Scan Course with Gemini AI'}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl neu-inset text-xs font-semibold text-slate-600">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <span>{courses.length} Active Courses</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── COURSE LIST VIEW (GRID) ── */}
      {!selectedCourse && (
        <>
          {loadingCourses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="neu-card p-6 h-48 animate-pulse flex flex-col justify-between">
                  <div className="h-6 bg-slate-200 rounded-lg w-3/4" />
                  <div className="h-4 bg-slate-200 rounded-lg w-1/2" />
                  <div className="h-10 bg-slate-200 rounded-2xl w-full" />
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="neu-card p-12 text-center max-w-md mx-auto">
              <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No Active Enrolled Courses Found</h3>
              <p className="text-xs text-slate-500 mt-1">Connect a Google Account with active Classroom enrollments.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className="neu-card neu-card-hover p-6 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-xl group-hover:bg-teal-500/20 transition-all pointer-events-none" />

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-xl neu-inset text-[10px] font-extrabold uppercase text-teal-700">
                        {course.section || 'Active'}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {course.room || 'Classroom'}
                      </span>
                    </div>

                    <h3 className="font-display font-extrabold text-lg text-slate-800 group-hover:text-teal-700 transition-colors line-clamp-2">
                      {course.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {course.descriptionHeading || 'Google Classroom Course'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open Materials & AI Hub &rarr;
                    </span>
                    {course.alternateLink && (
                      <a
                        href={course.alternateLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg neu-btn text-slate-400 hover:text-teal-600"
                        title="Open in Google Classroom"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── COURSE DRILL-DOWN VIEW ── */}
      {selectedCourse && (
        <div className="space-y-6">
          
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl neu-inset max-w-max">
            {[
              { id: 'all', label: 'All Stream & Materials', icon: BookOpen },
              { id: 'announcements', label: `Announcements (${announcements.length})`, icon: Megaphone },
              { id: 'materials', label: `Materials (${materials.length})`, icon: FileText },
              { id: 'coursework', label: `Formal Coursework (${courseWork.length})`, icon: GraduationCap },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'neu-btn text-teal-700 shadow-neu-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {loadingDetails ? (
            <div className="neu-card p-12 text-center">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Fetching Course Stream & Materials...</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* 1. Formal Coursework Items */}
              {(activeTab === 'all' || activeTab === 'coursework') && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    Formal Coursework ({courseWork.length})
                  </h4>

                  {courseWork.length === 0 ? (
                    <div className="neu-card p-4 text-center text-xs text-slate-400">
                      No formal coursework assigned yet.
                    </div>
                  ) : (
                    courseWork.map((cw) => {
                      const dueDateISO = formatCourseWorkDueDate(cw);
                      const scannedItem = {
                        isAssignment: true,
                        title: cw.title,
                        course: selectedCourse.name,
                        hasDueDate: !!dueDateISO,
                        dueDateISO,
                        summary: cw.description || 'Formal Coursework item.',
                      };

                      return (
                        <div key={cw.id} className="neu-card p-5 neu-card-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-extrabold uppercase">
                                Coursework
                              </span>
                              {cw.maxPoints && (
                                <span className="text-[10px] font-bold text-slate-400">
                                  {cw.maxPoints} Points
                                </span>
                              )}
                            </div>
                            <h5 className="font-extrabold text-slate-800 text-sm sm:text-base">{cw.title}</h5>
                            {cw.description && (
                              <p className="text-xs text-slate-500 line-clamp-2">{cw.description}</p>
                            )}
                            {dueDateISO && (
                              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold mt-2">
                                <Calendar className="w-3.5 h-3.5" />
                                Official Due Date: {new Date(dueDateISO).toLocaleString()}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => openConfirmModal(scannedItem)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold bg-indigo-600 hover:bg-indigo-700 shadow-neu-xs self-start sm:self-center"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Add to Calendar
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* 2. Announcements (With AI Due Date Extractor) */}
              {(activeTab === 'all' || activeTab === 'announcements') && (
                <div className="space-y-3 mt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                    <Megaphone className="w-4 h-4 text-amber-500" />
                    Announcements & Stream ({announcements.length})
                  </h4>

                  {announcements.length === 0 ? (
                    <div className="neu-card p-4 text-center text-xs text-slate-400">
                      No stream announcements posted.
                    </div>
                  ) : (
                    announcements.map((ann) => {
                      const isScanning = scanningItemId === ann.id;
                      const aiResult = aiScanResults[ann.id];

                      return (
                        <div key={ann.id} className="neu-card p-5 space-y-3 relative overflow-hidden">
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                            <span className="font-semibold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              Posted {new Date(ann.creationTime).toLocaleDateString()}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-bold text-[10px] uppercase">
                              Announcement
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                            {ann.text}
                          </p>

                          {/* Attached materials */}
                          {ann.materials?.length > 0 && (
                            <div className="pt-2 flex flex-wrap gap-2">
                              {ann.materials.map((m, i) => (
                                <a
                                  key={i}
                                  href={m.link?.url || m.driveFile?.driveFile?.alternateLink || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl neu-inset text-slate-600 text-xs font-semibold hover:text-teal-700"
                                >
                                  <Paperclip className="w-3 h-3 text-teal-600" />
                                  {m.link?.title || m.driveFile?.driveFile?.title || 'Attachment'}
                                </a>
                              ))}
                            </div>
                          )}

                          {/* AI Detection Pill / Scan Action */}
                          <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                            {aiResult && aiResult.hasDueDate && aiResult.dueDateISO && new Date(aiResult.dueDateISO) > new Date() ? (
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="p-2.5 rounded-xl text-xs flex items-center gap-2 font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                  <div>
                                    <span className="font-bold">AI Detection:</span>{' '}
                                    {`Found Due Date (${new Date(aiResult.dueDateISO).toLocaleString()})`}
                                  </div>
                                </div>

                                <button
                                  onClick={() => openConfirmModal(aiResult)}
                                  className="px-4 py-2 rounded-xl text-white text-xs font-bold bg-gradient-to-br from-indigo-500 to-violet-600 shadow-neu-xs hover:scale-105 transition-all"
                                >
                                  Confirm Task & Sync
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleScanItem(ann.id, ann.text, 'Announcement')}
                                disabled={isScanning}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl neu-btn text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-all disabled:opacity-50"
                              >
                                <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                                {isScanning ? 'Scanning with Gemini AI...' : 'Scan with Gemini AI'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* 3. Course Materials (With AI Extractor) */}
              {(activeTab === 'all' || activeTab === 'materials') && (
                <div className="space-y-3 mt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                    <FileText className="w-4 h-4 text-teal-500" />
                    Course Materials & Readings ({materials.length})
                  </h4>

                  {materials.length === 0 ? (
                    <div className="neu-card p-4 text-center text-xs text-slate-400">
                      No standalone course materials posted yet.
                    </div>
                  ) : (
                    materials.map((mat) => {
                      const isScanning = scanningItemId === mat.id;
                      const aiResult = aiScanResults[mat.id];

                      return (
                        <div key={mat.id} className="neu-card p-5 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="font-extrabold text-slate-800 text-sm">{mat.title}</h5>
                            <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 font-bold text-[10px] uppercase">
                              Reading / Notes
                            </span>
                          </div>

                          {mat.description && (
                            <p className="text-xs text-slate-600 line-clamp-2">{mat.description}</p>
                          )}

                          {/* AI Action / Result */}
                          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-3">
                            {aiResult ? (
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                                  AI Analyzed
                                </span>
                                {aiResult.hasDueDate && (
                                  <button
                                    onClick={() => openConfirmModal(aiResult)}
                                    className="px-3 py-1.5 rounded-xl text-white text-xs font-bold bg-indigo-600"
                                  >
                                    Confirm Task
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  handleScanItem(
                                    mat.id,
                                    `${mat.title}. ${mat.description || ''}`,
                                    mat.title
                                  )
                                }
                                disabled={isScanning}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl neu-btn text-indigo-600 text-xs font-bold"
                              >
                                <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                                {isScanning ? 'Analyzing...' : 'Scan with Gemini AI'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* Explicit Confirmation Modal */}
      <ConfirmTaskModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        extractedTask={taskToConfirm}
        courseName={selectedCourse?.name}
      />
    </div>
  );
}
