// src/store/authStore.js (النسخة المحسنة)
import { create } from 'zustand';
import DriverService from '../api/driverService';
import { connectSocket, disconnectSocket } from '../api/socket';
import { saveSecureItem, deleteSecureItem, getSecureItem } from '../utils/storage';
import { login as loginApi } from '../api/auth';
import LocationService from '../api/location';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isOnline: false,
  stats: { 
    todayOrders: 0, 
    totalOrders: 0, 
    rating: 0, 
    earnings: 0,
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0
  },

  // تسجيل الدخول
  login: async (phone, password) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await loginApi(phone, password);
      
      if (result.success && result.data) {
        const { accessToken, refreshToken, user } = result.data;
        
        // حفظ التوكنات
        await saveSecureItem('accessToken', accessToken);
        await saveSecureItem('refreshToken', refreshToken);
        
        // جلب البيانات الكاملة للمندوب
        const profile = await DriverService.getProfile();
        const stats = await DriverService.getStats();
        
        // الاتصال بـ Socket.io
        await connectSocket();
        
        // بدء تتبع الموقع إذا كان متاحاً
        if (profile?.isAvailable) {
          await LocationService.startForegroundTracking();
        }
        
        set({ 
          user: profile, 
          isAuthenticated: true, 
          isLoading: false,
          isOnline: profile?.isAvailable || false,
          stats: stats || get().stats
        });
        
        return true;
      } else {
        set({ error: result.message, isLoading: false });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      set({ error: error.message || 'فشل تسجيل الدخول', isLoading: false });
      return false;
    }
  },

  // تسجيل الخروج
  logout: async () => {
    // إيقاف تتبع الموقع
    await LocationService.stopTracking();
    
    // قطع اتصال Socket
    disconnectSocket();
    
    // حذف التوكنات
    await deleteSecureItem('accessToken');
    await deleteSecureItem('refreshToken');
    
    set({ 
      user: null, 
      isAuthenticated: false, 
      isOnline: false,
      stats: { todayOrders: 0, totalOrders: 0, rating: 0, earnings: 0 }
    });
  },

  // تحميل بيانات المستخدم
  loadUser: async () => {
    set({ isLoading: true });
    
    try {
      const token = await getSecureItem('accessToken');
      if (!token) {
        set({ isAuthenticated: false, isLoading: false });
        return false;
      }
      
      const profile = await DriverService.getProfile();
      
      if (profile) {
        const stats = await DriverService.getStats();
        
        // الاتصال بـ Socket.io
        await connectSocket();
        
        // بدء تتبع الموقع إذا كان متاحاً
        if (profile.isAvailable) {
          await LocationService.startForegroundTracking();
        }
        
        set({ 
          user: profile, 
          isAuthenticated: true, 
          isLoading: false,
          isOnline: profile.isAvailable || false,
          stats: stats || get().stats
        });
        
        return true;
      } else {
        set({ isAuthenticated: false, isLoading: false });
        return false;
      }
    } catch (error) {
      console.error('Load user error:', error);
      set({ isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  // تبديل حالة الاتصال (متصل/غير متصل)
  toggleOnlineStatus: async () => {
    const newStatus = !get().isOnline;
    const result = await DriverService.toggleAvailability(newStatus);
    
    if (result && result.success !== false) {
      set({ isOnline: newStatus });
      
      if (get().user) {
        set({ user: { ...get().user, isAvailable: newStatus } });
      }
      
      // بدء أو إيقاف تتبع الموقع حسب الحالة
      if (newStatus) {
        await LocationService.startForegroundTracking();
      } else {
        await LocationService.stopTracking();
      }
      
      return true;
    }
    return false;
  },

  // تحديث الملف الشخصي
  updateProfile: async (profileData) => {
    const result = await DriverService.updateProfile(profileData);
    if (result) {
      set({ user: { ...get().user, ...result } });
      return true;
    }
    return false;
  },

  // تحديث الصورة الشخصية
  updateAvatar: async (imageFile) => {
    const result = await DriverService.updateAvatar(imageFile);
    if (result) {
      set({ user: { ...get().user, avatar: result.image, image: result.image } });
      return true;
    }
    return false;
  },

  // تحديث الإحصائيات
  setStats: (stats) => set({ stats }),

  // تحديث الإحصائيات من الخادم
  refreshStats: async () => {
    const stats = await DriverService.getStats();
    if (stats) {
      set({ stats });
    }
    return stats;
  },

  // مسح الخطأ
  clearError: () => set({ error: null }),

  // الحصول على معلومات المندوب
  getDriverInfo: () => {
    const { user, stats, isOnline } = get();
    return {
      ...user,
      ...stats,
      isOnline
    };
  }
}));

export default useAuthStore;