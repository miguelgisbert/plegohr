import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'employee' | 'any';
}

export function ProtectedRoute({ children, requiredRole = 'any' }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If a specific role is required and user doesn't have it
  if (requiredRole !== 'any' && role !== requiredRole) {
    // Redirect to appropriate dashboard based on user's actual role
    if (role === 'admin') {
      return <Navigate to="/dashboard" />;
    } else if (role === 'employee') {
      return <Navigate to="/employee-dashboard" />;
    }
    // If role is null, redirect to login
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
