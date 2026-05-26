import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = true
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100"
            >
                <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                            <AlertTriangle size={20} />
                        </div>
                        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
                </div>
                <div className="bg-slate-50 px-5 py-4 flex justify-end gap-3 border-t border-slate-100">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={() => {
                            onConfirm();
                            onCancel(); // Auto close on confirm
                        }}
                        className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-colors ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
