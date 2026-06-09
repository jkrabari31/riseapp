import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Trash2, Save, X, FileText, Pencil } from 'lucide-react';
import api from '../utils/api';

export default function AssignmentBuilder() {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [batches, setBatches] = useState<any[]>([]);
    const [specializations, setSpecializations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        dueDate: '',
        batchId: '',
        specializationId: '',
        subjectId: ''
    });

    const [questions, setQuestions] = useState([{ id: Date.now(), text: '', marks: 5 }]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assignRes, subjRes, batchRes, specRes] = await Promise.all([
                api.get('/assignments/teacher/me'),
                api.get('/subjects'),
                api.get('/scheduler/batches'),
                api.get('/scheduler/specializations')
            ]);
            setAssignments(assignRes.data);
            setSubjects(subjRes.data);
            setBatches(batchRes.data);
            setSpecializations(specRes.data);
            
            setForm(f => ({
                ...f,
                subjectId: subjRes.data.length > 0 ? subjRes.data[0].id : '',
                batchId: batchRes.data.length > 0 ? batchRes.data[0].id : '',
                specializationId: ''
            }));
        } catch (err) {
            console.error('Failed to fetch assignments:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddQuestion = () => {
        setQuestions([...questions, { id: Date.now(), text: '', marks: 5 }]);
    };

    const handleRemoveQuestion = (id: number) => {
        if (questions.length === 1) return;
        setQuestions(questions.filter(q => q.id !== id));
    };

    const handleQuestionChange = (id: number, field: string, value: string | number) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const handleSaveAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            if (questions.some(q => !q.text.trim())) {
                throw new Error("All questions must have text");
            }

            const payload = {
                ...form,
                questionsJSON: JSON.stringify(questions.map(q => ({ text: q.text, marks: q.marks })))
            };

            if (editingId) {
                await api.put(`/assignments/${editingId}`, payload);
            } else {
                await api.post('/assignments', payload);
            }

            setShowModal(false);
            setEditingId(null);
            setQuestions([{ id: Date.now(), text: '', marks: 5 }]);
            setForm({ ...form, title: '', description: '', dueDate: '' });
            fetchData();
        } catch (err: any) {
            setError(err.message || err.response?.data?.message || 'Error saving assignment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (a: any) => {
        setEditingId(a.id);
        setForm({
            title: a.title,
            description: a.description || '',
            dueDate: new Date(a.dueDate).toISOString().split('T')[0],
            batchId: a.batchId || (batches.length > 0 ? batches[0].id : ''),
            specializationId: a.specializationId || '',
            subjectId: a.subjectId
        });
        setQuestions(JSON.parse(a.questionsJSON).map((q: any, i: number) => ({
            id: Date.now() + i,
            text: q.text,
            marks: q.marks
        })));
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this assignment?')) return;
        try {
            await api.delete(`/assignments/${id}`);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };



    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-indigo-600" /> Assignment Engine</h1>
                    <p className="text-slate-500">Create beautiful PDF worksheet assignments for your interns.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition">
                    <Plus size={18} /> New Assignment
                </button>
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-500">Loading assignments...</div>
            ) : assignments.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No assignments created yet</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">Start your first digital worksheet by clicking the "New Assignment" button above.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignments.map(a => (
                        <div key={a.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-2">
                                    <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]" title={a.specialization?.name || a.classLevel}>{a.specialization?.name || a.classLevel}</span>
                                    <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]" title={a.batch?.name || a.section}>{a.batch?.name || a.section}</span>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(a)} className="text-slate-400 hover:text-amber-500 transition-colors" title="Edit">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(a.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">{a.title}</h3>
                            <p className="text-sm font-medium text-slate-500 mb-4">{a.subject?.name}</p>



                            <div className="bg-slate-50 rounded-lg p-3 text-sm">
                                <div className="flex justify-between text-slate-600 mb-1">
                                    <span>Questions:</span>
                                    <span className="font-semibold">{JSON.parse(a.questionsJSON).length}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Due Date:</span>
                                    <span className="font-semibold text-rose-600">{new Date(a.dueDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] my-8">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Build New Assignment</h2>
                                    <p className="text-sm text-slate-500">Draft questions to formulate a printable PDF.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSaveAssignment} className="p-6 overflow-y-auto">
                                {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">{error}</div>}

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Assignment Title</label>
                                        <input required type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Chapter 4 Quiz" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Subject</label>
                                        <select required value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Specialization</label>
                                        <select value={form.specializationId} onChange={e => setForm({ ...form, specializationId: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                            <option value="">All Specializations</option>
                                            {specializations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Batch</label>
                                        <select required value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 text-red-600">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1 text-inherit">Due Date</label>
                                        <input required type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-slate-700 outline-none" />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Instructions (Optional)</label>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20" placeholder="e.g. Please complete all questions and submit by Monday. Show your work." />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-slate-800 text-white p-3 rounded-lg shadow-sm">
                                        <span className="font-bold text-sm tracking-widest uppercase">Question Ledger</span>
                                        <span className="text-xs font-semibold bg-slate-700 px-2 py-1 rounded">Total Marks: {questions.reduce((acc, q) => acc + Number(q.marks), 0)}</span>
                                    </div>

                                    {questions.map((q, idx) => (
                                        <div key={q.id} className="flex gap-4 items-start bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 relative group">
                                            <div className="w-8 h-8 shrink-0 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm mt-1">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <textarea
                                                    required
                                                    value={q.text}
                                                    onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
                                                    className="w-full p-3 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                                    placeholder="Write your question here..."
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Marks: </span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={q.marks}
                                                        onChange={(e) => handleQuestionChange(q.id, 'marks', parseInt(e.target.value) || 0)}
                                                        className="w-20 p-1.5 border border-indigo-200 rounded text-sm text-center font-bold text-indigo-700 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveQuestion(q.id)} disabled={questions.length === 1} className="w-8 h-8 flex items-center justify-center shrink-0 bg-white text-red-500 rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}

                                    <button type="button" onClick={handleAddQuestion} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-semibold hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                                        <Plus size={20} /> Add Another Question
                                    </button>
                                </div>

                                <div className="mt-8 border-t border-slate-200 pt-6 flex justify-end gap-3">
                                    <button type="button" onClick={() => { setShowModal(false); setEditingId(null); setForm({ ...form, title: '', description: '', dueDate: '' }); setQuestions([{ id: Date.now(), text: '', marks: 5 }]); }} className="px-6 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition-colors">Cancel</button>
                                    <button type="submit" disabled={submitting} className="px-6 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-75">
                                        <Save size={18} /> {submitting ? 'Saving...' : editingId ? 'Update Assignment' : 'Save & Distribute Sheet'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
