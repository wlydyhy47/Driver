import axios from 'axios';
import { getSecureItem, saveSecureItem, deleteSecureItem } from '../utils/storage';

const API_BASE_URL = 'https://backend-walid-yahaya.onrender.com/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// إضافة التوكن لكل request
apiClient.interceptors.request.use(async (config) => {
  const token = await getSecureItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// معالجة انتهاء التوكن
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = await getSecureItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          await saveSecureItem('accessToken', accessToken);
          await saveSecureItem('refreshToken', newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axios(originalRequest);
        } catch (refreshError) {
          await deleteSecureItem('accessToken');
          await deleteSecureItem('refreshToken');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;