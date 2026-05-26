import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function AdmissionPdfTemplate({ data }: { data: any }) {
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/settings');
                setSettings(response.data);
            } catch (error) {
                console.error("Failed to fetch settings for PDF", error);
            }
        };
        fetchSettings();
    }, []);

    if (!data) return null;

    return (
        <>
            <style>
                {`
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                `}
            </style>
            <div className="w-[210mm] min-h-[297mm] mx-auto bg-white text-black p-8 font-sans box-border" style={{ pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>

                {/* Header */}
                <div className="border-b-[3px] border-indigo-900 pb-4 mb-5 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-indigo-900 tracking-tight uppercase">{settings?.instituteName || 'Rishabh Software'}</h1>
                        <p className="text-gray-600 mt-0.5 text-xs font-medium">{settings?.address || '123 Learning Avenue, Knowledge Park, New Delhi'}</p>
                        <p className="text-gray-600 text-xs mt-0.5">Ph: {settings?.contactNumber || '+91 98765 43210'} | Email: {settings?.contactEmail || 'admissions@rise.in'}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold bg-indigo-50 px-2 py-1 rounded text-indigo-800 mb-2 border border-indigo-200 inline-block">
                            Ref: {data.referenceNumber}
                        </div>
                        <div className="w-24 h-28 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs font-medium bg-gray-50 uppercase text-center ml-auto leading-tight overflow-hidden">
                            {data.photoUrl ? (
                                <img src={data.photoUrl} alt="Passport" className="w-full h-full object-cover" />
                            ) : (
                                <>Affix<br />Passport<br />Photo</>
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-center mb-5">
                    <h2 className="text-lg font-bold uppercase tracking-widest border-b-2 border-gray-300 inline-block pb-0.5">Internship Application Form</h2>
                    <p className="text-xs text-gray-500 mt-1">Academic Year 2024-25</p>
                </div>

                {/* Student Details */}
                <h3 className="text-sm font-bold bg-gray-100 px-3 py-1.5 mb-2 border-l-4 border-indigo-600 uppercase tracking-wide">Intern Particulars</h3>
                <table className="w-full mb-5 text-xs border-collapse">
                    <tbody>
                        <tr>
                            <td className="w-[22%] py-2 font-bold text-gray-600 border-b border-gray-200">Full Name</td>
                            <td className="w-[28%] py-2 font-semibold text-gray-900 border-b border-gray-200">
                                {data.firstName.toUpperCase()} {data.lastName.toUpperCase()}
                            </td>
                            <td className="w-[22%] py-2 font-bold text-gray-600 border-b border-gray-200 pl-4">Class Applied For</td>
                            <td className="w-[28%] py-2 font-semibold text-gray-900 border-b border-gray-200">{data.classAppliedFor}</td>
                        </tr>
                        <tr>
                            <td className="w-[22%] py-2 font-bold text-gray-600 border-b border-gray-200">Date of Birth</td>
                            <td className="w-[28%] py-2 font-semibold text-gray-900 border-b border-gray-200">{new Date(data.dateOfBirth).toLocaleDateString()}</td>
                            <td className="w-[22%] py-2 font-bold text-gray-600 border-b border-gray-200 pl-4">Gender</td>
                            <td className="w-[28%] py-2 font-semibold text-gray-900 border-b border-gray-200">{data.gender}</td>
                        </tr>
                        <tr>
                            <td className="w-[22%] py-2 font-bold text-gray-600 border-b border-gray-200">Blood Group</td>
                            <td className="w-[28%] py-2 font-semibold text-gray-900 border-b border-gray-200">{data.bloodGroup || 'N/A'}</td>
                            <td className="w-[22%] py-2 font-bold text-gray-600 border-b border-gray-200 pl-4">Previous Institute</td>
                            <td className="w-[28%] py-2 font-semibold text-gray-900 border-b border-gray-200 truncate pr-2 max-w-[150px]">{data.previousInstitute || 'N/A'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Parent Details */}
                <h3 className="text-sm font-bold bg-gray-100 px-3 py-1.5 mb-2 border-l-4 border-indigo-600 uppercase tracking-wide">Parent / Emergency Contact Information</h3>
                <table className="w-full mb-5 text-xs border-collapse">
                    <tbody>
                        <tr>
                            <td className="w-[22%] py-2 font-bold text-gray-600 border-b border-gray-200">Father's Name</td>
                            <td className="w-[28%] py-2 font-semibold text-gray-900 border-b border-gray-200">{data.fatherName}</td>
                            <td className="w-[22%] py-2 font-bold text-gray-600 border-b border-gray-200 pl-4">Profession</td>
                            <td className="w-[28%] py-2 font-semibold text-gray-900 border-b border-gray-200">{data.fatherProfession || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td className="w-[22%] py-2 font-bold text-gray-600 border-b border-gray-200">Mother's Name</td>
                            <td className="w-[28%] py-2 font-semibold text-gray-900 border-b border-gray-200">{data.motherName || 'N/A'}</td>
                            <td className="w-[22%] py-2 font-bold text-gray-600 border-b border-gray-200 pl-4">Profession</td>
                            <td className="w-[28%] py-2 font-semibold text-gray-900 border-b border-gray-200">{data.motherProfession || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td className="w-[22%] py-2 font-bold text-gray-600 border-b border-gray-200">Contact Number</td>
                            <td className="w-[28%] py-2 font-semibold text-gray-900 border-b border-gray-200">{data.contactNumber}</td>
                            <td className="w-[22%] py-2 font-bold text-gray-600 border-b border-gray-200 pl-4">Email ID</td>
                            <td className="w-[28%] py-2 font-semibold text-gray-900 border-b border-gray-200 truncate pr-2 max-w-[150px]">{data.email || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td className="w-[22%] py-2 font-bold text-gray-600 border-b border-gray-200 align-top pt-2">Residential Address</td>
                            <td colSpan={3} className="py-2 font-semibold text-gray-900 border-b border-gray-200 leading-snug">
                                {data.address}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Rules & Regulations */}
                <div className="mt-6 text-[11px] text-gray-600 border border-gray-300 p-4 rounded bg-gray-50 leading-snug">
                    <h4 className="font-bold text-gray-900 mb-2 text-xs uppercase">Declarations & Rules</h4>
                    <ol className="list-decimal pl-4 space-y-1 mt-1">
                        <li>I hereby declare that all the information provided by me in this application is true and correct to the best of my knowledge and belief.</li>
                        <li>I understand that the RISE management reserves the right to cancel the internship if any information is found to be false.</li>
                        <li>I agree to abide by all the rules and regulations of the institute currently in force or as amended from time to time.</li>
                        <li>I will pay all program fees regularly and within the stipulated time.</li>
                    </ol>
                </div>

                {/* Signatures */}
                <div className="mt-14 flex justify-between px-6">
                    <div className="text-center w-[40%]">
                        <div className="border-b-[1.5px] border-gray-400 mb-1.5 h-8"></div>
                        <p className="font-bold text-gray-700 text-xs">Signature of Intern/Guardian</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Date: _________________</p>
                    </div>
                    <div className="text-center w-[40%]">
                        <div className="border-b-[1.5px] border-gray-400 mb-1.5 h-8"></div>
                        <p className="font-bold text-gray-700 text-xs">Signature of Director/Authority</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Date: _________________</p>
                    </div>
                </div>

                {/* Admin Use Only Section */}
                <div className="mt-10 border-t-[1.5px] border-dashed border-gray-400 pt-4">
                    <h4 className="font-bold text-gray-900 mb-3 uppercase text-xs tracking-wider">For Office Use Only</h4>
                    <div className="flex justify-between items-center bg-gray-100 p-3 border border-gray-200 rounded text-xs gap-4">
                        <div className="font-medium text-gray-800 flex items-center">
                            Status: <span className="uppercase font-bold border-b border-gray-400 pb-0.5 px-3 ml-2">{data.status}</span>
                        </div>
                        <div className="font-medium text-gray-800 flex items-center">
                            Admission No: <span className="border-b border-gray-400 pb-0.5 px-6 ml-2 inline-block w-16"></span>
                        </div>
                        <div className="font-medium text-gray-800 flex items-center">
                            Admission Officer Sign: <span className="border-b border-gray-400 pb-0.5 px-6 ml-2 inline-block w-16"></span>
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
}
