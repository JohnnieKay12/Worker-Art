import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

// Import types
import type {
  User,
  Artisan,
  Booking,
  Payment,
  Review,
  Message,
  Conversation,
  ServiceCategory,
  Address,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  ApiResponse,
  Pagination,
  UserDashboard,
  ArtisanDashboard,
  AdminDashboard,
  ArtisanFilters,
  BookingFilters,
  WorkImage,
  CompletionDetails,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Try to refresh token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { token, refreshToken: newRefreshToken } = response.data;
        useAuthStore.getState().setTokens(token, newRefreshToken);

        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const apiService = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    api.get<ApiResponse<T>>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.post<ApiResponse<T>>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.put<ApiResponse<T>>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.patch<ApiResponse<T>>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    api.delete<ApiResponse<T>>(url, config).then((res) => res.data),
};

// Auth API
export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiService.post<AuthResponse>('/auth/login', credentials),

  register: (data: RegisterData) =>
    apiService.post<AuthResponse>('/auth/register', data),

  logout: () => apiService.post('/auth/logout'),

  getMe: () => apiService.get<{ user: User; artisanProfile?: Artisan }>('/auth/me'),

  updateProfile: (data: Partial<User>) =>
    apiService.put<User>('/auth/update-profile', data),

  updateAddress: (address: Address) =>
    apiService.put<Address>('/auth/update-address', address),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiService.put('/auth/change-password', data),

  forgotPassword: (email: string) =>
    apiService.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiService.post(`/auth/reset-password/${token}`, { password }),

  refreshToken: (refreshToken: string) =>
    api.post<ApiResponse<{ token: string; refreshToken: string }>>('/auth/refresh-token', {
      refreshToken,
    }),
};

// User API
export const userApi = {
  getDashboard: () => apiService.get<UserDashboard>('/users/dashboard'),
  getBookings: (params?: { page?: number; limit?: number; status?: string }) =>
    apiService.get<{ data: Booking[]; pagination: Pagination }>('/users/bookings', { params }),
  getReviews: (params?: { page?: number; limit?: number }) =>
    apiService.get<{ data: Review[]; pagination: Pagination }>('/users/reviews', { params }),
};

