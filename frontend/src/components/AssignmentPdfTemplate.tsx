import { useEffect, useState } from 'react';
import api from '../utils/api';
import { School, Mail, MapPin } from 'lucide-react';

interface AssignmentPdfProps {
    assignment: any;
    student: any;
}

export default function AssignmentPdfTemplate({ assignment, student }: AssignmentPdfProps) {
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        // Fetch school settings for header
        api.get('/settings').then(res => setSettings(res.data)).catch(console.error);
    }, []);

    if (!assignment || !settings) return null;

    const questions = JSON.parse(assignment.questionsJSON || '[]');

    return (
        <div className="w-[800px] bg-white p-12 text-slate-800 font-sans mx-auto" style={{ minHeight: '1120px' }}>
            {/* School Header */}
            <div className="border-b-2 border-slate-800 pb-6 mb-8 text-center">
                <div className="flex justify-center mb-2">
                    <div className="w-16 h-16 bg-slate-800 text-white rounded-xl flex items-center justify-center">
                        <School size={32} />
                    </div>
                </div>
                <h1 className="text-3xl font-black uppercase tracking-wider text-slate-900 mb-1">{settings.instituteName}</h1>
                <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-600 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {settings.address}</span>
                    <span className="flex items-center gap-1"><Mail size={12} /> {settings.contactEmail}</span>
                    <span>ACADEMIC YEAR {settings.academicYear}</span>
                </div>
            </div>

            {/* Assignment Meta Title */}
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black uppercase text-slate-800 tracking-wider underline decoration-2 underline-offset-4">{assignment.title}</h2>
                <div className="flex justify-center gap-6 mt-3 text-sm font-bold text-slate-600 uppercase">
                    <span>Subject: <span className="text-slate-900 border-b border-slate-400 pb-0.5">{assignment.subject?.name}</span></span>
                    <span>Program: <span className="text-slate-900 border-b border-slate-400 pb-0.5">{assignment.specialization?.name || 'All Specializations'} ({assignment.batch?.name || 'No Batch'})</span></span>
                    <span>Total Marks: <span className="text-slate-900 border-b border-slate-400 pb-0.5">{questions.reduce((sum: number, q: any) => sum + Number(q.marks), 0)}</span></span>
                </div>
            </div>

            {/* Student Info Box */}
            {student && (
                <div className="border-2 border-slate-800 p-4 rounded-lg mb-8 flex justify-between items-center bg-slate-50">
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Intern Name</p>
                        <p className="font-bold text-slate-900">{student.name}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Roll No. / Admission</p>
                        <p className="font-bold text-slate-900">{student.rollNumber || 'N/A'} / {student.admissionNumber}</p>
                    </div>
                </div>
            )}

            {/* Instructions */}
            {assignment.description && (
                <div className="mb-8">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Instructions:</h4>
                    <p className="text-sm font-medium text-slate-700 italic border-l-4 border-slate-300 pl-4 py-1">{assignment.description}</p>
                </div>
            )}

            {/* Questions Sequence */}
            <div className="space-y-8 mt-12">
                {questions.map((q: any, idx: number) => (
                    <div key={idx} className="flex gap-4">
                        <span className="font-bold text-lg text-slate-800 shrink-0">Q{idx + 1}.</span>
                        <div className="flex-1">
                            <p className="text-slate-800 font-medium leading-relaxed">{q.text}</p>
                        </div>
                        <span className="font-bold text-sm text-slate-500 shrink-0">[{q.marks} Marks]</span>
                    </div>
                ))}
            </div>

            {/* Footer Signature Box */}
            <div className="mt-32 pt-16 flex justify-between border-t border-slate-300 px-8">
                <div className="text-center">
                    <div className="w-48 border-b-2 border-slate-800 mb-2"></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Trainer Signature</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1">{assignment.teacher?.firstName} {assignment.teacher?.lastName}</p>
                </div>
                <div className="text-center">
                    <div className="w-48 border-b-2 border-slate-800 mb-2"></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Intern/Guardian Signature</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1">Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                </div>
            </div>

            <div className="mt-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Generated dynamically via RISE Engine
            </div>
        </div>
    );
}
