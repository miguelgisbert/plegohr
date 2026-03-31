import { Clock, FileText, BarChart3, Users, Plus, Pencil, Trash2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlarmClockIcon } from '../components/common/AlarmClockIcon';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { DemoBanner } from '../components/common/DemoBanner';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  position: string;
  department: string;
  status: string;
}

const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', full_name: 'Maria García', email: 'maria.garcia@acme.com', position: 'Software Developer', department: 'Engineering', status: 'active' },
  { id: '2', full_name: 'Joan Puig', email: 'joan.puig@acme.com', position: 'Product Manager', department: 'Product', status: 'active' },
  { id: '3', full_name: 'Laura Martínez', email: 'laura.martinez@acme.com', position: 'UX Designer', department: 'Design', status: 'active' },
  { id: '4', full_name: 'Carlos López', email: 'carlos.lopez@acme.com', position: 'Marketing Specialist', department: 'Marketing', status: 'active' },
  { id: '5', full_name: 'Ana Fernández', email: 'ana.fernandez@acme.com', position: 'HR Manager', department: 'HR', status: 'active' },
];

export function PreviewCompanyDashboardPage() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [inviteData, setInviteData] = useState({ email: '', fullName: '', position: '', department: '' });
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const showDemoToast = (msg: string) => {
    setDemoMessage(msg);
    setTimeout(() => setDemoMessage(null), 2500);
  };

  const handleInviteEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const newEmployee: Employee = {
      id: String(Date.now()),
      full_name: inviteData.fullName,
      email: inviteData.email,
      position: inviteData.position,
      department: inviteData.department || 'General',
      status: 'active',
    };
    setEmployees([newEmployee, ...employees]);
    setShowInviteModal(false);
    setInviteData({ email: '', fullName: '', position: '', department: '' });
    showDemoToast(t('demo.employeeAdded'));
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setInviteData({ email: employee.email, fullName: employee.full_name, position: employee.position, department: employee.department });
    setShowEditModal(true);
  };

  const handleUpdateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setEmployees(employees.map(emp =>
      emp.id === editingEmployee.id
        ? { ...emp, full_name: inviteData.fullName, email: inviteData.email, position: inviteData.position, department: inviteData.department }
        : emp
    ));
    setShowEditModal(false);
    setEditingEmployee(null);
    setInviteData({ email: '', fullName: '', position: '', department: '' });
    showDemoToast(t('demo.employeeUpdated'));
  };

  const handleDeleteEmployee = (employeeId: string) => {
    if (!confirm(t('employees.confirmDelete'))) return;
    setEmployees(employees.filter(emp => emp.id !== employeeId));
    showDemoToast(t('demo.employeeDeleted'));
  };

  const stats = [
    { icon: Clock, label: t('dashboard.stats.hoursToday'), value: '6h 23m', color: 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400' },
    { icon: BarChart3, label: t('dashboard.stats.hoursWeek'), value: '31h 15m', color: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' },
    { icon: FileText, label: t('dashboard.stats.pendingDocuments'), value: '3', color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' },
    { icon: Users, label: t('dashboard.stats.teamMembers'), value: String(employees.length), color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  ];

  const formFields = [
    { label: t('employees.form.fullName'), field: 'fullName', type: 'text', required: true },
    { label: t('employees.form.email'), field: 'email', type: 'email', required: true },
    { label: t('employees.form.position'), field: 'position', type: 'text', required: true },
    { label: t('employees.form.department'), field: 'department', type: 'text', required: false },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DemoBanner />

      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <AlarmClockIcon className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">PlegoHR</span>
              </Link>
              <div className="hidden md:flex items-center gap-2">
                <Link to="/preview/company-dashboard" className="px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400">{t('nav.dashboard')}</Link>
                <Link to="/preview/company-documents" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">{t('nav.documents')}</Link>
                <Link to="/preview/company-leave" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">{t('nav.leave')}</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <Link to="/signup" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold">
                {t('common.signup')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('dashboard.welcome', { name: 'Demo Admin' })}</h1>
          <p className="text-gray-600 dark:text-gray-400">Acme Technologies SL</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('employees.title')}</h2>
              <p className="text-gray-600 dark:text-gray-400">{t('employees.subtitle')}</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('employees.add')}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {[t('employees.columns.name'), t('employees.columns.email'), t('employees.columns.position'), t('employees.columns.department'), t('employees.columns.status'), t('employees.columns.actions')].map((h, i) => (
                    <th key={i} className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{employee.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{employee.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{employee.position}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{employee.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        {t('common.status.active')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => showDemoToast(t('demo.invitationResent'))} className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors" title={t('employees.resendInvitation')}>
                          <Send className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEditEmployee(employee)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title={t('common.edit')}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteEmployee(employee.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={t('common.delete')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {demoMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-50 text-sm font-medium">
          {demoMessage}
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('employees.add')}</h3>
            <form onSubmit={handleInviteEmployee} className="space-y-4">
              {formFields.map(({ label, field, type, required }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                  <input
                    type={type}
                    value={inviteData[field]}
                    onChange={(e) => setInviteData({ ...inviteData, [field]: e.target.value })}
                    required={required}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">{t('common.cancel')}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">{t('common.add')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('employees.editTitle')}</h3>
            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              {formFields.map(({ label, field, type, required }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                  <input
                    type={type}
                    value={inviteData[field]}
                    onChange={(e) => setInviteData({ ...inviteData, [field]: e.target.value })}
                    required={required}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingEmployee(null); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">{t('common.cancel')}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">{t('common.update')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