// Artisan API
export const artisanApi = {
  getAll: (params?: ArtisanFilters & { page?: number; limit?: number }) =>
    apiService.get<{ data: Artisan[]; pagination: Pagination }>('/artisans', { params }),

  getById: (id: string) => apiService.get<Artisan>(`/artisans/${id}`),

  create: (data: Partial<Artisan>) => apiService.post<Artisan>('/artisans', data),

  update: (id: string, data: Partial<Artisan>) =>
    apiService.put<Artisan>(`/artisans/${id}`, data),

  getDashboard: () => apiService.get<ArtisanDashboard>('/artisans/dashboard/me'),

  getBookings: (params?: { page?: number; limit?: number; status?: string }) =>
    apiService.get<{ data: Booking[]; pagination: Pagination }>('/artisans/bookings/me', {
      params,
    }),

  uploadProfileImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post<ApiResponse<{ profileImage: string }>>(
      `/artisans/${id}/profile-image`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
  },

  uploadWorkImages: (id: string, files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('images', file));
    return api.post<ApiResponse<WorkImage[]>>(`/artisans/${id}/work-images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Booking API
export const bookingApi = {
  getAll: (params?: BookingFilters & { page?: number; limit?: number }) =>
    apiService.get<{ data: Booking[]; pagination: Pagination }>('/bookings/my-bookings', {
      params,
    }),

  getById: (id: string) => apiService.get<Booking>(`/bookings/${id}`),

  create: (data: Partial<Booking>) => apiService.post<Booking>('/bookings', data),

  updateStatus: (id: string, status: string, note?: string) =>
    apiService.put<Booking>(`/bookings/${id}/status`, { status, note }),

  cancel: (id: string, reason: string) =>
    apiService.put<Booking>(`/bookings/${id}/cancel`, { reason }),

  complete: (id: string, data: Partial<CompletionDetails>) =>
    apiService.put<Booking>(`/bookings/${id}/complete`, data),
};

// Payment API
export const paymentApi = {
  initialize: (bookingId: string) =>
    apiService.post<{ authorization_url: string; reference: string }>(
      '/payments/initialize',
      { bookingId }
    ),

  initializeArtisanRegistration: () =>
    apiService.post<{ authorization_url: string; reference: string }>(
      '/payments/artisan-registration'
    ),

  verify: (reference: string) =>
    apiService.get<{ payment: Payment }>('/payments/verify', { params: { reference } }),

  getMyPayments: (params?: { page?: number; limit?: number }) =>
    apiService.get<{ data: Payment[]; pagination: Pagination }>('/payments/my-payments', {
      params,
    }),

  getById: (id: string) => apiService.get<Payment>(`/payments/${id}`),
};

// Review API
export const reviewApi = {
  getAll: (params?: { page?: number; limit?: number; artisan?: string }) =>
    apiService.get<{ data: Review[]; pagination: Pagination }>('/reviews', { params }),

  getById: (id: string) => apiService.get<Review>(`/reviews/${id}`),

  getArtisanReviews: (artisanId: string, params?: { page?: number; limit?: number }) =>
    apiService.get<{ data: Review[]; stats: any; pagination: Pagination }>(
      `/reviews/artisan/${artisanId}`,
      { params }
    ),

  create: (data: Partial<Review>) => apiService.post<Review>('/reviews', data),

  update: (id: string, data: Partial<Review>) =>
    apiService.put<Review>(`/reviews/${id}`, data),

  delete: (id: string) => apiService.delete(`/reviews/${id}`),

  addResponse: (id: string, text: string) =>
    apiService.post(`/reviews/${id}/response`, { text }),

  markHelpful: (id: string) => apiService.post(`/reviews/${id}/helpful`),

  getMyReviews: (params?: { page?: number; limit?: number }) =>
    apiService.get<{ data: Review[]; pagination: Pagination }>('/reviews/my-reviews', { params }),
};

// Message API
export const messageApi = {
  getConversations: (params?: { page?: number; limit?: number }) =>
    apiService.get<{ data: Conversation[]; pagination: Pagination }>('/messages/conversations', {
      params,
    }),

  getConversation: (id: string) => apiService.get<Conversation>(`/messages/conversations/${id}`),

  createConversation: (data: { bookingId?: string; participantId?: string }) =>
    apiService.post<Conversation>('/messages/conversations', data),

  getMessages: (conversationId: string, params?: { page?: number; limit?: number }) =>
    apiService.get<{ data: Message[]; pagination: Pagination }>(
      `/messages/conversations/${conversationId}/messages`,
      { params }
    ),

  sendMessage: (conversationId: string, content: string, messageType = 'text') =>
    apiService.post<Message>(`/messages/conversations/${conversationId}/messages`, {
      content,
      messageType,
    }),

  markAsRead: (conversationId: string) =>
    apiService.put(`/messages/conversations/${conversationId}/read`),

  getUnreadCount: () =>
    apiService.get<{ totalUnread: number; conversations: { conversationId: string; unreadCount: number }[] }>(
      '/messages/unread-count'
    ),
};

// Category API
export const categoryApi = {
  getAll: (params?: { page?: number; limit?: number; parentOnly?: boolean }) =>
    apiService.get<{ data: ServiceCategory[]; pagination: Pagination }>('/categories', { params }),

  getById: (id: string) => apiService.get<ServiceCategory>(`/categories/${id}`),

  getBySlug: (slug: string) => apiService.get<ServiceCategory>(`/categories/slug/${slug}`),

  getStats: () => apiService.get('/categories/stats/overview'),
};

// Admin API
export const adminApi = {
  getDashboard: () => apiService.get<AdminDashboard>('/admin/dashboard'),

  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    apiService.get<{ data: User[]; pagination: Pagination }>('/admin/users', { params }),

  createUser: (data: Partial<User>) => apiService.post<User>('/admin/users', data),

  updateUser: (id: string, data: Partial<User>) =>
    apiService.put<User>(`/admin/users/${id}`, data),

  deleteUser: (id: string) => apiService.delete(`/admin/users/${id}`),

  getArtisans: (params?: { page?: number; limit?: number; approvalStatus?: string }) =>
    apiService.get<{ data: Artisan[]; pagination: Pagination }>('/admin/artisans', { params }),

  createArtisan: (data: Partial<Artisan>) => apiService.post<Artisan>('/admin/artisans', data),

  approveArtisan: (id: string) => apiService.put(`/artisans/${id}/approve`),

  rejectArtisan: (id: string, reason: string) =>
    apiService.put(`/artisans/${id}/reject`, { reason }),

  suspendArtisan: (id: string, reason: string) =>
    apiService.put(`/artisans/${id}/suspend`, { reason }),

  getBookings: (params?: BookingFilters & { page?: number; limit?: number }) =>
    apiService.get<{ data: Booking[]; pagination: Pagination }>('/admin/bookings', { params }),

  getPayments: (params?: { page?: number; limit?: number; status?: string }) =>
    apiService.get<{ data: Payment[]; pagination: Pagination }>('/admin/payments', { params }),

  getReviews: (params?: { page?: number; limit?: number; isVisible?: boolean }) =>
    apiService.get<{ data: Review[]; pagination: Pagination }>('/admin/reviews', { params }),

  getAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    apiService.get('/admin/analytics', { params }),
};

export default api;


