import { create } from 'zustand';
import api from '../utils/api';

interface SettingsState {
    instituteName: string;
    academicYear: string;
    contactEmail: string;
    address: string;
    fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    instituteName: 'Rishabh Software',
    academicYear: '2024-2025',
    contactEmail: 'contact@rise.in',
    address: '123 Innovation Lane',
    fetchSettings: async () => {
        try {
            // We use the public endpoint so it works everywhere including Login
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
