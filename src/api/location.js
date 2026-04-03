import apiClient from './client';
import * as Location from 'expo-location';

// تحديث موقع المندوب الحالي
export const updateDriverLocation = async (latitude, longitude) => {
  try {
    const response = await apiClient.put('/driver/location', {
      location: { latitude, longitude },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل تحديث الموقع',
    };
  }
};

// الحصول على موقع العميل/المتجر لطلب معين
export const getOrderLocation = async (orderId) => {
  try {
    const response = await apiClient.get(`/driver/location/order/${orderId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل جلب موقع الطلب',
    };
  }
};

// تغيير حالة الاتصال (متصل/غير متصل)
export const updateOnlineStatus = async (isOnline) => {
  try {
    const response = await apiClient.put('/driver/online-status', {
      isOnline,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل تغيير الحالة',
    };
  }
};

// الحصول على موقع المندوب الحالي من الجهاز
export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, message: 'سماح الوصول إلى الموقع مطلوب' };
    }
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    return {
      success: true,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    return {
      success: false,
      message: 'فشل الحصول على الموقع',
    };
  }
};

// بدء تتبع الموقع في الخلفية
export const startBackgroundLocationTracking = async () => {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    return { success: false, message: 'سماح الوصول إلى الموقع في الخلفية مطلوب' };
  }
  
  await Location.startLocationUpdatesAsync('driver-location-task', {
    accuracy: Location.Accuracy.High,
    timeInterval: 10000, // كل 10 ثواني
    distanceInterval: 10, // كل 10 متر
    showsBackgroundLocationIndicator: true,
  });
  
  return { success: true };
};