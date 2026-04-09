// src/api/driverService.js
import apiClient from './client';
import { getSecureItem } from '../utils/storage';

class DriverService {
  constructor() {
    this.baseUrl = '/driver';
  }

  // ========== المصادقة والملف الشخصي ==========
  
  async getProfile() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/profile`);
      return this.normalizeUser(response.data.data);
    } catch (error) {
      console.error('Get profile error:', error);
      return null;
    }
  }

  async updateProfile(data) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/profile`, data);
      return response.data.data;
    } catch (error) {
      console.error('Update profile error:', error);
      return null;
    }
  }

  async updateAvatar(imageFile) {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageFile,
        type: 'image/jpeg',
        name: 'avatar.jpg'
      });
      
      const response = await apiClient.put(`${this.baseUrl}/profile/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.data;
    } catch (error) {
      console.error('Update avatar error:', error);
      return null;
    }
  }

  async toggleAvailability(isAvailable) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/profile/availability`, { isAvailable });
      return response.data.data;
    } catch (error) {
      console.error('Toggle availability error:', error);
      return null;
    }
  }

  // ========== الطلبات ==========
  
  async getAvailableOrders() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/orders`, { params: { status: 'pending' } });
      return {
        orders: this.normalizeOrders(response.data.data?.orders || []),
        stats: response.data.data?.stats || {}
      };
    } catch (error) {
      console.error('Get available orders error:', error);
      return { orders: [], stats: {} };
    }
  }

  async getActiveOrder() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/orders/active`);
      if (!response.data.data) return null;
      return this.normalizeOrder(response.data.data.order || response.data.data);
    } catch (error) {
      console.error('Get active order error:', error);
      return null;
    }
  }

  async getOrderHistory(page = 1, limit = 20) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/orders/history`, {
        params: { page, limit }
      });
      return {
        orders: this.normalizeOrders(response.data.data?.orders || []),
        pagination: response.data.data?.pagination || { page, limit, total: 0, pages: 0 },
        stats: response.data.data?.stats || { totalOrders: 0, totalEarnings: 0 }
      };
    } catch (error) {
      console.error('Get order history error:', error);
      return { orders: [], pagination: { page, limit, total: 0, pages: 0 }, stats: {} };
    }
  }

  async getOrderDetails(orderId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/orders/${orderId}`);
      return this.normalizeOrder(response.data.data?.order || response.data.data);
    } catch (error) {
      console.error('Get order details error:', error);
      return null;
    }
  }

  async acceptOrder(orderId) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/orders/${orderId}/accept`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'فشل قبول الطلب'
      };
    }
  }

  async rejectOrder(orderId, reason = '') {
    try {
      const response = await apiClient.put(`${this.baseUrl}/orders/${orderId}/reject`, { reason });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'فشل رفض الطلب'
      };
    }
  }

  async startDelivery(orderId) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/orders/${orderId}/start`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'فشل بدء التوصيل'
      };
    }
  }

  async completeOrder(orderId, signature = null, deliveryPhoto = null) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/orders/${orderId}/complete`, {
        signature,
        deliveryPhoto
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'فشل إنهاء الطلب'
      };
    }
  }

  async updateOrderStatus(orderId, status, location = null) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/orders/${orderId}/status`, {
        status,
        location
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'فشل تحديث حالة الطلب'
      };
    }
  }

  // ========== الموقع ==========
  
  async updateLocation(latitude, longitude, orderId = null) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/location`, { 
        latitude, 
        longitude,
        orderId 
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'فشل تحديث الموقع'
      };
    }
  }

  async getOrderLocation(orderId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/location/order/${orderId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'فشل جلب موقع الطلب'
      };
    }
  }

  // ========== الأرباح والإحصائيات ==========
  
  async getEarnings(period = 'week') {
    try {
      const response = await apiClient.get(`${this.baseUrl}/earnings`, { params: { period } });
      return response.data.data;
    } catch (error) {
      console.error('Get earnings error:', error);
      return { earnings: [], totals: { totalOrders: 0, totalEarnings: 0 } };
    }
  }

  async getEarningsHistory(page = 1, limit = 20) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/earnings/history`, {
        params: { page, limit }
      });
      return response.data.data;
    } catch (error) {
      console.error('Get earnings history error:', error);
      return { earnings: [], stats: {}, pagination: { page, limit, total: 0, pages: 0 } };
    }
  }

  async getStats() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/stats`);
      return response.data.data;
    } catch (error) {
      console.error('Get stats error:', error);
      return null;
    }
  }

  async getPerformance() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/performance`);
      return response.data.data;
    } catch (error) {
      console.error('Get performance error:', error);
      return null;
    }
  }

  // ========== دوال مساعدة لتطبيع البيانات ==========
  
  normalizeOrder(order) {
    if (!order) return null;
    
    return {
      ...order,
      id: order._id,  // ✅ إضافة id كمرادف لـ _id للتوافق
      statusText: this.getStatusText(order.status),
      canCancel: ['pending', 'accepted'].includes(order.status),
      canStart: order.status === 'accepted',
      canComplete: order.status === 'picked',
      itemCount: order.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0,
      formattedTotal: this.formatCurrency(order.totalPrice),
      createdAtFormatted: this.formatDate(order.createdAt),
      deliveredAtFormatted: this.formatDate(order.deliveredAt)
    };
  }

  normalizeOrders(orders) {
    return (orders || []).map(order => this.normalizeOrder(order));
  }

  normalizeUser(user) {
    if (!user) return null;
    
    return {
      ...user,
      id: user._id,
      fullName: user.name,
      avatar: user.image,
      phone: user.phone,
      email: user.email,
      isAvailable: user.driverInfo?.isAvailable || false,
      totalDeliveries: user.driverInfo?.totalDeliveries || 0,
      earnings: user.driverInfo?.earnings || 0,
      rating: user.driverInfo?.rating || 0,
      totalRatings: user.driverInfo?.totalRatings || 0
    };
  }

  getStatusText(status) {
    const statusMap = {
      pending: 'قيد الانتظار',
      accepted: 'تم القبول',
      ready: 'جاهز',
      picked: 'تم الاستلام',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي'
    };
    return statusMap[status] || status;
  }

  formatCurrency(amount) {
    if (!amount && amount !== 0) return '0 CFA';
    return new Intl.NumberFormat('fr-FR').format(amount) + ' CFA';
  }

  formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleString('ar-SA');
  }
}

export default new DriverService();