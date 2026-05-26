import numWords from 'num-words';
import { useSettingsStore } from '../store/settingsStore';

export default function FeeReceiptPdfTemplate({ data }: { data: any }) {
    const instituteName = useSettingsStore(state => state.instituteName);
    const address = useSettingsStore(state => state.address);
    const contactEmail = useSettingsStore(state => state.contactEmail);

    if (!data) return null;

    // Helper to format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Helper to get Amount in Words (Title Case)
    const amountInWords = (amount: number) => {
        try {
            const words = numWords(amount);
            // Capitalize first letter of each word
            return words.replace(/\b\w/g, (l: string) => l.toUpperCase()) + ' Only';
        } catch (e) {
            return '';
        }
    };

    const receiptDate = new Date(data.paymentDate).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    return (
        <>
            <style>
                {`
                @media print {
                    @page { size: A5 landscape; margin: 5mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                `}
            </style>
            <div className="w-[200mm] min-h-[130mm] mx-auto bg-white text-black p-4 font-sans box-border flex flex-col justify-between" style={{ pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>

                <div>
                    {/* School Header */}
                    <div className="flex items-center justify-between border-b-2 border-indigo-900 pb-2 mb-3">
                        <div>
                            <h1 className="text-2xl font-black text-indigo-900 tracking-tight uppercase">{instituteName}</h1>
                            <p className="text-gray-600 mt-0.5 text-xs font-medium">{address}</p>
                            <p className="text-gray-600 text-xs mt-0.5">Email: {contactEmail}</p>
                        </div>
                        <div className="text-right">

                            <div className="inline-block border-2 border-indigo-900 rounded-lg px-3 py-1.5 bg-indigo-50">
                                <h2 className="text-lg font-bold text-indigo-900 uppercase tracking-widest">Fee Receipt</h2>
                                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Intern Copy</p>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Details Grid */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="space-y-1">
                            <p className="text-xs"><span className="font-bold text-gray-700 w-24 inline-block">Receipt No:</span> <span className="font-semibold text-gray-900">{data.receiptNumber}</span></p>
                            <p className="text-xs"><span className="font-bold text-gray-700 w-24 inline-block">Payment Date:</span> <span className="font-semibold text-gray-900">{receiptDate}</span></p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-xs"><span className="font-bold text-gray-700">Academic Year:</span> <span className="font-semibold text-gray-900">2024-2025</span></p>
                        </div>
                    </div>

                    {/* Student Details */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-3">
                        <div className="grid grid-cols-2 gap-3">
                            <p className="text-xs"><span className="font-bold text-gray-700 block text-[10px] uppercase mb-0.5">Intern Name</span> <span className="font-semibold text-gray-900 text-sm">{data.student.name}</span></p>
                            <p className="text-xs"><span className="font-bold text-gray-700 block text-[10px] uppercase mb-0.5">Admission No</span> <span className="font-semibold text-gray-900 text-sm">{data.student.admissionNumber}</span></p>
                            <p className="text-xs"><span className="font-bold text-gray-700 block text-[10px] uppercase mb-0.5">Program & Section</span> <span className="font-semibold text-gray-900 text-sm">{data.student.classLevel} - {data.student.section}</span></p>
                            <p className="text-xs"><span className="font-bold text-gray-700 block text-[10px] uppercase mb-0.5">Roll Number</span> <span className="font-semibold text-gray-900 text-sm">{data.student.rollNumber || '-'}</span></p>
                        </div>
                    </div>

                    {/* Payment Breakdown Table */}
                    <table className="w-full mb-3 border-collapse border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700">
                                <th className="border border-gray-300 py-2 px-3 text-left font-bold uppercase text-[10px] w-3/4">Description</th>
                                <th className="border border-gray-300 py-2 px-3 text-right font-bold uppercase text-[10px] w-1/4">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 py-2 px-3 text-gray-800 text-sm font-medium">
                                    Tuition & Total Yearly Fees Installment
                                    <span className="block text-[10px] text-gray-500 mt-0.5 font-normal">Payment Mode: {data.paymentMode}</span>
                                </td>
                                <td className="border border-gray-300 py-2 px-3 text-right font-bold text-gray-900 text-base">
                                    {formatCurrency(data.amountPaid)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Amount in Words */}
                    <div className="mb-2">
                        <p className="text-xs flex items-start gap-2">
                            <span className="font-bold text-gray-700 whitespace-nowrap">Amount in Words:</span>
                            <span className="font-semibold text-gray-900 italic border-b border-gray-400 border-dashed pb-0.5 flex-1">
                                Rupees {amountInWords(data.amountPaid)}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between items-end mt-2">
                    <div className="text-center w-48">
                        <p className="text-[10px] text-gray-500 italic mb-1">This is a system generated print.</p>
                    </div>
                    <div className="text-center w-48">
                        <div className="border-b-[1.5px] border-gray-800 mb-1.5 h-8"></div>
                        <p className="font-bold text-gray-900 text-xs">Authorized Signatory</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Admission Officer / Cashier</p>
                    </div>
                </div>

            </div>
        </>
    );
}
