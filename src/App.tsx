import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AcceptInvitationPage } from './pages/AcceptInvitationPage';
import NotFoundPage from './pages/NotFoundPage';

// Heavy pages (charts, PDF engine, document viewers) load on demand so the
// first paint stays small and the PWA precache stays under control.
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const EmployeeDashboardPage = lazy(() => import('./pages/EmployeeDashboardPage').then((m) => ({ default: m.EmployeeDashboardPage })));
const CompanyDocumentsPage = lazy(() => import('./pages/CompanyDocumentsPage').then((m) => ({ default: m.CompanyDocumentsPage })));
const EmployeeDocumentsPage = lazy(() => import('./pages/EmployeeDocumentsPage').then((m) => ({ default: m.EmployeeDocumentsPage })));
const CompanyLeavePage = lazy(() => import('./pages/CompanyLeavePage').then((m) => ({ default: m.CompanyLeavePage })));
const EmployeeLeavePage = lazy(() => import('./pages/EmployeeLeavePage').then((m) => ({ default: m.EmployeeLeavePage })));
const AdminTimeTrackingPage = lazy(() => import('./pages/AdminTimeTrackingPage').then((m) => ({ default: m.AdminTimeTrackingPage })));
const AdminCorrectionsPage = lazy(() => import('./pages/AdminCorrectionsPage').then((m) => ({ default: m.AdminCorrectionsPage })));
const PreviewCompanyDashboardPage = lazy(() => import('./pages/PreviewCompanyDashboardPage').then((m) => ({ default: m.PreviewCompanyDashboardPage })));
const PreviewEmployeeDashboardPage = lazy(() => import('./pages/PreviewEmployeeDashboardPage').then((m) => ({ default: m.PreviewEmployeeDashboardPage })));
const PreviewCompanyDocumentsPage = lazy(() => import('./pages/PreviewCompanyDocumentsPage').then((m) => ({ default: m.PreviewCompanyDocumentsPage })));
const PreviewEmployeeDocumentsPage = lazy(() => import('./pages/PreviewEmployeeDocumentsPage').then((m) => ({ default: m.PreviewEmployeeDocumentsPage })));
const PreviewCompanyLeavePage = lazy(() => import('./pages/PreviewCompanyLeavePage').then((m) => ({ default: m.PreviewCompanyLeavePage })));
const PreviewEmployeeLeavePage = lazy(() => import('./pages/PreviewEmployeeLeavePage').then((m) => ({ default: m.PreviewEmployeeLeavePage })));

function PageFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

            {/* Preview / demo routes (no auth required) */}
            <Route path="/preview/company-dashboard" element={<PreviewCompanyDashboardPage />} />
            <Route path="/preview/employee-dashboard" element={<PreviewEmployeeDashboardPage />} />
            <Route path="/preview/company-documents" element={<PreviewCompanyDocumentsPage />} />
            <Route path="/preview/employee-documents" element={<PreviewEmployeeDocumentsPage />} />
            <Route path="/preview/company-leave" element={<PreviewCompanyLeavePage />} />
            <Route path="/preview/employee-leave" element={<PreviewEmployeeLeavePage />} />

            {/* Protected routes (auth required) */}
            <Route path="/dashboard" element={<ProtectedRoute requiredRole="admin"><DashboardPage /></ProtectedRoute>} />
            <Route path="/employee-dashboard" element={<ProtectedRoute requiredRole="employee"><EmployeeDashboardPage /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute requiredRole="admin"><CompanyDocumentsPage /></ProtectedRoute>} />
            <Route path="/employee-documents" element={<ProtectedRoute requiredRole="employee"><EmployeeDocumentsPage /></ProtectedRoute>} />
            <Route path="/leave" element={<ProtectedRoute requiredRole="admin"><CompanyLeavePage /></ProtectedRoute>} />
            <Route path="/employee-leave" element={<ProtectedRoute requiredRole="employee"><EmployeeLeavePage /></ProtectedRoute>} />
            <Route path="/time-tracking" element={<ProtectedRoute requiredRole="admin"><AdminTimeTrackingPage /></ProtectedRoute>} />
            <Route path="/time-corrections" element={<ProtectedRoute requiredRole="admin"><AdminCorrectionsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
