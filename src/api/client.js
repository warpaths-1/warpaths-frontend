import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://warpaths-api.onrender.com',
  timeout: 300000, // 300s — covers slow AI calls (extraction, advisor, GameEval)
});

client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('warpaths_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('warpaths_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
