import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Send, BookOpen, ClipboardList, Users, Star, X, Pencil, Sparkles, Loader2 } from 'lucide-react';
import api from '../utils/api';

interface MCQQuestion {
    question: string;
    options: [string, string, string, string];
    correctIndex: number;
}

const CLASSES = ['Level 1', 'Level 2', 'Level 3', 'Advanced'];
const SECTIONS = ['Full Stack', 'Backend', 'Frontend', 'Mobile', 'DevOps'];

export default function QuizBuilder() {
    const [activeTab, setActiveTab] = useState<'create' | 'my-quizzes'>('my-quizzes');
    const [subjects, setSubjects] = useState<any[]>([]);
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
    const [results, setResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
    const [batches, setBatches] = useState<any[]>([]);
    const [specializations, setSpecializations] = useState<any[]>([]);

    // AI Quiz Generator state
    const [showAIModal, setShowAIModal] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [aiForm, setAiForm] = useState({
        subject: '', topic: '', focusing: '', difficulty: 'medium', language: 'English', count: 5
    });

    const [form, setForm] = useState({
        title: '',
        description: '',
        batchId: '',
        specializationId: '',
        classLevel: 'Level 1', // Legacy fallback
        section: 'Full Stack', // Legacy fallback
        subjectId: '',
        dueDate: '',
        timeLimit: '30',
    });

    const [questions, setQuestions] = useState<MCQQuestion[]>([
        { question: '', options: ['', '', '', ''], correctIndex: 0 }
    ]);

    useEffect(() => {
        api.get('/subjects').then(r => setSubjects(r.data)).catch(console.error);
        api.get('/scheduler/batches').then(r => setBatches(r.data)).catch(console.error);
        api.get('/scheduler/specializations').then(r => setSpecializations(r.data)).catch(console.error);
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const res = await api.get('/quizzes/teacher/me');
            setQuizzes(res.data);
        } catch (e) { console.error(e); }
    };

    const addQuestion = () => {
        setQuestions(prev => [...prev, { question: '', options: ['', '', '', ''], correctIndex: 0 }]);
    };

    const removeQuestion = (idx: number) => {
        setQuestions(prev => prev.filter((_, i) => i !== idx));
    };

    // ── Gemini AI Quiz Generator ─────────────────────────────────────────
    const handleAIGenerate = async () => {
        if (!aiForm.subject || !aiForm.topic) return;
        setIsGeneratingAI(true);
        try {
            const res = await api.post('/ai/generate-quiz', aiForm);
            if (res.data.success && res.data.data) {
                const aiQuestions: MCQQuestion[] = res.data.data.map((q: any) => {
                    const correctIdx = q.options.findIndex((o: string) => o === q.correctAnswer);
                    return {
                        question: q.question,
                        options: q.options.slice(0, 4) as [string, string, string, string],
                        correctIndex: correctIdx >= 0 ? correctIdx : 0
                    };
                });
                setQuestions(prev => [...prev.filter(q => q.question.trim() !== ''), ...aiQuestions]);
                setShowAIModal(false);
            }
        } catch (err) {
            console.error('AI generation failed:', err);
        } finally {
            setIsGeneratingAI(false);
        }
    };



    const updateOption = (qIdx: number, optIdx: number, value: string) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q;
            const newOpts = [...q.options] as [string, string, string, string];
            newOpts[optIdx] = value;
            return { ...q, options: newOpts };
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            if (editingQuizId) {
                // Update existing quiz
                await api.put(`/quizzes/${editingQuizId}`, { ...form, questions });
            } else {
                // Create new quiz
                await api.post('/quizzes', { ...form, questions });
            }
            setActiveTab('my-quizzes');
            setEditingQuizId(null);
            fetchQuizzes();
            setForm({ title: '', description: '', batchId: '', specializationId: '', classLevel: 'Level 1', section: 'Full Stack', subjectId: '', dueDate: '', timeLimit: '30' });
            setQuestions([{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);
        } catch (err: any) {
            setError(err.response?.data?.message || (editingQuizId ? 'Error updating quiz' : 'Error creating quiz'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (quiz: any) => {
        const qs = JSON.parse(quiz.questionsJSON || '[]');
        setEditingQuizId(quiz.id);
        setForm({
            title: quiz.title,
            description: quiz.description || '',
            batchId: quiz.batchId || '',
            specializationId: quiz.specializationId || '',
            classLevel: quiz.classLevel || 'Level 1',
            section: quiz.section || 'Full Stack',
            subjectId: quiz.subjectId,
            dueDate: new Date(quiz.dueDate).toISOString().split('T')[0],
            timeLimit: String(quiz.timeLimit),
        });
        setQuestions(qs.length > 0 ? qs : [{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);
        setActiveTab('create');
        setError('');
    };

    const handleCancelEdit = () => {
        setEditingQuizId(null);
        setForm({ title: '', description: '', batchId: '', specializationId: '', classLevel: 'Level 1', section: 'Full Stack', subjectId: '', dueDate: '', timeLimit: '30' });
        setQuestions([{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);
        setActiveTab('my-quizzes');
    };

    const handleViewResults = async (quiz: any) => {
        setSelectedQuiz(quiz);
        try {
            const res = await api.get(`/quizzes/${quiz.id}/results`);
            setResults(res.data);
            setShowResults(true);
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/quizzes/${id}`);
            fetchQuizzes();
        } catch (e) { console.error(e); }
    };

    const handleToggleRelease = async (quiz: any) => {
        try {
            await api.patch(`/quizzes/${quiz.id}/toggle-release`, { isReleased: !quiz.isReleased });
            fetchQuizzes();
        } catch (e) { console.error(e); }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">MCQ Assessments</h1>
                    <p className="text-slate-500">Create auto-graded quizzes for your program.</p>
                </div>
                <button onClick={() => { setEditingQuizId(null); setForm({ title: '', description: '', batchId: '', specializationId: '', classLevel: 'Level 1', section: 'Full Stack', subjectId: '', dueDate: '', timeLimit: '30' }); setQuestions([{ question: '', options: ['', '', '', ''], correctIndex: 0 }]); setActiveTab('create'); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors">
                    <Plus size={18} /> Create Quiz
                </button>
            </div>

            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-fit">
                {(['my-quizzes', 'create'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {tab === 'my-quizzes' ? 'My Quizzes' : 'Create Quiz'}
                    </button>
                ))}
            </div>

            {activeTab === 'my-quizzes' && (
                <div className="space-y-4">
                    {quizzes.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <ClipboardList className="w-12 h-12 text-indigo-200 mx-auto mb-3" />
                            <p className="text-slate-500">No quizzes yet. Create your first MCQ assessment!</p>
                        </div>
                    ) : (
                        quizzes.map((quiz: any) => {
                            const qs = JSON.parse(quiz.questionsJSON || '[]');
                            return (
                                <div key={quiz.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <BookOpen size={18} className="text-indigo-500" />
                                            <h3 className="font-bold text-slate-800">{quiz.title}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${quiz.isReleased ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {quiz.isReleased ? 'Live' : 'Draft'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500">{quiz.subject?.name} | {quiz.specialization?.name || 'All Spec'} | {quiz.batch?.name || 'No Batch'} | {qs.length} questions | {quiz.timeLimit} min</p>
                                        <p className="text-xs text-slate-400 mt-1">Due: {new Date(quiz.dueDate).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex gap-4 shrink-0 items-center">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Release</span>
                                            <button 
                                                onClick={() => handleToggleRelease(quiz)} 
                                                className={`relative w-11 h-6 rounded-full transition-colors duration-200 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${quiz.isReleased ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                title={quiz.isReleased ? "Unrelease Quiz (Hide from interns)" : "Release Quiz (Show to interns)"}
                                            >
                                                <motion.div 
                                                    animate={{ x: quiz.isReleased ? 22 : 4 }}
                                                    initial={false}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                                />
                                            </button>
                                        </div>
                                        <button onClick={() => handleViewResults(quiz)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium">
                                            <Users size={14} /> Results
                                        </button>
                                        <button onClick={() => handleEdit(quiz)} className="flex items-center gap-1 p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg" title="Edit Quiz">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(quiz.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Delete Quiz">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {activeTab === 'create' && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {editingQuizId && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-medium">
                            <Pencil size={16} className="text-amber-500" />
                            You are editing an existing quiz. Changes will overwrite the current version.
                        </div>
                    )}
                    {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                        <h2 className="font-bold text-slate-800 text-lg">Quiz Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title*</label>
                                <input required className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Chapter 3 - Fractions Quiz" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Subject*</label>
                                <select required className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Batch*</label>
                                    <select required className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })}>
                                        <option value="">Select Batch</option>
                                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Specialization (Optional)</label>
                                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={form.specializationId} onChange={e => setForm({ ...form, specializationId: e.target.value })}>
                                        <option value="">All Specializations</option>
                                        {specializations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date*</label>
                                <input required type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Time Limit (minutes)</label>
                                <input type="number" min="5" max="180" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={form.timeLimit} onChange={e => setForm({ ...form, timeLimit: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    {/* AI Generate Button — right-aligned with glow animation */}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowAIModal(true)}
                            className="relative group flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 font-semibold text-sm shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.98]"
                        >
                            {/* Animated glow ring */}
                            <span className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500 -z-10 animate-pulse" />
                            <Sparkles size={16} className="animate-[spin_3s_linear_infinite]" />
                            Generate with AI
                        </button>
                    </div>

                    <div className="space-y-4">
                        <h2 className="font-bold text-slate-800 text-lg">Questions ({questions.length})</h2>
                        {questions.map((q, qIdx) => (
                            <div key={qIdx} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Q{qIdx + 1}</span>
                                    {questions.length > 1 && (
                                        <button type="button" onClick={() => removeQuestion(qIdx)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    )}
                                </div>
                                <textarea
                                    required
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm mb-1 font-medium resize-y min-h-[80px]"
                                    placeholder="Type your question here...&#10;&#10;Press Enter for a new line. Leave a blank line for a new paragraph.&#10;Use **bold**, *italic*, `code` for formatting."
                                    value={q.question}
                                    onChange={e => setQuestions(prev => prev.map((pq, i) => i === qIdx ? { ...pq, question: e.target.value } : pq))}
                                />
                                <p className="text-[10px] text-slate-400 mb-4 px-1">💡 Tip: Use blank lines to separate paragraphs · **bold** · *italic* · `code`</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {q.options.map((opt, optIdx) => (
                                        <div key={optIdx} className={`flex items-center gap-3 px-3 py-2.5 border rounded-xl transition-all ${q.correctIndex === optIdx ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                                            <input
                                                type="radio"
                                                name={`correct-${qIdx}`}
                                                checked={q.correctIndex === optIdx}
                                                onChange={() => setQuestions(prev => prev.map((pq, i) => i === qIdx ? { ...pq, correctIndex: optIdx } : pq))}
                                                className="accent-emerald-600"
                                            />
                                            <input
                                                required
                                                className="flex-1 bg-transparent text-sm outline-none text-slate-700"
                                                placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                                value={opt}
                                                onChange={e => updateOption(qIdx, optIdx, e.target.value)}
                                            />
                                            {q.correctIndex === optIdx && <Star size={14} className="text-emerald-500" />}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 mt-2 ml-1">🟢 Select the radio button next to the correct answer</p>
                            </div>
                        ))}

                        <button type="button" onClick={addQuestion} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl hover:bg-indigo-50 font-medium text-sm w-full justify-center">
                            <Plus size={18} /> Add Question
                        </button>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={handleCancelEdit} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                        <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50">
                            {editingQuizId ? <Pencil size={16} /> : <Send size={16} />}
                            {submitting ? (editingQuizId ? 'Saving...' : 'Creating...') : (editingQuizId ? 'Save Changes' : 'Create Quiz')}
                        </button>
                    </div>
                </form>
            )}

            {/* AI Generator Modal */}
            <AnimatePresence>
                {showAIModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800">AI Quiz Generator</h2>
                                        <p className="text-xs text-slate-400">Powered by Gemini</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAIModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Mathematics" value={aiForm.subject} onChange={e => setAiForm({ ...aiForm, subject: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Topic *</label>
                                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Quadratic Equations" value={aiForm.topic} onChange={e => setAiForm({ ...aiForm, topic: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Specific Focus (optional)</label>
                                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Word problems, Factoring" value={aiForm.focusing} onChange={e => setAiForm({ ...aiForm, focusing: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                                        <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={aiForm.difficulty} onChange={e => setAiForm({ ...aiForm, difficulty: e.target.value })}>
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
                                        <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={aiForm.language} onChange={e => setAiForm({ ...aiForm, language: e.target.value })}>
                                            <option value="English">English</option>
                                            <option value="Hindi">Hindi</option>
                                            <option value="Gujarati">Gujarati</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Questions</label>
                                        <input type="number" min="1" max="20" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={aiForm.count} onChange={e => setAiForm({ ...aiForm, count: Number(e.target.value) })} />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={() => setShowAIModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                                <button
                                    onClick={handleAIGenerate}
                                    disabled={isGeneratingAI || !aiForm.subject || !aiForm.topic}
                                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-medium text-sm disabled:opacity-50 shadow-lg shadow-purple-500/20"
                                >
                                    {isGeneratingAI ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate Questions</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Results Modal */}
            <AnimatePresence>
                {showResults && selectedQuiz && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Quiz Results</h2>
                                    <p className="text-sm text-slate-500">{selectedQuiz.title} — {results.length} submitted</p>
                                </div>
                                <button onClick={() => setShowResults(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                            </div>
                            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                                {results.length === 0 ? (
                                    <p className="text-center text-slate-500 py-8">No submissions yet.</p>
                                ) : (
                                    results.map((sub: any, i: number) => {
                                        const pct = Math.round((sub.score / sub.totalQuestions) * 100);
                                        return (
                                            <div key={sub.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-400 text-sm font-medium w-6">#{i + 1}</span>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{sub.student?.name}</p>
                                                        <p className="text-xs text-slate-500">ID: {sub.student?.admissionNumber || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${pct >= 70 ? 'bg-emerald-100 text-emerald-700' : pct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                                                        {sub.score}/{sub.totalQuestions} ({pct}%)
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
