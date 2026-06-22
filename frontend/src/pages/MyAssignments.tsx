import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileDown, Clock, Search, BookOpen, Eye, X, School, Mail, MapPin } from 'lucide-react';
import api from '../utils/api';
import { useReactToPrint } from 'react-to-print';
import AssignmentPdfTemplate from '../components/AssignmentPdfTemplate';

// ── Markdown renderer for question text ────────────────────────────────────
function RenderText({ text }: { text: string }) {
    if (!text) return null;

    const blocks = text.split(/(```[\s\S]*?```)/g);

    const renderInline = (line: string, key: string) => {
        const tokens = line.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
        return (
            <span key={key}>
                {tokens.map((tok, j) => {
                    if (tok.startsWith('**') && tok.endsWith('**'))
                        return <strong key={j} className="font-extrabold text-slate-900">{tok.slice(2, -2)}</strong>;
                    if (tok.startsWith('*') && tok.endsWith('*'))
                        return <em key={j} className="italic text-indigo-700 font-semibold">{tok.slice(1, -1)}</em>;
                    if (tok.startsWith('`') && tok.endsWith('`'))
                        return <code key={j} className="bg-amber-50 text-rose-600 px-1.5 py-0.5 rounded text-[0.85em] font-mono border border-amber-200 mx-0.5">{tok.slice(1, -1)}</code>;
                    return <span key={j}>{tok}</span>;
                })}
            </span>
        );
    };

    return (
        <div className="space-y-4">
            {blocks.map((block, i) => {
                if (block.startsWith('```') && block.endsWith('```')) {
                    const code = block.slice(3, -3).replace(/^\n/, '');
                    return (
                        <pre key={i} className="bg-gray-900 text-green-400 rounded-xl p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap border border-gray-700 my-2">
                            {code}
                        </pre>
                    );
                }
                // Split by double newline for paragraphs
                const paragraphs = block.split(/\n\n+/);
                return (
                    <div key={i} className="space-y-3">
                        {paragraphs.map((para, pIdx) => {
                            const trimmed = para.trim();
                            if (!trimmed) return null;
                            const lines = trimmed.split('\n');
                            return (
                                <p key={pIdx} className="leading-[1.8] text-slate-700 text-base font-medium">
                                    {lines.map((line, lIdx) => (
                                        <span key={lIdx}>
                                            {lIdx > 0 && <br />}
                                            {renderInline(line, `${i}-${pIdx}-${lIdx}`)}
                                        </span>
                                    ))}
                                </p>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}

export default function MyAssignments() {
    const [children, setChildren] = useState<any[]>([]);
    const [selectedChild, setSelectedChild] = useState<any>(null);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // View modal
    const [viewingAssignment, setViewingAssignment] = useState<any>(null);
    const [schoolSettings, setSchoolSettings] = useState<any>(null);

    // Print State
    const [printData, setPrintData] = useState<any>(null);
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: printData ? `${printData.assignment.title}_${printData.student.name}` : 'Assignment'
    });

    useEffect(() => {
        fetchChildren();
        api.get('/settings').then(res => setSchoolSettings(res.data)).catch(console.error);
    }, []);

    const fetchChildren = async () => {
        try {
            const res = await api.get('/students/parent/me');
            setChildren(res.data);
            if (res.data.length > 0) {
                setSelectedChild(res.data[0]);
                fetchAssignments(res.data[0]);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to fetch children data', error);
            setLoading(false);
        }
    };

    const fetchAssignments = async (child: any) => {
        setLoading(true);
        try {
            const res = await api.get(`/assignments/intern/${child.batchId}/${child.specializationId || 'all'}`);
            setAssignments(res.data);
        } catch (error) {
            console.error('Failed to fetch assignments', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChildSelect = (child: any) => {
        setSelectedChild(child);
        fetchAssignments(child);
    };

    const triggerDownload = (assignment: any) => {
        setPrintData({ assignment, student: selectedChild });
        setTimeout(() => { (handlePrint as any)(); }, 300);
    };

    const filteredAssignments = assignments.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.subject?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                        <BookOpen className="text-indigo-600" /> My Assignments
                    </h1>
                    <p className="text-slate-500">View and download intern worksheets securely.</p>
                </div>

                {children.length > 1 && (
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                        {children.map(child => (
                            <button
                                key={child.id}
                                onClick={() => handleChildSelect(child)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${selectedChild?.id === child.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {child.name} ({child.specialization?.name || 'All Specializations'})
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by title or subject..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-12 text-slate-500">Loading assignments...</div>
                    ) : children.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">No intern records linked to your account.</div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileDown className="text-slate-300" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700">No Assignments Due</h3>
                            <p className="text-slate-500 mt-2">{selectedChild?.name} is all caught up!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredAssignments.map((a: any) => {
                                const isOverdue = new Date(a.dueDate) < new Date();
                                const questionsCount = JSON.parse(a.questionsJSON || '[]').length;

                                return (
                                    <div key={a.id} className="border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition bg-white group flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-xs font-bold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg uppercase tracking-wider">{a.subject?.name}</span>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${isOverdue ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    <Clock size={12} /> {new Date(a.dueDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1 group-hover:text-indigo-700 transition-colors">{a.title}</h3>
                                            {a.description && (
                                                <p className="text-slate-500 text-sm line-clamp-2 mb-3">{a.description}</p>
                                            )}
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-400">{questionsCount} Questions</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setViewingAssignment(a)}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                                                >
                                                    <Eye size={15} /> View
                                                </button>
                                                <button
                                                    onClick={() => triggerDownload(a)}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 transition-colors shadow"
                                                >
                                                    <FileDown size={15} /> PDF
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── View Assignment Modal — full-page feel ──────────────────────── */}
            <AnimatePresence>
                {viewingAssignment && (
                    <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
                            style={{ maxHeight: '92vh' }}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/60 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                                        <BookOpen size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-800">{viewingAssignment.title}</h2>
                                        <p className="text-xs text-slate-400 font-semibold">{viewingAssignment.subject?.name} · {viewingAssignment.specialization?.name || 'All Specializations'} ({viewingAssignment.batch?.name || 'No Batch'})</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => triggerDownload(viewingAssignment)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-indigo-600 transition-colors"
                                    >
                                        <FileDown size={15} /> Download PDF
                                    </button>
                                    <button onClick={() => setViewingAssignment(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Scrollable Body */}
                            <div className="overflow-y-auto flex-1 px-8 py-8 md:px-12 space-y-8">

                                {/* School header */}
                                {schoolSettings && (
                                    <div className="text-center border-b-2 border-slate-800 pb-6">
                                        <div className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center mx-auto mb-2">
                                            <School size={22} />
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-wider text-slate-900">{schoolSettings.instituteName}</h3>
                                        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500 mt-1">
                                            <span className="flex items-center gap-1"><MapPin size={10} /> {schoolSettings.address}</span>
                                            <span className="flex items-center gap-1"><Mail size={10} /> {schoolSettings.contactEmail}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Assignment title & meta */}
                                <div className="text-center">
                                    <h4 className="text-xl font-black uppercase tracking-wider underline underline-offset-4 text-slate-800">{viewingAssignment.title}</h4>
                                    <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs font-bold text-slate-500 uppercase">
                                        <span>Subject: <span className="text-slate-900">{viewingAssignment.subject?.name}</span></span>
                                        <span>Total: <span className="text-slate-900">{JSON.parse(viewingAssignment.questionsJSON || '[]').reduce((s: number, q: any) => s + Number(q.marks), 0)} Marks</span></span>
                                        <span className={`px-2 py-0.5 rounded-full ${new Date(viewingAssignment.dueDate) < new Date() ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            Due: {new Date(viewingAssignment.dueDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Student info */}
                                {selectedChild && (
                                    <div className="border-2 border-slate-200 rounded-2xl p-4 flex justify-between items-center bg-slate-50">
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Intern</p>
                                            <p className="font-black text-slate-800">{selectedChild.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Roll / Admission</p>
                                            <p className="font-black text-slate-800">{selectedChild.rollNumber || '—'} / {selectedChild.admissionNumber}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Instructions */}
                                {viewingAssignment.description && (
                                    <div className="border-l-4 border-indigo-400 pl-4 py-1 bg-indigo-50/40 rounded-r-xl">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Instructions</p>
                                        <p className="text-sm text-slate-700 italic">{viewingAssignment.description}</p>
                                    </div>
                                )}

                                {/* Questions — full width with rich text */}
                                <div className="space-y-6">
                                    {JSON.parse(viewingAssignment.questionsJSON || '[]').map((q: any, idx: number) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.06 }}
                                            className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors"
                                        >
                                            <div className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-indigo-600/20">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-slate-800 font-medium leading-relaxed">
                                                    <RenderText text={q.text} />
                                                </div>
                                            </div>
                                            <span className="text-xs font-black text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 h-fit">
                                                [{q.marks} Marks]
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Signature row */}
                                <div className="mt-8 pt-6 flex justify-between border-t border-slate-200 px-4">
                                    <div className="text-center">
                                        <div className="w-36 border-b-2 border-slate-700 mb-1" />
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trainer Signature</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-36 border-b-2 border-slate-700 mb-1" />
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Intern Signature</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Hidden PDF print target */}
            <div className="hidden">
                <div ref={componentRef}>
                    {printData && <AssignmentPdfTemplate assignment={printData.assignment} student={printData.student} />}
                </div>
            </div>
        </motion.div>
    );
}
