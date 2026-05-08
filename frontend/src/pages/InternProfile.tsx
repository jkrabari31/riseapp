import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Mail, Calendar, MapPin, Phone, GraduationCap, CheckCircle, DollarSign, BookOpen, Clock } from 'lucide-react';
import api from '../utils/api';

export default function InternProfile() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchStudentDetails();
    }, [id]);

    const fetchStudentDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/students/${id}/details`);
            setStudent(res.data);
        } catch (error) {
            console.error("Error fetching intern details", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="p-8 text-center text-slate-500">
                <h2>Intern not found.</h2>
                <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 hover:underline">Go Back</button>
            </div>
        );
    }

    // Calculations
    const totalAttendances = student.attendances?.length || 0;
    const presentCount = student.attendances?.filter((a: any) => a.status === 'PRESENT').length || 0;
    const attendancePercentage = totalAttendances > 0 ? Math.round((presentCount / totalAttendances) * 100) : 0;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header / Back Button */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="text-slate-600" size={24} />
                </button>
                <h1 className="text-2xl font-bold text-slate-800">Intern Profile</h1>
            </div>

            {/* Profile Hero Card */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-full -z-0"></div>

                <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-lg relative z-10 overflow-hidden">
                    {student.photoUrl ? (
                        <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                        <User size={48} className="text-indigo-400" />
                    )}
                </div>

                <div className="flex-1 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800">{student.name}</h2>
                            <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
                                <GraduationCap size={18} className="text-indigo-500" />
                                Program Level {student.classLevel}{student.section ? ` - ${student.section}` : ''} | ID: {student.admissionNumber}
                            </p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wider ${student.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {student.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500" /> Attendance</p>
                            <p className="text-2xl font-bold text-slate-800">{attendancePercentage}%</p>
                            <p className="text-xs text-slate-400 mt-1">Over last {totalAttendances} days</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2"><DollarSign size={16} className="text-indigo-500" /> Payments Due</p>
                            <p className="text-2xl font-bold text-slate-800">₹{student.feeSummary?.due?.toLocaleString() || 0}</p>
                            <p className="text-xs text-slate-400 mt-1">Status: {student.feeSummary?.status || 'Unknown'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2"><BookOpen size={16} className="text-blue-500" /> Assessments</p>
                            <p className="text-2xl font-bold text-slate-800">{student.assessmentSubmissions?.length || 0}</p>
                            <p className="text-xs text-slate-400 mt-1">Completed Quizzes</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-200">
                {['overview', 'academics', 'attendance', 'financials'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 font-medium text-sm capitalize transition-colors relative ${activeTab === tab ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm min-h-[400px]">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Personal Details</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0"><User size={18} className="text-slate-400" /></div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Full Name</p>
                                        <p className="text-slate-800 font-medium">{student.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0"><Calendar size={18} className="text-slate-400" /></div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Date of Birth</p>
                                        <p className="text-slate-800 font-medium">{new Date(student.dateOfBirth).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0"><MapPin size={18} className="text-slate-400" /></div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Address</p>
                                        <p className="text-slate-800 font-medium">{student.address || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0"><Phone size={18} className="text-slate-400" /></div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Contact Number</p>
                                        <p className="text-slate-800 font-medium">{student.contactNumber || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Academic Details</h3>
                            <div className="space-y-4 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="text-slate-500 font-medium">Education</p><p className="text-slate-800 font-semibold">{student.education || 'N/A'}</p></div>
                                    <div><p className="text-slate-500 font-medium">Passing Year</p><p className="text-slate-800 font-semibold">{student.passingYear || 'N/A'}</p></div>
                                    <div className="col-span-2"><p className="text-slate-500 font-medium">College</p><p className="text-slate-800 font-semibold">{student.collegeName || 'N/A'}</p></div>
                                    <div className="col-span-2"><p className="text-slate-500 font-medium">University</p><p className="text-slate-800 font-semibold">{student.universityName || 'N/A'}</p></div>
                                    <div><p className="text-slate-500 font-medium">CGPA / %</p><p className="text-slate-800 font-semibold">{student.cgpa || 'N/A'}</p></div>
                                    <div><p className="text-slate-500 font-medium">Source</p><p className="text-slate-800 font-semibold">{student.source || 'N/A'}</p></div>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 pt-4">Intern / Guardian</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Father's Name</p>
                                        <p className="text-slate-800 font-medium">{student.fatherName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Father's Occupation</p>
                                        <p className="text-slate-800 font-medium">{student.fatherOccupation || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Personal Mobile</p>
                                        <p className="text-slate-800 font-medium">{student.mobileNo || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Guardian Mobile</p>
                                        <p className="text-slate-800 font-medium">{student.parentsMobileNo || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0"><Mail size={18} className="text-slate-400" /></div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Registered Email</p>
                                        <p className="text-slate-800 font-medium">{student.email || student.parentEmail || student.parent?.email || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'academics' && (
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Assessment Report</h3>
                        {student.assessmentSubmissions?.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                                <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
                                <p>No assessments completed yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-sm">
                                            <th className="p-4 font-medium rounded-tl-lg">Date</th>
                                            <th className="p-4 font-medium">Subject</th>
                                            <th className="p-4 font-medium">Assessment Title</th>
                                            <th className="p-4 font-medium text-right">Score</th>
                                            <th className="p-4 font-medium text-right rounded-tr-lg">Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {student.assessmentSubmissions.map((sub: any) => {
                                            const percent = Math.round((sub.score / sub.totalQuestions) * 100);
                                            return (
                                                <tr key={sub.id} className="hover:bg-slate-50/50">
                                                    <td className="p-4 text-sm text-slate-600 font-medium">
                                                        {new Date(sub.submittedAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">
                                                            {sub.assessment?.subject?.name || 'Subject'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-medium text-slate-800">{sub.assessment?.title}</td>
                                                    <td className="p-4 text-right font-bold text-slate-700">{sub.score} / {sub.totalQuestions}</td>
                                                    <td className="p-4 text-right">
                                                        <span className={`font-bold ${percent >= 70 ? 'text-emerald-500' : percent >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                                            {percent}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Recent Attendance Records</h3>
                        {student.attendances?.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                                <Clock size={48} className="mx-auto mb-4 text-slate-300" />
                                <p>No attendance records found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {student.attendances.map((att: any) => (
                                    <div key={att.id} className="p-4 border border-slate-200 rounded-xl text-center">
                                        <p className="text-xs font-bold text-slate-400 mb-2 uppercase">{new Date(att.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                        {att.status === 'PRESENT' && <span className="inline-flex w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 items-center justify-center font-bold">P</span>}
                                        {att.status === 'ABSENT' && <span className="inline-flex w-8 h-8 rounded-full bg-red-100 text-red-600 items-center justify-center font-bold">A</span>}
                                        {att.status === 'LATE' && <span className="inline-flex w-8 h-8 rounded-full bg-amber-100 text-amber-600 items-center justify-center font-bold">L</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'financials' && (
                    <div>
                        <div className="flex justify-between items-end mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Program Payments Record</h3>
                            <div className="text-right">
                                <p className="text-sm font-medium text-slate-500">Total Yearly Fee: ₹{student.feeSummary?.total?.toLocaleString()}</p>
                                <p className="text-sm font-bold text-indigo-600">Total Paid: ₹{student.feeSummary?.paid?.toLocaleString()}</p>
                            </div>
                        </div>

                        {student.fees?.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                                <DollarSign size={48} className="mx-auto mb-4 text-slate-300" />
                                <p>No fee payment records found.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-sm">
                                            <th className="p-4 font-medium rounded-tl-lg">Date</th>
                                            <th className="p-4 font-medium">Receipt No.</th>
                                            <th className="p-4 font-medium">Payment Mode</th>
                                            <th className="p-4 font-medium text-right rounded-tr-lg">Amount Paid</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {student.fees.map((fee: any) => (
                                            <tr key={fee.id} className="hover:bg-slate-50/50">
                                                <td className="p-4 text-sm text-slate-600 font-medium">
                                                    {new Date(fee.paymentDate).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 font-mono text-sm text-slate-500">{fee.receiptNumber}</td>
                                                <td className="p-4">
                                                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                                                        {fee.paymentMode}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-bold text-emerald-600">₹{fee.amountPaid.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
