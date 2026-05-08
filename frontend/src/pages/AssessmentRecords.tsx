import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, SearchX } from 'lucide-react';
import api from '../utils/api';

const CLASSES = ['All', 'Level 1', 'Level 2', 'Level 3', 'Advanced'];

export default function AssessmentRecords() {
    const [assessments, setAssessments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('All');

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        try {
            const res = await api.get('/quizzes/all-results');
            setAssessments(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (filteredData.length === 0) return;

        const headers = ['Assessment Title', 'Subject', 'Trainer', 'Level', 'Batch', 'Intern Name', 'ID', 'Score', 'Total Questions', 'Percentage', 'Submitted At'];

        const csvRows = [headers.join(',')];

        filteredData.forEach(item => {
            const pct = Math.round((item.score / item.totalQuestions) * 100);
            const values = [
                item.assessmentTitle,
                item.subject,
                item.teacher,
                item.classLevel,
                item.section,
                item.studentName,
                item.rollNo,
                item.score,
                item.totalQuestions,
                `${pct}%`,
                new Date(item.submittedAt).toLocaleDateString()
            ];
            csvRows.push(values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Historical_Assessments_${new Date().getTime()}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Flatten data for easier tabular display: one row per submission
    const flattenedData: any[] = [];
    assessments.forEach(assessment => {
        if (assessment.submissions && assessment.submissions.length > 0) {
            assessment.submissions.forEach((sub: any) => {
                flattenedData.push({
                    id: sub.id,
                    assessmentTitle: assessment.title,
                    subject: assessment.subject?.name || 'N/A',
                    teacher: assessment.teacher?.user?.name || 'N/A',
                    classLevel: assessment.classLevel,
                    section: assessment.section,
                    studentName: sub.student?.name || 'Unknown',
                    rollNo: sub.student?.admissionNumber || 'N/A',
                    score: sub.score,
                    totalQuestions: sub.totalQuestions,
                    submittedAt: sub.submittedAt
                });
            });
        }
    });

    // Apply filtering
    const filteredData = flattenedData.filter(item => {
        const matchesClass = classFilter === 'All' || item.classLevel === classFilter;
        const searchStr = `${item.assessmentTitle} ${item.studentName} ${item.subject} ${item.teacher}`.toLowerCase();
        const matchesSearch = searchTerm === '' || searchStr.includes(searchTerm.toLowerCase());

        return matchesClass && matchesSearch;
    });

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Historical Assessment Records</h1>
                    <p className="text-slate-500">View and export all intern assessment data across the program.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <select
                        className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        value={classFilter}
                        onChange={e => setClassFilter(e.target.value)}
                    >
                        {CLASSES.map(c => <option key={c} value={c}>{c === 'All' ? 'All Levels' : c}</option>)}
                    </select>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search test, name, subject..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Download size={18} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Assessment</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Subject / Trainer</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Level/Batch</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Intern Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((item, idx) => {
                                const pct = Math.round((item.score / item.totalQuestions) * 100);
                                return (
                                    <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-800">{item.assessmentTitle}</p>
                                            <p className="text-xs text-slate-500">{new Date(item.submittedAt).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-700 font-medium">{item.subject}</p>
                                            <p className="text-xs text-slate-500">{item.teacher}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                {item.classLevel}-{item.section}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-800 font-medium">{item.studentName}</p>
                                            <p className="text-xs text-slate-500">ID: {item.rollNo}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${pct >= 70 ? 'bg-emerald-100 text-emerald-700' :
                                                pct >= 40 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {item.score}/{item.totalQuestions} ({pct}%)
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredData.length === 0 && !loading && (
                    <div className="py-16 flex flex-col items-center justify-center text-slate-500">
                        <SearchX size={48} className="text-slate-200 mb-4" />
                        <p className="text-lg font-medium">No assessment records found</p>
                        <p className="text-sm">Try adjusting your filters or search term.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
