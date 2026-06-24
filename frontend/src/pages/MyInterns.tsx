import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Download } from 'lucide-react';
import api from '../utils/api';
import * as XLSX from 'xlsx';
import { useSettingsStore } from '../store/settingsStore';

export default function MyInterns() {
    const { selectedBatchId, activeBatchId } = useSettingsStore();
    const [students, setStudents] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const response = await api.get('/students/my-students');
            setStudents(response.data);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const exportData = students.map(s => ({
            'Admission No': s.admissionNumber,
            'Name': s.name,
            'Class & Section': `${s.classLevel} - ${s.section}`,
            'Gender': s.gender,
            'Parent Email': s.parentEmail || 'N/A'
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'My Interns');
        XLSX.writeFile(workbook, 'My_Interns_List.xlsx');
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());
            
        const targetBatchId = selectedBatchId === 'ALL' ? null : (selectedBatchId || activeBatchId);
        const matchesBatch = targetBatchId ? s.batchId === targetBatchId : true;
        
        return matchesSearch && matchesBatch;
    });

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="text-indigo-600" /> My Interns
                </h1>
                <button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2">
                    <Download size={18} /> Export List
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="relative mb-6 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900"
                        placeholder="Search interns by name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-xs">
                                <th className="p-4 font-semibold tracking-wider">ID</th>
                                <th className="p-4 font-semibold tracking-wider">Intern Name</th>
                                <th className="p-4 font-semibold tracking-wider">Program & Section</th>
                                <th className="p-4 font-semibold tracking-wider">Contact Email</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading your interns...</td></tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No interns found assigned to your batches.</td></tr>
                            ) : (
                                filteredStudents.map((s) => (
                                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-sm font-bold text-indigo-900">{s.admissionNumber}</td>
                                        <td className="p-4 text-sm font-semibold text-slate-800">{s.name}</td>
                                        <td className="p-4 text-sm text-slate-600">
                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold border border-indigo-100">
                                                {s.classLevel} - {s.section}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600 truncate max-w-[150px]">{s.parentEmail || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
}
