import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { updateDriverLocation, getCurrentLocation } from '../api/location';
import { getSocket, onEvent, offEvent } from '../api/socket';

let locationInterval = null;

export const useLocation = (isOnline = true, updateInterval = 10000) => {
  const socketRef = useRef(null);

  // بدء تتبع الموقع وتحديثه للخادم
  const startLocationTracking = async () => {
    if (!isOnline) return;

    // طلب صلاحيات الموقع
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permission to access location was denied');
      return;
    }

    // تحديث الموقع فوراً
    await updateLocationToServer();

    // تحديث الموقع كل فترة زمنية
    if (locationInterval) {
      clearInterval(locationInterval);
    }

    locationInterval = setInterval(async () => {
      await updateLocationToServer();
    }, updateInterval);
  };

  // تحديث الموقع إلى الخادم
  const updateLocationToServer = async () => {
    try {
      const location = await getCurrentLocation();
      if (location.success) {
        await updateDriverLocation(location.latitude, location.longitude);
        
        // إرسال الموقع عبر Socket للتحديث المباشر
        const socket = getSocket();
        if (socket && socket.connected) {
          socket.emit('driver:location', {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.log('Error updating location:', error);
    }
  };

  // إيقاف التتبع
  const stopLocationTracking = () => {
    if (locationInterval) {
      clearInterval(locationInterval);
      locationInterval = null;
    }
  };

  // الاستماع لأوامر الطلب من السيرفر
  const setupSocketListeners = () => {
    const socket = getSocket();
    if (!socket) return;

    // طلب جديد للمندوب
    onEvent('driver:new-order', (data) => {
      console.log('New order received:', data);
      // يمكنك إرسال إشعار محلي هنا
    });

    // تحديث حالة الطلب
    onEvent('driver:order-updated', (data) => {
      console.log('Order updated:', data);
    });

    // رسالة جديدة في الدردشة
    onEvent('driver:new-message', (data) => {
      console.log('New message received:', data);
    });

    // طلب إلغاء
    onEvent('driver:order-cancelled', (data) => {
      console.log('Order cancelled:', data);
    });
  };

  useEffect(() => {
    if (isOnline) {
      startLocationTracking();
      setupSocketListeners();
    }

    return () => {
      stopLocationTracking();
    };
  }, [isOnline]);

  return {
    startLocationTracking,
    stopLocationTracking,
    updateLocationToServer,
  };
};

export default useLocation;