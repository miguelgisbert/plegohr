import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeeDashboardPage } from './pages/EmployeeDashboardPage';
import { AcceptInvitationPage } from './pages/AcceptInvitationPage';
import { CompanyDocumentsPage } from './pages/CompanyDocumentsPage';
import { EmployeeDocumentsPage } from './pages/EmployeeDocumentsPage';
import { CompanyLeavePage } from './pages/CompanyLeavePage';
import { EmployeeLeavePage } from './pages/EmployeeLeavePage';
import { AdminTimeTrackingPage } from './pages/AdminTimeTrackingPage';
import { AdminCorrectionsPage } from './pages/AdminCorrectionsPage';
import { PreviewCompanyDashboardPage } from './pages/PreviewCompanyDashboardPage';
import { PreviewEmployeeDashboardPage } from './pages/PreviewEmployeeDashboardPage';
import { PreviewCompanyDocumentsPage } from './pages/PreviewCompanyDocumentsPage';
import { PreviewEmployeeDocumentsPage } from './pages/PreviewEmployeeDocumentsPage';
import { PreviewCompanyLeavePage } from './pages/PreviewCompanyLeavePage';
import { PreviewEmployeeLeavePage } from './pages/PreviewEmployeeLeavePage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
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
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
