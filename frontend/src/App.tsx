import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { authApi } from '@/services/api';

// Layouts
import MainLayout from '@/layouts/MainLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import AdminLayout from '@/layouts/AdminLayout';

// Pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Artisans from '@/pages/Artisans';
import ArtisanDetail from '@/pages/ArtisanDetail';
import BookingCreate from '@/pages/BookingCreate';
import BookingDetail from '@/pages/BookingDetail';
import Conversations from '@/pages/Conversations';
import ConversationDetail from '@/pages/ConversationDetail';
import PaymentSuccess from '@/pages/PaymentSuccess';

// Dashboard Pages
import UserDashboard from '@/pages/dashboard/UserDashboard';
import UserBookings from '@/pages/dashboard/UserBookings';
import UserReviews from '@/pages/dashboard/UserReviews';
import UserProfile from '@/pages/dashboard/UserProfile';

// Artisan Dashboard Pages
import ArtisanDashboard from '@/pages/artisan/ArtisanDashboard';
import ArtisanBookings from '@/pages/artisan/ArtisanBookings';
import ArtisanProfile from '@/pages/artisan/ArtisanProfile';
import ArtisanEarnings from '@/pages/artisan/ArtisanEarnings';

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminArtisans from '@/pages/admin/AdminArtisans';
import AdminBookings from '@/pages/admin/AdminBookings';
import AdminPayments from '@/pages/admin/AdminPayments';
import AdminReviews from '@/pages/admin/AdminReviews';
import AdminCategories from '@/pages/admin/AdminCategories';

// Components
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleRoute from '@/components/RoleRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  const { token, isAuthenticated, login, logout, setUser } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await authApi.getMe();
          if (response.success) {
            setUser(response.data.user);
            // Connect socket
            connect(token);
          } else {
            logout();
          }
        } catch (error) {
          logout();
        }
      }
    };

    initAuth();

    return () => {
      disconnect();
    };
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="artisans" element={<Artisans />} />
            <Route path="artisans/:id" element={<ArtisanDetail />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Booking Routes */}
            <Route path="/bookings/create" element={<BookingCreate />} />
            <Route path="/bookings/:id" element={<BookingDetail />} />

            {/* Chat Routes */}
            <Route path="/messages" element={<Conversations />} />
            <Route path="/messages/:id" element={<ConversationDetail />} />

            {/* User Dashboard */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<UserDashboard />} />
              <Route path="bookings" element={<UserBookings />} />
              <Route path="reviews" element={<UserReviews />} />
              <Route path="profile" element={<UserProfile />} />
            </Route>

            {/* Artisan Routes */}
            <Route element={<RoleRoute allowedRoles={['artisan']} />}>
              <Route path="/artisan/dashboard" element={<DashboardLayout />}>
                <Route index element={<ArtisanDashboard />} />
                <Route path="bookings" element={<ArtisanBookings />} />
                <Route path="profile" element={<ArtisanProfile />} />
                <Route path="earnings" element={<ArtisanEarnings />} />
              </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<RoleRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="artisans" element={<AdminArtisans />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="categories" element={<AdminCategories />} />
              </Route>
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
