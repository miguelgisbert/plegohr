import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeeDashboardPage } from './pages/EmployeeDashboardPage';
import { AcceptInvitationPage } from './pages/AcceptInvitationPage';
import { CompanyDocumentsPage } from './pages/CompanyDocumentsPage';
import { EmployeeDocumentsPage } from './pages/EmployeeDocumentsPage';
import { CompanyLeavePage } from './pages/CompanyLeavePage';
import { EmployeeLeavePage } from './pages/EmployeeLeavePage';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/employee-dashboard" element={<EmployeeDashboardPage />} />
            <Route path="/documents" element={<CompanyDocumentsPage />} />
            <Route path="/employee-documents" element={<EmployeeDocumentsPage />} />
            <Route path="/leave" element={<CompanyLeavePage />} />
            <Route path="/employee-leave" element={<EmployeeLeavePage />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
