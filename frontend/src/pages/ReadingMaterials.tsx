import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BookOpen, Plus, Trash2, CheckCircle2, AlertCircle, Clock, 
    BookOpenCheck, ExternalLink, Send, ArrowLeft, Bold, Italic, 
    Underline, Heading1, Heading2, List, ListOrdered, Link, 
    RefreshCw, Sparkles, Sun, Moon, Maximize2, Minimize2, ZoomIn, ZoomOut
} from 'lucide-react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

export default function ReadingMaterials() {
    const { user } = useAuthStore();
    const isTrainer = user?.role === 'TRAINER' || user?.role === 'SUPER_ADMIN';

    // State for both views
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [specializations, setSpecializations] = useState<any[]>([]);
    
    // Trainer View Tabs: 'list', 'create', 'progress'
    const [activeTab, setActiveTab] = useState<'list' | 'create' | 'progress'>('list');
    
    // Create Material form
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [specializationId, setSpecializationId] = useState('');
    const editorRef = useRef<HTMLDivElement>(null);
    const [publishing, setPublishing] = useState(false);
    
    // Tracking Progress state
    const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
    const [progressData, setProgressData] = useState<any>(null);
    const [loadingProgress, setLoadingProgress] = useState(false);
    const [remindingId, setRemindingId] = useState<string | null>(null);

    // Intern Reader Mode state
    const [activeReaderMaterial, setActiveReaderMaterial] = useState<any>(null);
    const [readerProgress, setReaderProgress] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fontScale, setFontScale] = useState(1.0); // Font scale zoom state
    const readerContainerRef = useRef<HTMLDivElement>(null);
    const readerModalRef = useRef<HTMLDivElement>(null);
    const progressSyncRef = useRef<NodeJS.Timeout | null>(null);

    const handleZoomIn = () => {
        setFontScale(prev => Math.min(1.6, prev + 0.15));
    };

    const handleZoomOut = () => {
        setFontScale(prev => Math.max(0.75, prev - 0.15));
    };

    const handleZoomReset = () => {
        setFontScale(1.0);
    };

    // Track fullscreen state change
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = () => {
        if (!readerModalRef.current) return;
        if (!document.fullscreenElement) {
            readerModalRef.current.requestFullscreen().catch((err) => {
                console.error('Error entering fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Initial load
    useEffect(() => {
        fetchMaterials();
        if (isTrainer) {
            fetchSpecializations();
        }
    }, []);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const url = isTrainer ? '/reading-materials' : '/reading-materials/intern';
            const res = await api.get(url);
            setMaterials(res.data);
        } catch (error) {
            console.error('Error fetching materials:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSpecializations = async () => {
        try {
            const res = await api.get('/scheduler/specializations');
            setSpecializations(res.data);
        } catch (error) {
            console.error('Error fetching specializations:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this reading material? All student progress logs for it will be lost.')) return;
        try {
            await api.delete(`/reading-materials/${id}`);
            setMaterials(materials.filter(m => m.id !== id));
            if (selectedMaterial?.id === id) {
                setSelectedMaterial(null);
                setProgressData(null);
                setActiveTab('list');
            }
        } catch (error) {
            console.error('Error deleting material:', error);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const rawHtml = editorRef.current?.innerHTML || '';
        
        if (!title.trim()) return alert('Please enter a title');
        if (!rawHtml.trim() || rawHtml === '<br>') return alert('Please write some content');
        if (!specializationId) return alert('Please select a specialization');

        setPublishing(true);
        try {
            await api.post('/reading-materials', {
                title,
                content: rawHtml,
                specializationId
            });
            setTitle('');
            if (editorRef.current) editorRef.current.innerHTML = '';
            setSpecializationId('');
            setActiveTab('list');
            fetchMaterials();
        } catch (error) {
            console.error('Error creating material:', error);
            alert('Failed to publish material.');
        } finally {
            setPublishing(false);
        }
    };

    // Load progress list for Trainer
    const handleViewProgress = async (material: any) => {
        setSelectedMaterial(material);
        setLoadingProgress(true);
        setActiveTab('progress');
        try {
            const res = await api.get(`/reading-materials/${material.id}/progress`);
            setProgressData(res.data);
        } catch (error) {
            console.error('Error fetching progress:', error);
        } finally {
            setLoadingProgress(false);
        }
    };

    // Send a push-to-read in-app notification reminder
    const handleRemind = async (studentId: string) => {
        setRemindingId(studentId);
        try {
            await api.post(`/reading-materials/${selectedMaterial.id}/remind/${studentId}`);
            alert('A direct reminder notification has been pushed to the student.');
            // Refresh list
            const res = await api.get(`/reading-materials/${selectedMaterial.id}/progress`);
            setProgressData(res.data);
        } catch (error) {
            console.error('Error sending reminder:', error);
        } finally {
            setRemindingId(null);
        }
    };

    // WYSIWYG Editor Helpers
    const runEditorCommand = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const insertHyperlink = () => {
        const url = prompt('Enter reference URL (e.g., https://medium.com/article):');
        if (url) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const link = document.createElement('a');
                link.href = url.startsWith('http') ? url : `https://${url}`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className = 'text-indigo-600 hover:text-indigo-800 underline font-semibold transition-colors';
                link.textContent = selection.toString() || url;
                range.deleteContents();
                range.insertNode(link);
            } else {
                // Fallback
                runEditorCommand('createLink', url);
            }
        }
    };

    // ── Intern Reader Logic ───────────────────────────────────────────
    const handleOpenReader = (material: any) => {
        setActiveReaderMaterial(material);
        setReaderProgress(material.progress?.progressPercentage || 0);
    };

    const handleCloseReader = () => {
        if (progressSyncRef.current) {
            clearTimeout(progressSyncRef.current);
        }
        // Final sync of progress on close
        syncReadingProgress(activeReaderMaterial.id, readerProgress);
        setActiveReaderMaterial(null);
        fetchMaterials(); // Reload list to update progress bars
    };

    const handleReaderScroll = () => {
        if (!readerContainerRef.current) return;
        const container = readerContainerRef.current;
        const totalHeight = container.scrollHeight - container.clientHeight;
        if (totalHeight <= 0) return;
        
        const scrolled = (container.scrollTop / totalHeight) * 100;
        const roundedProgress = Math.min(100, Math.max(0, Math.round(scrolled)));
        
        // Only update state and database if student scrolls to a higher percentage
        if (roundedProgress > readerProgress) {
            setReaderProgress(roundedProgress);
            
            // Debounce syncing progress to database (every 1.5 seconds)
            if (progressSyncRef.current) {
                clearTimeout(progressSyncRef.current);
            }
            progressSyncRef.current = setTimeout(() => {
                syncReadingProgress(activeReaderMaterial.id, roundedProgress);
            }, 1500);
        }
    };

    const syncReadingProgress = async (matId: string, percentage: number) => {
        try {
            await api.post('/reading-materials/progress', {
                materialId: matId,
                progressPercentage: percentage
            });
        } catch (error) {
            console.error('Error syncing reading progress:', error);
        }
    };

    // Ensure hyperlinks render with correct security settings in reader and HTML is balanced and styled appropriately for dark/light themes
    const formatReadingContent = (html: string) => {
        try {
            // Create a temporary element to let browser parse and balance HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Strip any absolute/explicit text color and background style attributes 
            // that interfere with dark mode and light mode visibility.
            const styledElements = tempDiv.querySelectorAll('*');
            styledElements.forEach((el: any) => {
                if (el.style) {
                    el.style.color = '';
                    el.style.backgroundColor = '';
                    el.style.background = '';
                }
            });

            // Also remove explicit legacy font color tags
            const fontElements = tempDiv.getElementsByTagName('font');
            for (let i = 0; i < fontElements.length; i++) {
                fontElements[i].removeAttribute('color');
            }
            
            // Adjust all anchor tags to open in new tab securely
            const anchors = tempDiv.getElementsByTagName('a');
            for (let i = 0; i < anchors.length; i++) {
                anchors[i].setAttribute('target', '_blank');
                anchors[i].setAttribute('rel', 'noopener noreferrer');
            }
            
            return { __html: tempDiv.innerHTML };
        } catch (e) {
            console.error('Error parsing reading content HTML:', e);
            // Fallback to basic link transformation if DOM parser fails
            return { __html: html.replace(/<a /gi, '<a target="_blank" rel="noopener noreferrer" ') };
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* ── HEADER SECTION ─────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                        <BookOpen className="text-indigo-600" /> Reading Materials
                    </h1>
                    <p className="text-slate-500">
                        {isTrainer 
                            ? 'Create, manage and track interactive text reading materials assigned to interns.' 
                            : 'Explore assigned documentation and study logs. Scroll to automatically log progress.'
                        }
                    </p>
                </div>

                {isTrainer && (
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button
                            onClick={() => { setActiveTab('list'); setSelectedMaterial(null); }}
                            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            All Materials
                        </button>
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${activeTab === 'create' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Plus size={14} /> Create Material
                        </button>
                    </div>
                )}
            </div>

            {/* ── TRAINER DASHBOARD VIEWS ─────────────────────────────────── */}
            {isTrainer ? (
                <div>
                    {/* Tab 1: All Materials list */}
                    {activeTab === 'list' && (
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6">
                            {loading ? (
                                <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-3">
                                    <RefreshCw className="animate-spin text-indigo-600" size={30} />
                                    <span>Fetching reading resources...</span>
                                </div>
                            ) : materials.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <BookOpen size={30} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">No Materials Yet</h3>
                                    <p className="text-slate-500 mt-1 max-w-sm mx-auto">Start by clicking "Create Material" to assign study guides to specializations.</p>
                                    <button 
                                        onClick={() => setActiveTab('create')}
                                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                                    >
                                        Create First Material
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {materials.map((m: any) => (
                                        <div key={m.id} className="border border-slate-150 rounded-2xl p-5 hover:shadow-lg hover:border-indigo-300 transition bg-slate-50/30 flex flex-col justify-between group">
                                            <div>
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="text-[10px] font-extrabold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg uppercase tracking-wider">
                                                        {m.specialization?.name}
                                                    </span>
                                                    <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                                                        <Clock size={12} /> {new Date(m.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <h3 className="font-extrabold text-slate-800 text-lg leading-tight mb-2 group-hover:text-indigo-700 transition-colors">
                                                    {m.title}
                                                </h3>
                                                <div className="text-slate-500 text-sm line-clamp-3 mb-4" dangerouslySetInnerHTML={{ __html: m.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...' }} />
                                            </div>
                                            
                                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center bg-white -mx-5 -mb-5 p-5 rounded-b-2xl">
                                                <span className="text-xs text-slate-400 font-semibold">
                                                    By {m.author?.firstName} {m.author?.lastName}
                                                </span>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleViewProgress(m)}
                                                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg flex items-center gap-1 transition-all"
                                                    >
                                                        <BookOpenCheck size={14} /> Tracking
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(m.id)}
                                                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Delete Material"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Create Material */}
                    {activeTab === 'create' && (
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 max-w-4xl mx-auto">
                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                <Sparkles className="text-indigo-600" size={20} /> Create New Reading Resource
                            </h2>

                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Material Title *</label>
                                        <input 
                                            type="text" 
                                            placeholder="Enter study guide name..." 
                                            required
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Assign to Specialization *</label>
                                        <select 
                                            required 
                                            value={specializationId}
                                            onChange={e => setSpecializationId(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        >
                                            <option value="">Select Specialization</option>
                                            {specializations.map(spec => (
                                                <option key={spec.id} value={spec.id}>{spec.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Rich Text Editor (contentEditable) */}
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Reading Content *</label>
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all bg-white">
                                        
                                        {/* Editor Toolbar */}
                                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-wrap gap-1 items-center">
                                            <button type="button" onClick={() => runEditorCommand('bold')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Bold"><Bold size={16} /></button>
                                            <button type="button" onClick={() => runEditorCommand('italic')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Italic"><Italic size={16} /></button>
                                            <button type="button" onClick={() => runEditorCommand('underline')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Underline"><Underline size={16} /></button>
                                            <div className="w-px h-5 bg-slate-350 mx-1" />
                                            <button type="button" onClick={() => runEditorCommand('formatBlock', '<h1>')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 font-bold" title="Heading 1"><Heading1 size={16} /></button>
                                            <button type="button" onClick={() => runEditorCommand('formatBlock', '<h2>')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 font-bold" title="Heading 2"><Heading2 size={16} /></button>
                                            <div className="w-px h-5 bg-slate-350 mx-1" />
                                            <button type="button" onClick={() => runEditorCommand('insertUnorderedList')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Bullet List"><List size={16} /></button>
                                            <button type="button" onClick={() => runEditorCommand('insertOrderedList')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Numbered List"><ListOrdered size={16} /></button>
                                            <div className="w-px h-5 bg-slate-350 mx-1" />
                                            <button type="button" onClick={insertHyperlink} className="p-1.5 hover:bg-slate-200 text-indigo-600 font-bold rounded flex items-center gap-1 text-xs" title="Insert Link"><Link size={16} /> Insert Link</button>
                                        </div>

                                        {/* Editor Div */}
                                        <div 
                                            ref={editorRef}
                                            contentEditable
                                            className="min-h-[300px] max-h-[500px] overflow-y-auto px-6 py-5 outline-none prose prose-indigo max-w-none text-slate-800"
                                            placeholder="Write reading content details here. You can insert links to external documents, articles, references, etc."
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 font-medium">Highlight text to apply formatting. Hyperlinks will open automatically in a new tab when students click them.</p>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button 
                                        type="button" 
                                        onClick={() => { setActiveTab('list'); setTitle(''); }}
                                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={publishing}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 disabled:opacity-50 transition"
                                    >
                                        {publishing ? 'Publishing...' : 'Publish & Assign'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Tab 3: Progress Tracker */}
                    {activeTab === 'progress' && (
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 max-w-5xl mx-auto">
                            <button 
                                onClick={() => { setActiveTab('list'); setSelectedMaterial(null); setProgressData(null); }}
                                className="mb-6 flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                            >
                                <ArrowLeft size={16} /> Back to Reading Materials
                            </button>

                            {loadingProgress || !progressData ? (
                                <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-3">
                                    <RefreshCw className="animate-spin text-indigo-600" size={30} />
                                    <span>Syncing student progress data...</span>
                                </div>
                            ) : (
                                <div>
                                    <div className="border-b border-slate-100 pb-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 -mx-6 -mt-6 p-6">
                                        <div>
                                            <span className="text-[10px] font-black px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg uppercase tracking-wider mb-2 block w-fit">
                                                {progressData.specializationName}
                                            </span>
                                            <h2 className="text-xl font-black text-slate-800">{progressData.materialTitle}</h2>
                                            <p className="text-sm text-slate-500 mt-0.5">Tracking scroll-based completion for all active students in this program.</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                                            <div className="text-center px-4 border-r border-slate-100">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Interns</p>
                                                <p className="text-xl font-black text-slate-800">{progressData.progress.length}</p>
                                            </div>
                                            <div className="text-center px-4">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completed</p>
                                                <p className="text-xl font-black text-emerald-600">
                                                    {progressData.progress.filter((s: any) => s.status === 'COMPLETED').length}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Table */}
                                    {progressData.progress.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500">
                                            No active students are assigned to the specialization "{progressData.specializationName}".
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                        <th className="py-3 px-4">Intern Name</th>
                                                        <th className="py-3 px-4">Tracking Status</th>
                                                        <th className="py-3 px-4">Progress</th>
                                                        <th className="py-3 px-4">Last Active</th>
                                                        <th className="py-3 px-4 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {progressData.progress.map((student: any) => (
                                                        <tr key={student.studentId} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                                                            <td className="py-4 px-4">
                                                                <p className="font-extrabold text-slate-800">{student.studentName}</p>
                                                                <p className="text-xs text-slate-400">{student.email || `Roll ID: ${student.rollNumber}`}</p>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                {student.status === 'COMPLETED' ? (
                                                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-lg inline-flex items-center gap-1 border border-emerald-100">
                                                                        <CheckCircle2 size={12} /> Finished
                                                                    </span>
                                                                ) : student.status === 'IN_PROGRESS' ? (
                                                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-600 font-bold text-xs rounded-lg inline-flex items-center gap-1 border border-amber-100">
                                                                        <Clock size={12} /> Reading
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2.5 py-1 bg-slate-50 text-slate-500 font-bold text-xs rounded-lg inline-flex items-center gap-1 border border-slate-150">
                                                                        <AlertCircle size={12} /> Unopened
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-4 px-4 w-64">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                                                        <div 
                                                                            className={`h-full rounded-full transition-all duration-300 ${
                                                                                student.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-indigo-500'
                                                                            }`}
                                                                            style={{ width: `${student.progressPercentage}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs font-black text-slate-600 w-8">{student.progressPercentage}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4 text-xs text-slate-400 font-medium">
                                                                {student.lastReadAt 
                                                                    ? new Date(student.lastReadAt).toLocaleString() 
                                                                    : 'Not started yet'
                                                                }
                                                            </td>
                                                            <td className="py-4 px-4 text-center">
                                                                {student.status !== 'COMPLETED' ? (
                                                                    <button
                                                                        disabled={remindingId === student.studentId}
                                                                        onClick={() => handleRemind(student.studentId)}
                                                                        className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-indigo-600 shadow-sm flex items-center gap-1.5 mx-auto transition disabled:opacity-50"
                                                                    >
                                                                        <Send size={11} /> {remindingId === student.studentId ? 'Sending...' : 'Remind'}
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-xs text-emerald-600 font-bold">Good Job!</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* ── INTERN DASHBOARD VIEW ──────────────────────────────────── */
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6">
                    {loading ? (
                        <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-3">
                            <RefreshCw className="animate-spin text-indigo-600" size={30} />
                            <span>Loading study materials...</span>
                        </div>
                    ) : materials.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <BookOpen className="text-slate-300" size={30} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">No Assigned Material</h3>
                            <p className="text-slate-500 mt-1 max-w-sm mx-auto">You don't have any reading materials assigned to your specialization yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {materials.map((m: any) => {
                                const prog = m.progress?.progressPercentage || 0;
                                const isFinished = prog >= 95;

                                return (
                                    <div key={m.id} className="border border-slate-150 hover:border-indigo-300 rounded-2xl p-5 hover:shadow-lg transition bg-white flex flex-col justify-between group">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1 ${
                                                    isFinished 
                                                        ? 'bg-emerald-50 text-emerald-700' 
                                                        : prog > 0 
                                                        ? 'bg-amber-50 text-amber-700' 
                                                        : 'bg-slate-50 text-slate-500'
                                                }`}>
                                                    {isFinished ? 'Finished' : prog > 0 ? 'Reading' : 'New'}
                                                </span>
                                                <span className="text-slate-400 text-xs font-medium flex items-center gap-1">
                                                    <Clock size={12} /> {new Date(m.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <h3 className="font-extrabold text-slate-800 text-lg leading-tight mb-2 group-hover:text-indigo-700 transition-colors">
                                                {m.title}
                                            </h3>
                                            <div className="text-slate-500 text-xs line-clamp-3 mb-4" dangerouslySetInnerHTML={{ __html: m.content.replace(/<[^>]*>/g, '').substring(0, 120) + '...' }} />
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            {/* Progress bar */}
                                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                                                <span>Progress</span>
                                                <span className="text-slate-800">{prog}%</span>
                                            </div>
                                            <div className="bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        isFinished ? 'bg-emerald-500' : 'bg-indigo-500'
                                                    }`}
                                                    style={{ width: `${prog}%` }}
                                                />
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-400 font-semibold">
                                                    Assigned by {m.authorName}
                                                </span>
                                                <button
                                                    onClick={() => handleOpenReader(m)}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 flex items-center gap-1.5 transition-all"
                                                >
                                                    <BookOpen size={14} /> {prog > 0 ? 'Resume Reading' : 'Start Reading'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── FULL SCREEN INTERACTIVE READER MODAL ────────────────────── */}
            <AnimatePresence>
                {activeReaderMaterial && (
                    <div ref={readerModalRef} className={`fixed inset-0 z-[300] flex flex-col overflow-hidden transition-colors duration-350 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-900/90 backdrop-blur-md text-white'}`}>
                        
                        {/* Scroll Progress Bar at very top */}
                        <div className={`w-full h-1.5 shrink-0 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-800'}`}>
                            <div 
                                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full rounded-r transition-all duration-300 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                                style={{ width: `${readerProgress}%` }}
                            />
                        </div>

                        {/* Reader Header */}
                        <div className={`px-6 py-4 flex items-center justify-between shadow-lg shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-b border-slate-800/80 text-white' : 'bg-slate-800 text-white'}`}>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleCloseReader}
                                    className="p-2 text-slate-400 hover:bg-slate-700 hover:text-white rounded-xl transition-all"
                                    title="Close and Save Progress"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <h2 className="text-lg font-black tracking-tight">{activeReaderMaterial.title}</h2>
                                    <p className="text-xs text-slate-400 font-medium">Assigned by {activeReaderMaterial.authorName}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 md:gap-5">
                                
                                {/* Zoom controls */}
                                <div className="flex items-center bg-white/10 border border-white/10 rounded-xl overflow-hidden p-0.5 shadow-sm">
                                    <button
                                        type="button"
                                        onClick={handleZoomOut}
                                        className="p-1.5 hover:bg-white/10 text-white rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                                        title="Zoom Out"
                                        disabled={fontScale <= 0.75}
                                    >
                                        <ZoomOut size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleZoomReset}
                                        className="px-2 py-1 hover:bg-white/10 text-white text-[10px] font-black rounded-lg transition-all select-none w-11 text-center"
                                        title="Reset Zoom"
                                    >
                                        {Math.round(fontScale * 100)}%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleZoomIn}
                                        className="p-1.5 hover:bg-white/10 text-white rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                                        title="Zoom In"
                                        disabled={fontScale >= 1.6}
                                    >
                                        <ZoomIn size={16} />
                                    </button>
                                </div>

                                <div className="w-px h-6 bg-white/10 hidden xs:block" />

                                {/* Dark Mode Toggle */}
                                <button
                                    onClick={() => setIsDarkMode(!isDarkMode)}
                                    className={`p-2 rounded-xl transition-all shadow-sm flex items-center justify-center border ${
                                        isDarkMode 
                                            ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-amber-400' 
                                            : 'bg-white/10 border-white/10 hover:bg-white/20 text-white'
                                    }`}
                                    title={isDarkMode ? "Light Mode" : "Dark Mode"}
                                >
                                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} className="text-indigo-300" />}
                                </button>

                                {/* Fullscreen Toggle */}
                                <button
                                    onClick={toggleFullscreen}
                                    className="p-2 bg-white/10 border border-white/10 hover:bg-white/20 text-white rounded-xl transition-all shadow-sm flex items-center justify-center"
                                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                                >
                                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>

                                <div className="w-px h-6 bg-white/10 hidden sm:block" />

                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Reading Progress</p>
                                    <p className="text-sm font-black text-indigo-400">{readerProgress}% Logged</p>
                                </div>
                                <button 
                                    onClick={handleCloseReader}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-900/20 hover:scale-102 active:scale-98 transition-all"
                                >
                                    <CheckCircle2 size={14} /> Close Reader
                                </button>
                            </div>
                        </div>

                        {/* Reader Body (Document container) */}
                        <div 
                            ref={readerContainerRef}
                            onScroll={handleReaderScroll}
                            className={`flex-1 overflow-y-auto px-6 py-10 md:px-12 transition-colors duration-300 flex justify-center items-start ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
                        >
                            <div 
                                className={`rounded-3xl border shadow-2xl max-w-3xl w-full px-8 md:px-16 py-12 flex flex-col justify-between min-h-[85vh] transition-all duration-300 ${
                                    isDarkMode 
                                        ? 'bg-slate-900 border-slate-800/80 text-slate-150' 
                                        : 'bg-white border-slate-200/80 text-slate-900'
                                }`}
                                style={{ zoom: fontScale }}
                            >
                                <div>
                                    <div className={`text-center pb-8 border-b mb-8 ${isDarkMode ? 'border-slate-800/50' : 'border-slate-100'}`}>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors ${
                                            isDarkMode 
                                                ? 'bg-indigo-950/65 text-indigo-400 border border-indigo-850/40' 
                                                : 'bg-indigo-50 text-indigo-600'
                                        }`}>
                                            <BookOpen size={24} />
                                        </div>
                                        <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {activeReaderMaterial.title}
                                        </h1>
                                        <div className="flex items-center justify-center gap-4 text-xs font-bold mt-2 uppercase tracking-wide text-slate-400">
                                            <span>Author: <span className={isDarkMode ? 'text-slate-200' : 'text-slate-600'}>{activeReaderMaterial.authorName}</span></span>
                                            <span>·</span>
                                            <span>Date: <span className={isDarkMode ? 'text-slate-200' : 'text-slate-600'}>{new Date(activeReaderMaterial.createdAt).toLocaleDateString()}</span></span>
                                        </div>
                                    </div>

                                    {/* HTML Content (safe rendering with formatting custom helper) */}
                                    <div 
                                        className={`prose max-w-none leading-relaxed font-medium text-base space-y-6 break-words transition-colors duration-300 ${
                                            isDarkMode 
                                                ? 'prose-slate prose-invert text-slate-300 prose-indigo' 
                                                : 'prose-slate text-slate-700 prose-indigo'
                                        }`}
                                        dangerouslySetInnerHTML={formatReadingContent(activeReaderMaterial.content)}
                                    />
                                </div>

                                <div className={`mt-16 pt-8 border-t text-center ${isDarkMode ? 'border-slate-800/50' : 'border-slate-100'}`}>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${
                                        isDarkMode 
                                            ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30' 
                                            : 'bg-emerald-50 text-emerald-600'
                                    }`}>
                                        <BookOpenCheck size={22} />
                                    </div>
                                    {readerProgress >= 95 ? (
                                        <div>
                                            <h3 className={`text-lg font-black ${isDarkMode ? 'text-emerald-400' : 'text-slate-800'}`}>You're All Done!</h3>
                                            <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>100% Reading logged successfully. Great job learning!</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <h3 className={`text-md font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Keep Reading...</h3>
                                            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Scroll all the way to the bottom to mark this guide as finished.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}
