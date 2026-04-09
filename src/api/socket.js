// src/api/socket.js (النسخة المحسنة)
import { io } from 'socket.io-client';
import { getSecureItem } from '../utils/storage';

const SOCKET_URL = 'https://backend-walid-yahaya.onrender.com';

let socket = null;
let listeners = new Map();

// الاتصال بخادم WebSocket
export const connectSocket = async () => {
  const token = await getSecureItem('accessToken');
  if (!token) {
    console.log('No token found, cannot connect socket');
    return null;
  }

  if (socket && socket.connected) {
    console.log('Socket already connected');
    return socket;
  }

  socket = io(SOCKET_URL, {
    path: '/socket.io',
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully');
  });

  socket.on('connect_error', (error) => {
    console.log('Socket connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  return socket;
};

// قطع الاتصال
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    listeners.clear();
  }
};

// الحصول على كائن socket
export const getSocket = () => {
  return socket;
};

// الاستماع للأحداث
export const onEvent = (eventName, callback) => {
  if (socket) {
    socket.on(eventName, callback);
    if (!listeners.has(eventName)) {
      listeners.set(eventName, []);
    }
    listeners.get(eventName).push(callback);
  }
};

// إزالة الاستماع
export const offEvent = (eventName, callback) => {
  if (socket) {
    socket.off(eventName, callback);
    if (listeners.has(eventName)) {
      const callbacks = listeners.get(eventName).filter(cb => cb !== callback);
      if (callbacks.length === 0) {
        listeners.delete(eventName);
      } else {
        listeners.set(eventName, callbacks);
      }
    }
  }
};

// إزالة جميع المستمعين لحدث معين
export const removeAllListeners = (eventName) => {
  if (socket) {
    socket.off(eventName);
    listeners.delete(eventName);
  }
};

// إرسال حدث
export const emitEvent = (eventName, data) => {
  if (socket && socket.connected) {
    socket.emit(eventName, data);
    return true;
  }
  return false;
};

// ========== توحيد أسماء الأحداث ==========

// استماع لحدث طلب جديد
export const onNewOrder = (callback) => {
  onEvent('driver:new-order', callback);
};

// استماع لحدث تحديث الطلب
export const onOrderUpdated = (callback) => {
  onEvent('order:status:updated', callback);
};

// استماع لحدث إلغاء الطلب
export const onOrderCancelled = (callback) => {
  onEvent('driver:order-cancelled', callback);
};

// استماع لحدث طلب الموقع
export const onDriverLocationRequest = (callback) => {
  onEvent('driver:location:request', callback);
};

// استماع لحدث رسالة جديدة
export const onNewMessage = (conversationId, callback) => {
  onEvent(`chat:message:${conversationId}`, callback);
};

// استماع لحدث بدء التوصيل
export const onDeliveryStarted = (callback) => {
  onEvent('driver:delivery:started', callback);
};

// استماع لحدث إكمال التوصيل
export const onDeliveryCompleted = (callback) => {
  onEvent('driver:delivery:completed', callback);
};

// إرسال تحديث الموقع
export const emitLocation = (latitude, longitude, orderId = null) => {
  emitEvent('driver:location:updated', { latitude, longitude, orderId });
};

// إرسال بدء التوصيل
export const emitDeliveryStarted = (orderId) => {
  emitEvent('driver:delivery:started', { orderId });
};

// إرسال إكمال التوصيل
export const emitDeliveryCompleted = (orderId, signature = null, deliveryPhoto = null) => {
  emitEvent('driver:delivery:completed', { orderId, signature, deliveryPhoto });
};

// إرسال حالة الكتابة في الدردشة
export const emitTyping = (conversationId, isTyping = true) => {
  emitEvent('chat:typing', { conversationId, isTyping });
};