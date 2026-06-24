import { create } from 'zustand';
import api from '../utils/api';

interface Batch {
    id: string;
    name: string;
    isCurrent: boolean;
}

interface SettingsState {
    instituteName: string;
    academicYear: string;
    contactEmail: string;
    address: string;
    
    // Batch Management
    batches: Batch[];
    activeBatchId: string | null;
    selectedBatchId: string | 'ALL';
    setSelectedBatchId: (id: string | 'ALL') => void;
    fetchBatches: () => Promise<void>;
    
    fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    instituteName: 'Rishabh Software',
    academicYear: '2024-2025',
    contactEmail: 'contact@rise.in',
    address: '123 Innovation Lane',
    
    batches: [],
    activeBatchId: null,
    selectedBatchId: 'ALL',
    
    setSelectedBatchId: (id) => set({ selectedBatchId: id }),
    
    fetchBatches: async () => {
        try {
            const res = await api.get('/scheduler/batches');
            const batches: Batch[] = res.data;
            const activeBatch = batches.find(b => b.isCurrent);
            
            set({ 
                batches, 
                activeBatchId: activeBatch?.id || null,
                selectedBatchId: useSettingsStore.getState().selectedBatchId === 'ALL' && !activeBatch 
                    ? 'ALL' 
                    : (useSettingsStore.getState().selectedBatchId === 'ALL' ? activeBatch?.id || 'ALL' : useSettingsStore.getState().selectedBatchId)
            });
        } catch (error) {
            console.error('Failed to fetch batches for store', error);
        }
    },

    fetchSettings: async () => {
        try {
            const res = await api.get('/settings/public');
            if (res.data) {
                set({
                    instituteName: res.data.instituteName || 'Rishabh Software',
                    address: res.data.address || '123 Innovation Lane',
                    contactEmail: res.data.contactEmail || 'contact@rise.in'
                });
            }
        } catch (error) {
            console.error('Failed to fetch public settings', error);
        }
    }
}));
