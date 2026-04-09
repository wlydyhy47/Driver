// src/hooks/useLocation.js (النسخة المحسنة)
import { useEffect, useRef, useState, useCallback } from 'react';
import LocationService from '../api/location';
import { getSocket, emitEvent, onEvent, offEvent } from '../api/socket';

export const useLocation = (isOnline = true, updateInterval = 10000) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const socketRef = useRef(null);

  // تحديث الموقع إلى الخادم
  const updateLocation = useCallback(async () => {
    if (!isOnline) return null;
    
    const result = await LocationService.updateLocationToServer();
    
    if (result.success) {
      setCurrentLocation({
        latitude: result.data?.data?.latitude,
        longitude: result.data?.data?.longitude,
        timestamp: new Date()
      });
      
      // إرسال عبر Socket للتحديث المباشر
      const socket = getSocket();
      if (socket && socket.connected) {
        emitEvent('driver:location:updated', {
          latitude: result.data?.data?.latitude,
          longitude: result.data?.data?.longitude,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } else {
      setError(result.message);
      return null;
    }
  }, [isOnline]);

  // بدء تتبع الموقع
  const startTracking = useCallback(async () => {
    if (!isOnline) {
      console.log('Driver is offline, not starting tracking');
      return;
    }
    
    if (isTracking) {
      console.log('Tracking already started');
      return;
    }
    
    setError(null);
    setIsTracking(true);
    
    // تحديث فوري
    await updateLocation();
    
    // بدء التتبع الدوري
    intervalRef.current = setInterval(async () => {
      await updateLocation();
    }, updateInterval);
    
    console.log('Location tracking started');
  }, [isOnline, isTracking, updateLocation, updateInterval]);

  // إيقاف تتبع الموقع
  const stopTracking = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    await LocationService.stopTracking();
    setIsTracking(false);
    console.log('Location tracking stopped');
  }, []);

  // تحديث حالة الاتصال (متصل/غير متصل)
  const updateOnlineStatus = useCallback(async (isOnlineStatus) => {
    const result = await LocationService.updateOnlineStatus(isOnlineStatus);
    if (result.success) {
      if (isOnlineStatus) {
        await startTracking();
      } else {
        await stopTracking();
      }
    }
    return result;
  }, [startTracking, stopTracking]);

  // الاستماع لأوامر الطلب من السيرفر
  const setupSocketListeners = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;
    
    socketRef.current = socket;
    
    // ✅ استخدام أسماء الأحداث المتوافقة مع الـ Backend
    onEvent('driver:new-order', (data) => {
      console.log('📦 New order received:', data);
      // يمكنك إرسال إشعار محلي هنا
    });
    
    onEvent('order:status:updated', (data) => {
      console.log('🔄 Order status updated:', data);
    });
    
    onEvent('driver:order-cancelled', (data) => {
      console.log('❌ Order cancelled:', data);
    });
    
    onEvent('driver:location:request', (data) => {
      console.log('📍 Location requested:', data);
      updateLocation();
    });
    
    onEvent('driver:delivery:started', (data) => {
      console.log('🚚 Delivery started:', data);
    });
    
    onEvent('driver:delivery:completed', (data) => {
      console.log('✅ Delivery completed:', data);
    });
    
    onEvent('chat:message:new', (data) => {
      console.log('💬 New message received:', data);
    });
  }, [updateLocation]);

  // تنظيف المستمعين
  const cleanupSocketListeners = useCallback(() => {
    if (!socketRef.current) return;
    
    offEvent('driver:new-order');
    offEvent('order:status:updated');
    offEvent('driver:order-cancelled');
    offEvent('driver:location:request');
    offEvent('driver:delivery:started');
    offEvent('driver:delivery:completed');
    offEvent('chat:message:new');
  }, []);

  useEffect(() => {
    if (isOnline) {
      startTracking();
      setupSocketListeners();
    }
    
    return () => {
      stopTracking();
      cleanupSocketListeners();
    };
  }, [isOnline, startTracking, stopTracking, setupSocketListeners, cleanupSocketListeners]);

  return {
    currentLocation,
    isTracking,
    error,
    startTracking,
    stopTracking,
    updateLocation,
    updateOnlineStatus
  };
};

export default useLocation;