import apiClient from './client';

// قائمة الطلبات المخصصة للمندوب
export const getDriverOrders = async (status = null) => {
  try {
    const params = status ? { status } : {};
    const response = await apiClient.get('/driver/orders', { params });
    return { success: true, data: response.data.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل جلب الطلبات',
    };
  }
};

// قبول طلب
export const acceptOrder = async (orderId) => {
  try {
    const response = await apiClient.put(`/driver/orders/${orderId}/accept`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل قبول الطلب',
    };
  }
};

// رفض طلب
export const rejectOrder = async (orderId) => {
  try {
    const response = await apiClient.put(`/driver/orders/${orderId}/reject`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل رفض الطلب',
    };
  }
};

// تحديث حالة الطلب
export const updateOrderStatus = async (orderId, status, location = null) => {
  try {
    const response = await apiClient.put(`/driver/orders/${orderId}/status`, {
      status,
      location,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل تحديث الحالة',
    };
  }
};

// بدء التوصيل
export const startDelivery = async (orderId) => {
  try {
    const response = await apiClient.post(`/driver/orders/${orderId}/start`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل بدء التوصيل',
    };
  }
};

// إنهاء الطلب
export const completeOrder = async (orderId) => {
  try {
    const response = await apiClient.post(`/driver/orders/${orderId}/complete`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل إنهاء الطلب',
    };
  }
};

// تاريخ الطلبات
export const getOrderHistory = async (page = 1, limit = 20) => {
  try {
    const response = await apiClient.get('/driver/orders/history', {
      params: { page, limit },
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل جلب تاريخ الطلبات',
    };
  }
};