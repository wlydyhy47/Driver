import apiClient from './client';

// قائمة المحادثات
export const getConversations = async () => {
  try {
    const response = await apiClient.get('/chat/conversations');
    return { success: true, data: response.data.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل جلب المحادثات',
    };
  }
};

// إرسال رسالة
export const sendMessage = async (conversationId, content, type = 'text') => {
  try {
    const response = await apiClient.post('/chat/messages', {
      conversationId,
      content,
      type,
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل إرسال الرسالة',
    };
  }
};

// قراءة رسائل محادثة
export const getMessages = async (conversationId, page = 1, limit = 50) => {
  try {
    const response = await apiClient.get(`/chat/messages/${conversationId}`, {
      params: { page, limit },
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل جلب الرسائل',
    };
  }
};

// وضع علامة مقروء على الرسائل
export const markMessagesAsRead = async (conversationId) => {
  try {
    const response = await apiClient.put(`/chat/conversations/${conversationId}/read`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'فشل تحديث حالة القراءة',
    };
  }
};