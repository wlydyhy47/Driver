import { create } from 'zustand';
import { login as loginApi, logout as logoutApi, getDriverProfile, updateDriverProfile } from '../api/auth';
import { updateOnlineStatus } from '../api/location';
import { getSecureItem } from '../utils/storage';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isOnline: false,
  stats: { todayOrders: 0, totalOrders: 0, rating: 0, earnings: 0 },

  login: async (phone, password) => {
    set({ isLoading: true, error: null });
    const result = await loginApi(phone, password);
    
    if (result.success) {
      set({ user: result.user, isAuthenticated: true, isLoading: false, isOnline: result.user?.isOnline || false });
      return true;
    } else {
      set({ error: result.message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await logoutApi();
    set({ user: null, isAuthenticated: false, error: null, isOnline: false });
  },

  loadUser: async () => {
    const token = await getSecureItem('accessToken');
    if (!token) {
      set({ isAuthenticated: false });
      return false;
    }
    
    set({ isLoading: true });
    const result = await getDriverProfile();
    
    if (result.success) {
      set({ 
        user: result.data, 
        isAuthenticated: true, 
        isLoading: false,
        isOnline: result.data?.isOnline || false
      });
      return true;
    } else {
      set({ isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  toggleOnlineStatus: async () => {
    const newStatus = !get().isOnline;
    const result = await updateOnlineStatus(newStatus);
    
    if (result.success) {
      set({ isOnline: newStatus });
      if (get().user) {
        set({ user: { ...get().user, isOnline: newStatus } });
      }
      return true;
    }
    return false;
  },

  updateProfile: async (profileData) => {
    const result = await updateDriverProfile(profileData);
    if (result.success) {
      set({ user: { ...get().user, ...result.data } });
      return true;
    }
    return false;
  },

  setStats: (stats) => set({ stats }),

  clearError: () => set({ error: null }),
}));

export default useAuthStore;