import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Outlet } from 'react-router-dom';

interface RoleRouteProps {
  allowedRoles: string[];
  children?: React.ReactNode;
}

export default function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user?.role === 'artisan') {
      return <Navigate to="/artisan/dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children || <Outlet />;
}
