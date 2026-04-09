// src/api/location.js (النسخة المحسنة)
import apiClient from './client';
import * as Location from 'expo-location';
import DriverService from './driverService';

class LocationService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.locationTaskName = 'driver-location-task';
  }

  // الحصول على الموقع الحالي من الجهاز
  async getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, message: 'سماح الوصول إلى الموقع مطلوب' };
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      return {
        success: true,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp
      };
    } catch (error) {
      console.error('Get current location error:', error);
      return {
        success: false,
        message: 'فشل الحصول على الموقع'
      };
    }
  }

  // تحديث الموقع إلى الخادم
  async updateLocationToServer(latitude = null, longitude = null, orderId = null) {
    try {
      let lat = latitude;
      let lng = longitude;
      
      if (!lat || !lng) {
        const location = await this.getCurrentLocation();
        if (!location.success) return { success: false };
        lat = location.latitude;
        lng = location.longitude;
      }
      
      return await DriverService.updateLocation(lat, lng, orderId);
    } catch (error) {
      console.error('Update location to server error:', error);
      return { success: false };
    }
  }

  // بدء تتبع الموقع في المقدمة
  async startForegroundTracking(updateInterval = 10000, onLocationUpdate = null) {
    if (this.isTracking) {
      console.log('Location tracking already started');
      return;
    }
    
    this.isTracking = true;
    
    // تحديث فوري
    const initialLocation = await this.updateLocationToServer();
    if (onLocationUpdate && initialLocation.success) {
      onLocationUpdate(initialLocation);
    }
    
    // بدء التتبع الدوري
    this.watchId = setInterval(async () => {
      const result = await this.updateLocationToServer();
      if (onLocationUpdate && result.success) {
        onLocationUpdate(result);
      }
    }, updateInterval);
    
    console.log('Foreground location tracking started');
  }

  // بدء تتبع الموقع في الخلفية
  async startBackgroundTracking() {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, message: 'سماح الوصول إلى الموقع في الخلفية مطلوب' };
      }
      
      await Location.startLocationUpdatesAsync(this.locationTaskName, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // كل 10 ثواني
        distanceInterval: 10, // كل 10 متر
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'تتبع الموقع',
          notificationBody: 'تطبيق المندوب يعمل في الخلفية',
          notificationColor: '#d25419',
        }
      });
      
      return { success: true, message: 'تم بدء تتبع الموقع في الخلفية' };
    } catch (error) {
      console.error('Start background tracking error:', error);
      return { success: false, message: 'فشل بدء تتبع الموقع' };
    }
  }

  // إيقاف تتبع الموقع
  async stopTracking() {
    if (this.watchId) {
      clearInterval(this.watchId);
      this.watchId = null;
    }
    
    try {
      await Location.stopLocationUpdatesAsync(this.locationTaskName);
    } catch (error) {
      console.error('Stop location updates error:', error);
    }
    
    this.isTracking = false;
    console.log('Location tracking stopped');
  }

  // الحصول على موقع الطلب
  async getOrderLocation(orderId) {
    return await DriverService.getOrderLocation(orderId);
  }

  // تغيير حالة الاتصال (متصل/غير متصل)
  async updateOnlineStatus(isOnline) {
    return await DriverService.toggleAvailability(isOnline);
  }

  // حساب المسافة بين نقطتين
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // تنسيق المسافة للعرض
  formatDistance(distanceKm) {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} م`;
    }
    return `${distanceKm.toFixed(1)} كم`;
  }

  // الحصول على عنوان من الإحداثيات (عكسياً)
  async reverseGeocode(latitude, longitude) {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results.length > 0) {
        const address = results[0];
        return `${address.street || ''} ${address.city || ''} ${address.region || ''}`.trim();
      }
      return null;
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return null;
    }
  }
}

export default new LocationService();