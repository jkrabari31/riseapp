import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Download, Save, Plus, X } from 'lucide-react';
import api from '../utils/api';
import { ProgressReportPdfTemplate } from '../components/ProgressReportPdfTemplate';

interface Batch {
    id: string;
    name: string;
}

interface Assessment {
    id: string;
    title: string;
    specializationId: string | null;
    submissions: {
        studentId: string;
        score: number;
        totalQuestions: number;
    }[];
}

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    specialization: { id: string, name: string } | null;
    progressData: {
        attendancePct: number | null;
        offlineScoresJSON: string | null;
    } | null;
}

interface OfflineSubject {
    id: string;
    name: string;
}

export default function ProgressReports() {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
    const [specializationFilter, setSpecializationFilter] = useState<string>('');
    
    // Grid Data State
    const [attendanceData, setAttendanceData] = useState<Record<string, string>>({}); // studentId -> pct
    const [offlineSubjects, setOfflineSubjects] = useState<OfflineSubject[]>([]);
    const [offlineScores, setOfflineScores] = useState<Record<string, Record<string, string>>>({}); // studentId -> { subjectId -> score }

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchBatches();
    }, []);

    useEffect(() => {
        if (selectedBatch) {
            fetchData();
        } else {
            setStudents([]);
            setAssessments([]);
            setAttendanceData({});
            setOfflineSubjects([]);
            setOfflineScores({});
        }
    }, [selectedBatch]);

    const fetchBatches = async () => {
        try {
            const res = await api.get('/scheduler/batches');
            setBatches(res.data);
        } catch (err: any) {
            console.error('Error fetching batches:', err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch students & their saved progress data
            const [studentsRes, assessmentsRes] = await Promise.all([
                api.get(`/progress/${selectedBatch}`),
                api.get(`/progress/assessments/${selectedBatch}`)
            ]);

            const fetchedStudents: Student[] = studentsRes.data;
            setStudents(fetchedStudents);
            setAssessments(assessmentsRes.data);
            setSelectedAssessments(assessmentsRes.data.map((a: any) => a.id));

            // Initialize Grid Data
            const initialAttendance: Record<string, string> = {};
            const initialOfflineScores: Record<string, Record<string, string>> = {};
            
            // Map to track unique offline subjects across all students
            const uniqueOfflineSubjects = new Map<string, string>(); 

            fetchedStudents.forEach(student => {
                initialAttendance[student.id] = student.progressData?.attendancePct?.toString() || '';
                
                initialOfflineScores[student.id] = {};
                if (student.progressData?.offlineScoresJSON) {
                    try {
                        const parsed = JSON.parse(student.progressData.offlineScoresJSON);
                        parsed.forEach((scoreObj: any) => {
                            // Convert name to an ID for internal tracking if needed
                            const subjectId = scoreObj.subjectName.toLowerCase().replace(/\s+/g, '-');
                            uniqueOfflineSubjects.set(subjectId, scoreObj.subjectName);
                            initialOfflineScores[student.id][subjectId] = scoreObj.score.toString();
                        });
                    } catch(e) { console.error('Error parsing JSON'); }
                }
            });

            setAttendanceData(initialAttendance);
            setOfflineScores(initialOfflineScores);

            const subjectsArr = Array.from(uniqueOfflineSubjects.entries()).map(([id, name]) => ({ id, name }));
            setOfflineSubjects(subjectsArr);

        } catch (err: any) {
            setError(err.response?.data?.message || 'Error fetching data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddOfflineSubject = () => {
        const name = prompt('Enter the name of the Offline Subject:');
        if (name?.trim()) {
            const id = name.trim().toLowerCase().replace(/\s+/g, '-');
            if (offlineSubjects.find(s => s.id === id)) {
                return alert('Subject already exists');
            }
            setOfflineSubjects([...offlineSubjects, { id, name: name.trim() }]);
        }
    };

    const handleRemoveOfflineSubject = (subjectId: string) => {
        if (!window.confirm('Remove this column? Data will be lost upon saving.')) return;
        setOfflineSubjects(prev => prev.filter(s => s.id !== subjectId));
        // Also clean up state
        setOfflineScores(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(studentId => {
                delete next[studentId][subjectId];
            });
            return next;
        });
    };

    const handleSaveData = async () => {
        if (!selectedBatch) return;
        setSaving(true);
        setSuccess('');
        setError('');

        const updates = students.map(student => {
            const studentScores = offlineSubjects.map(sub => ({
                subjectName: sub.name,
                score: parseFloat(offlineScores[student.id]?.[sub.id] || '0'),
                maxScore: 100 // Hardcoded as per user request
            })).filter(s => !isNaN(s.score));

            return {
                studentId: student.id,
                attendancePct: attendanceData[student.id] ? parseFloat(attendanceData[student.id]) : null,
                offlineScoresJSON: JSON.stringify(studentScores)
            };
        });

        try {
            await api.post(`/progress/${selectedBatch}`, { updates });
            setSuccess('Progress data saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save data');
        } finally {
            setSaving(false);
        }
    };

    const getPdfData = () => {
        return students.map(student => {
            const scores: any[] = [];
            
            // System Assessments
            assessments.filter(a => selectedAssessments.includes(a.id)).forEach(assessment => {
                const isApplicable = !assessment.specializationId || assessment.specializationId === student.specialization?.id;
                if (!isApplicable) return; // Skip if it does not apply to this student's specialization

                const sub = assessment.submissions.find(s => s.studentId === student.id);
                if (sub) {
                    scores.push({
                        subjectName: assessment.title,
                        score: sub.score,
                        maxScore: sub.totalQuestions,
                        percentage: (sub.score / sub.totalQuestions) * 100
                    });
                } else {
                    const maxScoreFallback = assessment.submissions.length > 0 ? assessment.submissions[0].totalQuestions : 100;
                    scores.push({
                        subjectName: assessment.title,
                        score: 'Absent',
                        maxScore: maxScoreFallback,
                        percentage: 0
                    });
                }
            });

            // Offline Subjects
            offlineSubjects.forEach(sub => {
                const valStr = offlineScores[student.id]?.[sub.id];
                if (valStr && valStr.trim() !== '') {
                    const val = parseFloat(valStr);
                    if (!isNaN(val)) {
                        scores.push({
                            subjectName: sub.name,
                            score: val,
                            maxScore: 100,
                            percentage: (val / 100) * 100
                        });
                    }
                }
            });

            // Calculate overall percentage
            const totalPercentage = scores.reduce((acc, curr) => acc + curr.percentage, 0);
            const overallPercentage = scores.length > 0 ? totalPercentage / scores.length : 0;

            return {
                internName: `${student.firstName} ${student.lastName || ''}`.trim(),
                internId: student.admissionNumber,
                specialization: student.specialization?.name || 'N/A',
                attendancePct: attendanceData[student.id] ? parseFloat(attendanceData[student.id]) : null,
                scores,
                overallPercentage
            };
        });
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Progress_Report_${batches.find(b => b.id === selectedBatch)?.name || 'Batch'}`,
    });

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Progress Reports</h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage attendance, offline scores, and generate batch PDFs.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 mb-8">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Select Batch</label>
                        <select
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                            value={selectedBatch}
                            onChange={e => setSelectedBatch(e.target.value)}
                        >
                            <option value="">-- Choose a Batch --</option>
                            {batches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    {students.length > 0 && (
                        <div className="flex-1">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Filter by Specialization</label>
                            <select
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                                value={specializationFilter}
                                onChange={e => setSpecializationFilter(e.target.value)}
                            >
                                <option value="">All Specializations</option>
                                {Array.from(new Set(students.map(s => s.specialization?.id).filter(Boolean))).map(id => {
                                    const spec = students.find(s => s.specialization?.id === id)?.specialization;
                                    return <option key={id} value={id as string}>{spec?.name}</option>;
                                })}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {error && <div className="bg-rose-50 text-rose-600 p-4 rounded-xl font-bold mb-8 border border-rose-100">{error}</div>}
            {success && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl font-bold mb-8 border border-emerald-100">{success}</div>}

            {selectedBatch && !loading && (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* Main Data Entry Grid */}
                    <div className="xl:col-span-3 space-y-6">
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 text-lg">Data Entry Grid</h3>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleAddOfflineSubject}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-bold text-sm transition-colors"
                                    >
                                        <Plus size={16} /> Add Offline Subject
                                    </button>
                                    <button 
                                        onClick={handleSaveData}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                                    >
                                        <Save size={16} /> {saving ? 'Saving...' : 'Save Data'}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-white border-b border-slate-100">
                                            <th className="p-4 font-black text-slate-400 uppercase tracking-wider text-xs sticky left-0 bg-white z-10 w-64 border-r border-slate-100">Intern</th>
                                            <th className="p-4 font-black text-slate-400 uppercase tracking-wider text-xs min-w-[120px] bg-slate-50/50">Attend. %</th>
                                            {offlineSubjects.map(sub => (
                                                <th key={sub.id} className="p-4 font-black text-slate-400 uppercase tracking-wider text-xs min-w-[150px] group bg-indigo-50/30">
                                                    <div className="flex items-center justify-between">
                                                        <span className="truncate" title={sub.name}>{sub.name} (100)</span>
                                                        <button onClick={() => handleRemoveOfflineSubject(sub.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {students.filter(s => !specializationFilter || s.specialization?.id === specializationFilter).map(student => (
                                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 sticky left-0 bg-white z-10 border-r border-slate-100">
                                                    <div className="font-bold text-slate-800">{student.firstName} {student.lastName}</div>
                                                    <div className="text-xs text-slate-500 font-medium">{student.admissionNumber}</div>
                                                </td>
                                                <td className="p-4 bg-slate-50/30">
                                                    <input 
                                                        type="number" 
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        placeholder="%"
                                                        value={attendanceData[student.id] || ''}
                                                        onChange={e => setAttendanceData({...attendanceData, [student.id]: e.target.value})}
                                                    />
                                                </td>
                                                {offlineSubjects.map(sub => (
                                                    <td key={sub.id} className="p-4 bg-indigo-50/10">
                                                        <input 
                                                            type="number" 
                                                            className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            placeholder="Score / 100"
                                                            value={offlineScores[student.id]?.[sub.id] || ''}
                                                            onChange={e => setOfflineScores({
                                                                ...offlineScores,
                                                                [student.id]: {
                                                                    ...offlineScores[student.id],
                                                                    [sub.id]: e.target.value
                                                                }
                                                            })}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {students.length === 0 && (
                                            <tr>
                                                <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">No students found in this batch.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Report Configuration */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6">
                            <h3 className="font-bold text-slate-800 text-lg mb-4">Generate Report</h3>
                            
                            <div className="mb-6">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Include System Assessments</label>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {assessments.length === 0 && <p className="text-sm text-slate-400 italic">No assessments available.</p>}
                                    {assessments.map(a => (
                                        <label key={a.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors border border-slate-100">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-indigo-600 rounded"
                                                checked={selectedAssessments.includes(a.id)}
                                                onChange={e => {
                                                    if (e.target.checked) setSelectedAssessments([...selectedAssessments, a.id]);
                                                    else setSelectedAssessments(selectedAssessments.filter(id => id !== a.id));
                                                }}
                                            />
                                            <div>
                                                <div className="text-sm font-bold text-slate-700">{a.title}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">System Assessment</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => handlePrint()}
                                disabled={students.length === 0}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                            >
                                <Download size={20} /> Generate Batch PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Template */}
            <div className="hidden">
                <ProgressReportPdfTemplate 
                    ref={printRef}
                    batchName={batches.find(b => b.id === selectedBatch)?.name || ''}
                    students={getPdfData()}
                />
            </div>
        </div>
    );
};
