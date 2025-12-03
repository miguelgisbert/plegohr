import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Clock, FileText, BarChart3, Users, LogOut, Mail, Plus, Pencil, Trash2, Send } from 'lucide-react';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { AlarmClockIcon } from '../components/common/AlarmClockIcon';
import { Toast } from '../components/common/Toast';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

interface Company {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
  position: string;
  department: string | null;
  status: string;
}

interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [inviteData, setInviteData] = useState({
    email: '',
    fullName: '',
    position: '',
    department: '',
  });
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (user) {
      loadCompanyData();
    }
  }, [user]);

  const loadCompanyData = async () => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        return;
      }

      if (!profile?.company_id) {
        console.log('No company_id found in profile');
        return;
      }

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', profile.company_id)
        .maybeSingle();

      if (companyError) {
        console.error('Error loading company:', companyError);
        return;
      }

      console.log('Company loaded:', companyData);
      setCompany(companyData);

      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (employeesError) {
        console.error('Error loading employees:', employeesError);
      } else {
        setEmployees(employeesData || []);
      }
    } catch (err) {
      console.error('Unexpected error loading company data:', err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const handleInviteEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company) {
      showToast('Company not found. Please refresh the page.', 'error');
      return;
    }

    try {
      const { data: employeeData, error: employeeError } = await supabase.from('employees').insert({
        company_id: company.id,
        full_name: inviteData.fullName,
        email: inviteData.email,
        position: inviteData.position,
        department: inviteData.department || null,
        status: 'active',
      }).select().single();

      if (employeeError) {
        console.error('Error creating employee:', employeeError);
        showToast(`Failed to create employee: ${employeeError.message}`, 'error');
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        showToast('Authentication error. Please sign in again.', 'error');
        return;
      }

      const invitationUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-employee-invitation`;

      const response = await fetch(invitationUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employeeData.id,
          email: inviteData.email,
          companyName: company.name,
          appUrl: import.meta.env.VITE_APP_URL || window.location.origin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error sending invitation:', errorData);
        showToast('Employee created but invitation email failed to send.', 'error');
      } else {
        showToast('Employee added and invitation sent successfully!', 'success');
      }

      setShowInviteModal(false);
      setInviteData({ email: '', fullName: '', position: '', department: '' });
      await loadCompanyData();
    } catch (err) {
      console.error('Unexpected error:', err);
      showToast('An unexpected error occurred. Please try again.', 'error');
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setInviteData({
      email: employee.email,
      fullName: employee.full_name,
      position: employee.position,
      department: employee.department || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingEmployee) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          full_name: inviteData.fullName,
          email: inviteData.email,
          position: inviteData.position,
          department: inviteData.department || null,
        })
        .eq('id', editingEmployee.id);

      if (error) {
        showToast(`Failed to update employee: ${error.message}`, 'error');
        return;
      }

      showToast('Employee updated successfully!', 'success');
      setShowEditModal(false);
      setEditingEmployee(null);
      setInviteData({ email: '', fullName: '', position: '', department: '' });
      await loadCompanyData();
    } catch (err) {
      console.error('Unexpected error:', err);
      showToast('An unexpected error occurred. Please try again.', 'error');
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) {
        showToast(`Failed to delete employee: ${error.message}`, 'error');
        return;
      }

      showToast('Employee deleted successfully!', 'success');
      await loadCompanyData();
    } catch (err) {
      console.error('Unexpected error:', err);
      showToast('An unexpected error occurred. Please try again.', 'error');
    }
  };

  const handleResendInvitation = async (employee: Employee) => {
    if (!company) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        showToast('Authentication error. Please sign in again.', 'error');
        return;
      }

      const invitationUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-employee-invitation`;

      const response = await fetch(invitationUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employee.id,
          email: employee.email,
          companyName: company.name,
          appUrl: import.meta.env.VITE_APP_URL || window.location.origin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error sending invitation:', errorData);
        showToast('Failed to send invitation email.', 'error');
      } else {
        showToast('Invitation sent successfully!', 'success');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      showToast('An unexpected error occurred. Please try again.', 'error');
    }
  };

  const stats = [
    {
      icon: Clock,
      label: t('dashboard.stats.hoursToday'),
      value: '0h 0m',
      color: 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
    },
    {
      icon: BarChart3,
      label: t('dashboard.stats.hoursWeek'),
      value: '0h 0m',
      color: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    },
    {
      icon: FileText,
      label: t('dashboard.stats.pendingDocuments'),
      value: '0',
      color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    },
    {
      icon: Users,
      label: t('dashboard.stats.teamMembers'),
      value: employees.length.toString(),
      color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <AlarmClockIcon className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">PlegoHR</span>
              </Link>
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/documents')}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  Documents
                </button>
                <button
                  onClick={() => navigate('/leave')}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  Leave
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline">{t('common.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('dashboard.welcome', { name: user?.user_metadata?.full_name || 'User' })}
          </h1>
          {company && (
            <p className="text-gray-600 dark:text-gray-400">{company.name}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h2>
              <p className="text-gray-600 dark:text-gray-400">Manage your team members</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Employee
            </button>
          </div>

          {employees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No employees yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start building your team by adding employees
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {employee.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {employee.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {employee.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {employee.department || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          employee.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}>
                          {employee.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResendInvitation(employee)}
                            className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                            title="Resend invitation"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditEmployee(employee)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit employee"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Add Employee
            </h3>
            <form onSubmit={handleInviteEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={inviteData.fullName}
                  onChange={(e) => setInviteData({ ...inviteData, fullName: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={inviteData.position}
                  onChange={(e) => setInviteData({ ...inviteData, position: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={inviteData.department}
                  onChange={(e) => setInviteData({ ...inviteData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Edit Employee
            </h3>
            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={inviteData.fullName}
                  onChange={(e) => setInviteData({ ...inviteData, fullName: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={inviteData.position}
                  onChange={(e) => setInviteData({ ...inviteData, position: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={inviteData.department}
                  onChange={(e) => setInviteData({ ...inviteData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEmployee(null);
                    setInviteData({ email: '', fullName: '', position: '', department: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Update Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
