// src/api/chat.js (النسخة المحسنة)
import apiClient from './client';

class ChatService {
  constructor() {
    this.baseUrl = '/chat';
  }

  // جلب قائمة المحادثات
  async getConversations() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/conversations`);
      const conversations = response.data.data?.conversations || response.data.data || [];
      return { 
        success: true, 
        data: this.normalizeConversations(conversations) 
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'فشل جلب المحادثات',
      };
    }
  }

  // إرسال رسالة
  async sendMessage(conversationId, content, type = 'text') {
    try {
      const response = await apiClient.post(`${this.baseUrl}/conversations/${conversationId}/messages/text`, {
        content
      });
      return { 
        success: true, 
        data: this.normalizeMessage(response.data.data?.message || response.data.data) 
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'فشل إرسال الرسالة',
      };
    }
  }

  // جلب رسائل محادثة
  async getMessages(conversationId, page = 1, limit = 50) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/conversations/${conversationId}/messages`, {
        params: { page, limit },
      });
      const messages = response.data.data?.messages || response.data.data || [];
      return { 
        success: true, 
        data: this.normalizeMessages(messages),
        pagination: response.data.data?.pagination
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'فشل جلب الرسائل',
      };
    }
  }

  // وضع علامة مقروء على الرسائل
  async markMessagesAsRead(conversationId) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/conversations/${conversationId}/read`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'فشل تحديث حالة القراءة',
      };
    }
  }

  // إرسال إشعار كتابة
  async sendTypingIndicator(conversationId, isTyping = true) {
    try {
      await apiClient.post(`${this.baseUrl}/conversations/${conversationId}/typing`, { isTyping });
    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  }

  // ========== دوال مساعدة ==========
  
  normalizeConversations(conversations) {
    return (conversations || []).map(conv => ({
      ...conv,
      id: conv._id,
      lastMessageText: conv.lastMessage?.content?.text || '',
      lastMessageTime: conv.lastActivity,
      lastMessageDate: this.formatDate(conv.lastActivity),
      otherParticipant: conv.otherParticipant || conv.participants?.find(p => p._id !== this.getCurrentUserId())
    }));
  }

  normalizeMessages(messages) {
    const currentUserId = this.getCurrentUserId();
    return (messages || []).map(msg => ({
      ...msg,
      id: msg._id,
      content: msg.content?.text || '',
      isMine: msg.sender?._id === currentUserId || msg.sender === currentUserId,
      time: this.formatTime(msg.delivery?.sentAt || msg.createdAt)
    }));
  }

  normalizeMessage(message) {
    return {
      ...message,
      id: message._id,
      content: message.content?.text || '',
      isMine: true,
      time: this.formatTime(message.delivery?.sentAt || message.createdAt)
    };
  }

  getCurrentUserId() {
    // يمكن جلب من AsyncStorage أو AuthStore
    return null;
  }

  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) {
      return 'اليوم';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'أمس';
    } else {
      return d.toLocaleDateString('ar-SA');
    }
  }

  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  }
}

export default new ChatService();