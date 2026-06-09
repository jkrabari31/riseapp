import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, X, AlertCircle } from 'lucide-react';

export default function FollowUpPopup({ followups, onAction }: any) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible || followups.length === 0) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div 
                    initial={{ opacity: 0, y: 50, scale: 0.9 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    className="fixed bottom-6 right-6 z-[100] w-96 bg-white rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden"
                >
                    <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={20} />
                            <h3 className="font-bold">Follow-ups Reminder</h3>
                        </div>
                        <button onClick={() => setIsVisible(false)} className="text-white/80 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-4 max-h-64 overflow-y-auto bg-slate-50 divide-y divide-slate-100">
                        {followups.map((lead: any) => (
                            <div key={lead.id} className="py-3 flex justify-between items-center group">
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{lead.firstName} {lead.lastName}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                        <Phone size={12} /> {lead.mobileNo}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => onAction(lead)}
                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    Action
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 bg-white border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-500">You have {followups.length} pending follow-ups today.</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
