import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Timer, ChevronRight, ChevronLeft, CheckCircle, ClipboardList,
    Lock, AlertTriangle, Maximize, BookOpen, Clock, Shield, Star,
    ListChecks, XCircle, Eye
} from 'lucide-react';
import api from '../utils/api';

// ── Rich-text renderer — supports **bold**, *italic*, `inline code`, ```blocks```
function RenderQuestion({ text }: { text: string }) {
    if (!text) return null;

    // First split out code blocks, then handle paragraphs inside normal text
    const blocks = text.split(/(```[\s\S]*?```)/g);

    const renderInline = (line: string, key: string) => {
        const tokens = line.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
        return (
            <span key={key}>
                {tokens.map((tok, j) => {
                    if (tok.startsWith('**') && tok.endsWith('**'))
                        return <strong key={j} className="font-black text-slate-900">{tok.slice(2, -2)}</strong>;
                    if (tok.startsWith('*') && tok.endsWith('*'))
                        return <em key={j} className="italic text-indigo-700 font-bold">{tok.slice(1, -1)}</em>;
                    if (tok.startsWith('`') && tok.endsWith('`'))
                        return <code key={j} className="bg-amber-50 text-rose-700 px-2 py-0.5 rounded-lg text-base font-black font-mono border border-amber-200 mx-0.5">{tok.slice(1, -1)}</code>;
                    return <span key={j}>{tok}</span>;
                })}
            </span>
        );
    };

    return (
        <div className="space-y-5">
            {blocks.map((block, i) => {
                if (block.startsWith('```') && block.endsWith('```')) {
                    const code = block.slice(3, -3).replace(/^\n/, '');
                    return (
                        <pre key={i} className="bg-gray-900 text-green-400 rounded-2xl p-6 text-base font-mono overflow-x-auto whitespace-pre-wrap border border-gray-700 shadow-2xl">
                            {code}
                        </pre>
                    );
                }

                // Split by double newline for paragraphs
                const paragraphs = block.split(/\n\n+/);
                return (
                    <div key={i} className="space-y-4">
                        {paragraphs.map((para, pIdx) => {
                            const trimmed = para.trim();
                            if (!trimmed) return null;
                            // Handle single newlines as line breaks within a paragraph
                            const lines = trimmed.split('\n');
                            return (
                                <p key={pIdx} className="leading-[1.8] text-slate-800 text-lg md:text-xl font-medium">
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

export default function TakeQuiz() {
    const [children, setChildren] = useState<any[]>([]);
    const [selectedChild, setSelectedChild] = useState<any>(null);
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Active quiz state
    const [activeQuiz, setActiveQuiz] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<(number | null)[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState<{ score: number, total: number } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState<Record<string, boolean>>({});

    // Anti-cheat
    const [cheatingWarning, setCheatingWarning] = useState(false);
    const [cheatingCount, setCheatingCount] = useState(0);
    const timerRef = useRef<any>(null);
    const submittingRef = useRef(false);

    // New Secure Assessment State
    const [showInstructions, setShowInstructions] = useState(false);
    const [hasAgreed, setHasAgreed] = useState(false);

    // Review pending panel (during the assessment)
    const [showPendingReview, setShowPendingReview] = useState(false);

    // Answer review after submission
    const [showAnswerReview, setShowAnswerReview] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // ── Fullscreen & visibility detection ──────────────────────────────
    useEffect(() => {
        if (!activeQuiz || submitted) return;

        const onVisibility = () => {
            if (document.visibilityState === 'hidden') {
                setCheatingCount(prev => {
                    const next = prev + 1;
                    if (next >= 2) { forceSubmit(); } else { setCheatingWarning(true); }
                    return next;
                });
            }
        };

        const onFullscreen = () => {
            if (!document.fullscreenElement && activeQuiz && !submitted) {
                setCheatingCount(prev => {
                    const next = prev + 1;
                    if (next >= 2) { forceSubmit(); } else { setCheatingWarning(true); }
                    return next;
                });
            }
        };

        document.addEventListener('visibilitychange', onVisibility);
        document.addEventListener('fullscreenchange', onFullscreen);

        // Keyboard Lock & Right-Click Lock
        const blockKeys = (e: KeyboardEvent) => {
            // Allow basic mouse clicks and maybe minimal interaction, but block all keyboard events
            e.preventDefault();
            return false;
        };

        const blockContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            return false;
        };

        window.addEventListener('keydown', blockKeys);
        window.addEventListener('contextmenu', blockContextMenu);
        window.addEventListener('copy', e => e.preventDefault());
        window.addEventListener('paste', e => e.preventDefault());

        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            document.removeEventListener('fullscreenchange', onFullscreen);
            window.removeEventListener('keydown', blockKeys);
            window.removeEventListener('contextmenu', blockContextMenu);
        };
    }, [activeQuiz, submitted, showInstructions, hasAgreed]);

    // Camera Access
    useEffect(() => {
        if (showInstructions && !submitted) {
            const startCamera = async () => {
                try {
                    const s = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
                    setStream(s);
                    if (videoRef.current) videoRef.current.srcObject = s;
                } catch (e) {
                    console.warn('Camera access denied or not found:', e);
                    setCameraError(true);
                }
            };
            startCamera();
        } else if (submitted && stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [showInstructions, submitted]);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, activeQuiz]);

    useEffect(() => { fetchChildren(); }, []);
    useEffect(() => { if (selectedChild) fetchQuizzes(selectedChild); }, [selectedChild]);

    // Countdown timer — starts once instructions are dismissed and timeLeft has been seeded
    useEffect(() => {
        if (activeQuiz && !showInstructions && timeLeft > 0 && !submitted) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [activeQuiz, submitted, showInstructions]);

    const fetchChildren = async () => {
        try {
            const res = await api.get('/students/parent/me');
            setChildren(res.data);
            if (res.data.length > 0) setSelectedChild(res.data[0]);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchQuizzes = async (child: any) => {
        try {
            const res = await api.get(`/quizzes/intern/${child.batchId}/${child.specializationId || 'all'}`);
            const quizList = res.data;
            const statuses: Record<string, boolean> = {};
            await Promise.all(quizList.map(async (q: any) => {
                try {
                    const s = await api.get(`/quizzes/${q.id}/status/${child.id}`);
                    statuses[q.id] = s.data.submitted;
                } catch { }
            }));
            setSubmissionStatus(statuses);
            setQuizzes(quizList);
        } catch (e) { console.error(e); }
    };

    const startQuiz = async (quiz: any) => {
        const qs = JSON.parse(quiz.questionsJSON);
        setActiveQuiz(quiz);
        setQuestions(qs);
        setAnswers(new Array(qs.length).fill(null));
        setCurrentQ(0);
        setSubmitted(false);
        setResult(null);
        setCheatingCount(0);
        setCheatingWarning(false);
        setShowInstructions(true);
        setHasAgreed(false);
    };

    const confirmStart = async () => {
        if (!hasAgreed) return;
        try { await document.body.requestFullscreen(); } catch (_) { }
        setShowInstructions(false);
        setTimeLeft(activeQuiz.timeLimit * 60);
    };

    const handleSubmit = async () => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        clearInterval(timerRef.current);
        setSubmitting(true);
        setSubmitted(true);
        try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (_) { }
        try {
            const finalAnswers = answers.map(a => a ?? -1);
            const res = await api.post(`/quizzes/${activeQuiz.id}/submit`, {
                studentId: selectedChild.id,
                answers: finalAnswers
            });
            setResult({ score: res.data.score, total: res.data.totalQuestions });
            fetchQuizzes(selectedChild);
        } catch (e) { console.error(e); }
        finally { setSubmitting(false); submittingRef.current = false; }
    };

    const forceSubmit = () => {
        setCheatingWarning(false);
        handleSubmit();
    };

    const resumeFullscreen = async () => {
        try { await document.body.requestFullscreen(); } catch (_) { forceSubmit(); return; }
        setCheatingWarning(false);
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                <p className="text-slate-500 font-medium">Connecting to assessment server...</p>
            </div>
        </div>
    );
    if (children.length === 0) return <div className="p-8 text-center text-slate-500">No interns linked to your account.</div>;

    // ════════════════════════════════════════════════════════════════
    //  ANTI-CHEAT WARNING OVERLAY
    // ════════════════════════════════════════════════════════════════
    if (cheatingWarning && activeQuiz && !submitted && !showInstructions) {
        return (
            <div className="fixed inset-0 z-[300] bg-red-900/95 backdrop-blur-xl flex items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl p-14 max-w-lg w-full text-center shadow-2xl border-t-8 border-red-600"
                >
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                        <AlertTriangle className="text-red-600 w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-3">Focus Violation!</h2>
                    <p className="text-slate-600 font-medium text-lg mb-4 leading-relaxed">
                        You left the assessment window. This is strictly recorded.
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-8">
                        <p className="text-red-700 font-black text-sm uppercase tracking-wider">
                            ⚠ Warning {cheatingCount} of 2 — FINAL WARNING.
                        </p>
                    </div>
                    <button
                        onClick={resumeFullscreen}
                        className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all"
                    >
                        <Maximize size={22} /> I pledge to stay in the Assessment Room
                    </button>
                </motion.div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════
    //  INSTRUCTION SCREEN — NTA Style
    // ════════════════════════════════════════════════════════════════
    if (activeQuiz && showInstructions && !submitted) {
        return (
            <div className="fixed inset-0 z-[250] bg-slate-100 flex items-center justify-center p-6 overflow-y-auto">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full border border-slate-200 flex flex-col md:flex-row overflow-hidden max-h-[90vh]"
                >
                    {/* Instructions Content */}
                    <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <BookOpen size={24} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Examination Instructions</h1>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{activeQuiz.title}</p>
                            </div>
                        </div>

                        <div className="space-y-6 text-slate-600 leading-relaxed font-medium">
                            <section>
                                <h3 className="font-black text-slate-800 mb-2 uppercase text-xs tracking-wider">General Guidelines</h3>
                                <ul className="list-disc pl-5 space-y-2 text-sm italic">
                                    <li>The assessment consists of {questions.length} questions to be completed in {activeQuiz.timeLimit} minutes.</li>
                                    <li>Each question is mandatory. There is no negative marking unless specified.</li>
                                    <li>Ensure a stable internet connection before starting the timer.</li>
                                </ul>
                            </section>

                            <section className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                                <h3 className="font-black text-amber-800 mb-2 uppercase text-xs tracking-wider flex items-center gap-2">
                                    <Shield size={16} /> Anti-Cheat & Proctoring Rules
                                </h3>
                                <ul className="list-disc pl-5 space-y-2 text-sm text-amber-900/80">
                                    <li><strong className="font-black text-amber-900">Screen Lock</strong>: Switching tabs or minimizing the window is strictly prohibited.</li>
                                    <li><strong className="font-black text-amber-900">Keyboard Lock</strong>: All keyboard functions are disabled. Use only your mouse to select answers.</li>
                                    <li><strong className="font-black text-amber-900">Camera Monitoring</strong>: Your live feed will be displayed in the corner. Stay within the frame.</li>
                                    <li><strong className="font-black text-amber-900">Violation Limit</strong>: You are allowed maximum 1 violation. The 2nd violation will trigger **Force Auto-Submit**.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="font-black text-slate-800 mb-2 uppercase text-xs tracking-wider">Proctoring Status</h3>
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                                    <p className="text-xs font-bold text-slate-500 italic">Self-Monitoring Camera initialized. System ready for proctoring.</p>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Sidebar / Agreement */}
                    <div className="md:w-80 bg-slate-50 border-l border-slate-200 p-10 flex flex-col justify-between">
                        <div>
                            <div className="aspect-video bg-black rounded-2xl mb-8 overflow-hidden shadow-xl border-4 border-white relative group">
                                {stream ? (
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transition-all duration-500" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center">
                                        <AlertTriangle size={32} className="text-amber-500" />
                                        <p className="text-[10px] font-black uppercase tracking-tighter leading-tight">Camera not detected. Proceeding without feed.</p>
                                    </div>
                                )}
                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest rounded-md animate-pulse">Live Feed</div>
                            </div>
                            
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="mt-1 w-5 h-5 rounded-md border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                                    checked={hasAgreed}
                                    onChange={e => setHasAgreed(e.target.checked)}
                                />
                                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors leading-relaxed">
                                    I have read the instructions and I pledge to give the assessment honestly.
                                </span>
                            </label>
                        </div>

                        <button
                            onClick={confirmStart}
                            disabled={!hasAgreed}
                            className="mt-10 w-full py-4 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-30 disabled:shadow-none hover:-translate-y-1"
                        >
                            I am ready to begin
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════
    //  ACTIVE EXAM INTERFACE — full screen, professional
    // ════════════════════════════════════════════════════════════════
    if (activeQuiz && !submitted) {
        const q = questions[currentQ];
        const urgent = timeLeft <= 60;
        const answered = answers.filter(a => a !== null).length;
        const progress = (answered / questions.length) * 100;

        return (
            <div className="fixed inset-0 h-[100dvh] w-screen z-[200] bg-slate-50 flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

                {/* ── TOP BAR ──────────────────────────────────────────────── */}
                <div className="bg-white border-b border-slate-200 px-6 md:px-10 flex items-center justify-between h-20 shrink-0 shadow-sm">

                    {/* Left: Exam branding */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Shield size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-base font-black text-slate-800 leading-none">{activeQuiz.title}</h1>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">{activeQuiz.subject?.name} • {selectedChild?.name}</p>
                        </div>
                    </div>

                    {/* Center: Progress dots (hidden on mobile) */}
                    <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto max-w-[40vw]">
                        {questions.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentQ(i)}
                                className={`w-7 h-7 rounded-full text-[10px] font-black transition-all flex items-center justify-center ${
                                    i === currentQ
                                        ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-600/30'
                                        : answers[i] !== null
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>

                    {/* Right: Timer */}
                    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-mono font-black text-2xl transition-all ${
                        urgent
                            ? 'bg-red-50 text-red-600 border-2 border-red-200 animate-pulse'
                            : 'bg-slate-50 text-slate-700 border border-slate-200'
                    }`}>
                        <Timer size={22} className={urgent ? 'text-red-500' : 'text-slate-400'} />
                        {formatTime(timeLeft)}
                    </div>
                </div>

                {/* Camera overlay moved to options panel */}

                {/* ── PROGRESS BAR ──────────────────────────────────────────── */}
                <div className="h-1.5 bg-slate-100 shrink-0">
                    <motion.div
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-indigo-500 transition-all"
                    />
                </div>

                {/* ── MAIN CONTENT — scrollable ─────────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 h-full">

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentQ}
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col lg:flex-row gap-8 h-full"
                            >
                                {/* ── QUESTION PANEL ──────────────────────────────── */}
                                <div className="lg:flex-1 bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col">
                                    {/* Question header */}
                                    <div className="bg-indigo-600 px-8 py-5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 bg-white/20 text-white rounded-full flex items-center justify-center font-black text-sm">
                                                {currentQ + 1}
                                            </span>
                                            <span className="text-indigo-100 font-bold text-sm uppercase tracking-wider">
                                                Question {currentQ + 1} / {questions.length}
                                            </span>
                                        </div>
                                        <span className="text-indigo-200 text-xs font-bold uppercase tracking-widest">
                                            {answered} / {questions.length} Answered
                                        </span>
                                    </div>
                                    {/* Question body */}
                                    <div className="flex-1 p-8 md:p-12 flex items-start">
                                        <RenderQuestion text={q.question} />
                                    </div>
                                </div>

                                {/* ── OPTIONS PANEL ───────────────────────────────── */}
                                <div className="lg:w-96 xl:w-[480px] flex flex-col gap-4 justify-start">
                                    {/* ── CAMERA MONITORING INLINE ────────────────────────────── */}
                                    {!submitted && (
                                        <div className="w-full max-w-[280px] mx-auto xl:max-w-xs aspect-video bg-black rounded-2xl overflow-hidden shadow-md border-4 border-white group relative mb-2">
                                            {stream ? (
                                                <video 
                                                    autoPlay 
                                                    playsInline 
                                                    muted 
                                                    ref={(el) => { if(el && stream) el.srcObject = stream; }}
                                                    className="w-full h-full object-cover transition-all duration-700" 
                                                />
                                            ) : cameraError ? (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-2 text-center">
                                                    <AlertTriangle size={24} className="text-amber-500 mb-1" />
                                                    <span className="text-[8px] font-black uppercase">Monitoring Disabled</span>
                                                </div>
                                            ) : (
                                                <div className="w-full h-full animate-pulse bg-slate-900" />
                                            )}
                                            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-600 text-white text-[7px] font-black uppercase tracking-widest rounded shadow-sm">Proctor Active</div>
                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                                <p className="text-[7px] font-bold text-white uppercase text-center tracking-tighter">Stay focused in the frame</p>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-1">
                                        Select one answer
                                    </p>
                                    {q.options.map((opt: string, optIdx: number) => {
                                        const selected = answers[currentQ] === optIdx;
                                        return (
                                            <motion.button
                                                key={optIdx}
                                                whileTap={{ scale: 0.98 }}
                                                type="button"
                                                onClick={() => setAnswers(prev => prev.map((a, i) => i === currentQ ? optIdx : a))}
                                                className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-4 group ${
                                                    selected
                                                        ? 'border-indigo-600 bg-indigo-600 shadow-xl shadow-indigo-600/20 text-white'
                                                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700'
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 transition-all ${
                                                    selected
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                                                }`}>
                                                    {String.fromCharCode(65 + optIdx)}
                                                </div>
                                                <span className={`font-semibold text-base leading-snug ${selected ? 'text-white' : 'text-slate-700'}`}>
                                                    {opt}
                                                </span>
                                                {selected && (
                                                    <CheckCircle size={20} className="ml-auto text-white shrink-0" />
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── BOTTOM NAVIGATION ─────────────────────────────────────── */}
                <div className="bg-white border-t border-slate-200 px-4 md:px-10 py-3 md:py-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
                    <button
                        onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                        disabled={currentQ === 0}
                        className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-all disabled:opacity-0"
                    >
                        <ChevronLeft size={20} /> <span className="hidden md:inline">Previous</span>
                    </button>

                    {/* Mobile progress */}
                    <div className="flex flex-col items-center gap-1 lg:hidden">
                        <p className="text-xs font-black text-slate-400">{answered}/{questions.length} answered</p>
                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-end">
                        {answers.includes(null) && (
                            <button
                                onClick={() => setShowPendingReview(true)}
                                className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 font-black text-xs md:text-sm transition-all"
                            >
                                <ListChecks size={18} />
                                <span className="hidden md:inline">Review Pending ({answers.filter(a => a === null).length})</span>
                                <span className="inline md:hidden">Review</span>
                            </button>
                        )}

                        {currentQ < questions.length - 1 ? (
                            <button
                                onClick={() => setCurrentQ(prev => prev + 1)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 md:px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-black shadow-lg shadow-indigo-600/20 transition-all"
                            >
                                {answers[currentQ] === null ? 'Skip' : 'Next'} <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || answers.includes(null)}
                                title={answers.includes(null) ? 'Answer all questions before submitting' : ''}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 md:px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-black disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 transition-all text-sm md:text-base"
                            >
                                <CheckCircle size={20} />
                                {submitting ? 'Submitting...' : 'Submit'}
                            </button>
                        )}
                    </div>

                    {/* ── REVIEW PENDING MODAL ─────────────────────────── */}
                    <AnimatePresence>
                        {showPendingReview && (
                            <div
                                className="fixed inset-0 z-[260] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6"
                                onClick={() => setShowPendingReview(false)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
                                >
                                    <div className="bg-amber-500 px-7 py-5 flex items-center gap-3">
                                        <ListChecks className="text-white" size={22} />
                                        <div>
                                            <h2 className="text-lg font-black text-white">Unanswered Questions</h2>
                                            <p className="text-amber-100 text-xs font-bold">
                                                {answers.filter(a => a === null).length} of {questions.length} still pending
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                                        {answers.filter(a => a === null).length === 0 ? (
                                            <p className="text-center text-emerald-600 font-bold py-6">
                                                All questions answered. You can submit now.
                                            </p>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2">
                                                {answers.map((a, i) =>
                                                    a === null ? (
                                                        <button
                                                            key={i}
                                                            onClick={() => {
                                                                setCurrentQ(i);
                                                                setShowPendingReview(false);
                                                            }}
                                                            className="flex items-center justify-between gap-3 p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl text-left transition-all group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-9 h-9 bg-amber-500 text-white rounded-xl flex items-center justify-center font-black text-sm">
                                                                    {i + 1}
                                                                </span>
                                                                <span className="text-sm font-semibold text-slate-700 line-clamp-2">
                                                                    {questions[i]?.question?.slice(0, 80) || 'Question'}
                                                                    {questions[i]?.question?.length > 80 ? '…' : ''}
                                                                </span>
                                                            </div>
                                                            <ChevronRight size={18} className="text-amber-600 group-hover:translate-x-1 transition-transform shrink-0" />
                                                        </button>
                                                    ) : null
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                        <button
                                            onClick={() => setShowPendingReview(false)}
                                            className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-sm transition-all"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════
    //  RESULT SCREEN
    // ════════════════════════════════════════════════════════════════
    if (submitted && result) {
        const pct = Math.round((result.score / result.total) * 100);
        const gradeInfo = pct >= 90
            ? { label: 'Outstanding', color: 'from-emerald-400 to-green-500', badge: 'bg-emerald-100 text-emerald-800', icon: '🏆' }
            : pct >= 75
            ? { label: 'Excellent', color: 'from-blue-400 to-indigo-500', badge: 'bg-blue-100 text-blue-800', icon: '🎖️' }
            : pct >= 50
            ? { label: 'Satisfactory', color: 'from-amber-400 to-orange-400', badge: 'bg-amber-100 text-amber-800', icon: '✅' }
            : { label: 'Needs Improvement', color: 'from-rose-400 to-red-500', badge: 'bg-rose-100 text-rose-800', icon: '📚' };

        return (
            <div className="fixed inset-0 z-[200] bg-slate-100 flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
                >
                    {/* Score gradient banner */}
                    <div className={`bg-gradient-to-br ${gradeInfo.color} p-12 text-center relative overflow-hidden`}>
                        <div className="absolute inset-0 opacity-10">
                            <Star className="absolute top-4 left-8 w-20 h-20" />
                            <Star className="absolute bottom-4 right-8 w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-white/80 text-sm font-black uppercase tracking-[0.3em] mb-3">Assessment Result</p>
                            <div className="text-7xl font-black text-white mb-4 drop-shadow-lg">{pct}%</div>
                            <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full font-black text-base ${gradeInfo.badge}`}>
                                {gradeInfo.icon} {gradeInfo.label}
                            </span>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="p-10">
                        <div className="grid grid-cols-3 gap-4 mb-10">
                            {[
                                { label: 'Correct', value: result.score, color: 'text-emerald-600' },
                                { label: 'Incorrect', value: result.total - result.score, color: 'text-rose-500' },
                                { label: 'Total Qs', value: result.total, color: 'text-indigo-600' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
                                    <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Score bar */}
                        <div className="mb-10">
                            <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                                <span>Performance</span>
                                <span>{pct}%</span>
                            </div>
                            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ delay: 0.3, duration: 1, ease: 'easeOut' }}
                                    className={`h-full rounded-full bg-gradient-to-r ${gradeInfo.color}`}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowAnswerReview(true)}
                                className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-base transition-all shadow-xl flex items-center justify-center gap-2"
                            >
                                <Eye size={18} /> Review Answers
                            </button>
                            <button
                                onClick={() => { setActiveQuiz(null); setSubmitted(false); setShowAnswerReview(false); }}
                                className="py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-base transition-all shadow-xl"
                            >
                                Return to Assessments
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* ── ANSWER REVIEW PANEL — shows each question with student's pick vs correct ─── */}
                <AnimatePresence>
                    {showAnswerReview && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[260] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
                            onClick={() => setShowAnswerReview(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                            >
                                <div className="bg-indigo-600 px-8 py-5 flex items-center justify-between shrink-0">
                                    <div>
                                        <h2 className="text-xl font-black text-white">Answer Review</h2>
                                        <p className="text-indigo-100 text-xs font-bold mt-0.5">
                                            {result.score} correct · {result.total - result.score} incorrect · {result.total} total
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowAnswerReview(false)}
                                        className="p-2 hover:bg-white/10 rounded-xl text-white transition-all"
                                    >
                                        <XCircle size={22} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5">
                                    {questions.map((q: any, i: number) => {
                                        const userPick = answers[i];
                                        const correct = q.correctIndex;
                                        const isCorrect = userPick === correct;
                                        const wasSkipped = userPick === null || userPick === -1;
                                        return (
                                            <div
                                                key={i}
                                                className={`rounded-2xl border-2 p-5 ${
                                                    isCorrect
                                                        ? 'border-emerald-200 bg-emerald-50/40'
                                                        : 'border-rose-200 bg-rose-50/40'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3 mb-4">
                                                    <span
                                                        className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-black text-sm text-white ${
                                                            isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                                                        }`}
                                                    >
                                                        {i + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-slate-800 leading-relaxed">{q.question}</p>
                                                    </div>
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                                            isCorrect
                                                                ? 'bg-emerald-500 text-white'
                                                                : 'bg-rose-500 text-white'
                                                        }`}
                                                    >
                                                        {isCorrect ? 'Correct' : wasSkipped ? 'Skipped' : 'Wrong'}
                                                    </span>
                                                </div>
                                                <div className="space-y-2 ml-11">
                                                    {q.options.map((opt: string, optIdx: number) => {
                                                        const isUserPick = userPick === optIdx;
                                                        const isCorrectOpt = correct === optIdx;
                                                        return (
                                                            <div
                                                                key={optIdx}
                                                                className={`flex items-center gap-3 p-3 rounded-xl border ${
                                                                    isCorrectOpt
                                                                        ? 'border-emerald-400 bg-emerald-100/70'
                                                                        : isUserPick
                                                                        ? 'border-rose-400 bg-rose-100/70'
                                                                        : 'border-slate-200 bg-white'
                                                                }`}
                                                            >
                                                                <span
                                                                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                                                                        isCorrectOpt
                                                                            ? 'bg-emerald-500 text-white'
                                                                            : isUserPick
                                                                            ? 'bg-rose-500 text-white'
                                                                            : 'bg-slate-100 text-slate-500'
                                                                    }`}
                                                                >
                                                                    {String.fromCharCode(65 + optIdx)}
                                                                </span>
                                                                <span className="text-sm font-medium text-slate-700 flex-1">{opt}</span>
                                                                {isCorrectOpt && (
                                                                    <span className="text-[10px] font-black text-emerald-700 uppercase">Correct</span>
                                                                )}
                                                                {isUserPick && !isCorrectOpt && (
                                                                    <span className="text-[10px] font-black text-rose-700 uppercase">Your answer</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    {wasSkipped && (
                                                        <p className="text-xs font-bold text-rose-600 mt-2 italic">You did not answer this question.</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════
    //  QUIZ LIST — landing dashboard
    // ════════════════════════════════════════════════════════════════
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Assessments</h1>
                    <p className="text-slate-500 font-medium">MCQ assessments assigned to your program level.</p>
                </div>
                {children.length > 1 && (
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                        {children.map(child => (
                            <button
                                key={child.id}
                                onClick={() => setSelectedChild(child)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${selectedChild?.id === child.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {child.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Quiz cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {quizzes.length === 0 ? (
                    <div className="col-span-full bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm">
                        <ClipboardList className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-500 font-bold text-lg">No assessments available yet.</p>
                        <p className="text-slate-400 text-sm mt-1">Check back when your trainer publishes one.</p>
                    </div>
                ) : (
                    quizzes.map((quiz: any) => {
                        const isSubmitted = submissionStatus[quiz.id];
                        const isPast = new Date(quiz.dueDate) < new Date();
                        const qs = JSON.parse(quiz.questionsJSON || '[]');
                        return (
                            <div key={quiz.id} className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all flex flex-col gap-4 group">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                            <BookOpen size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-base leading-tight group-hover:text-indigo-600 transition-colors">{quiz.title}</h3>
                                            <p className="text-xs text-slate-400 font-semibold mt-0.5">{quiz.subject?.name}</p>
                                        </div>
                                    </div>
                                    {isSubmitted ? (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-wide shrink-0">
                                            <CheckCircle size={13} /> Done
                                        </span>
                                    ) : isPast ? (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-wide shrink-0">
                                            <Lock size={13} /> Closed
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-wide shrink-0">
                                            Active
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold">
                                    <span className="flex items-center gap-1"><Shield size={12} /> {qs.length} Questions</span>
                                    <span className="text-slate-200">•</span>
                                    <span className="flex items-center gap-1"><Timer size={12} /> {quiz.timeLimit} min</span>
                                    <span className="text-slate-200">•</span>
                                    <span className="flex items-center gap-1"><Clock size={12} /> Due {new Date(quiz.dueDate).toLocaleDateString()}</span>
                                </div>

                                {!isSubmitted && !isPast && (
                                    <button
                                        onClick={() => startQuiz(quiz)}
                                        className="mt-2 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-600/20 group-hover:-translate-y-0.5"
                                    >
                                        Enter Assessment Room <ChevronRight size={18} strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </motion.div>
    );
}
