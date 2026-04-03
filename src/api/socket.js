import { io } from 'socket.io-client';
import { getSecureItem } from '../utils/storage';

let socket = null;

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

  socket = io('https://backend-walid-yahaya.onrender.com', {
    path: '/socket.io',
    transports: ['websocket'],
    auth: {
      token: token,
    },
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
  }
};

// إزالة الاستماع
export const offEvent = (eventName, callback) => {
  if (socket) {
    socket.off(eventName, callback);
  }
};

// إرسال حدث
export const emitEvent = (eventName, data) => {
  if (socket && socket.connected) {
    socket.emit(eventName, data);
  }
};