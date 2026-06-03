import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Loader2, Clock, Users, FileText } from 'lucide-react';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { AlarmClockIcon } from '../components/common/AlarmClockIcon';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  position: string;
}

interface TimeEntry {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_seconds: number;
  break_seconds: number;
  status: string;
  employee?: Employee;
}

export function AdminTimeTrackingPage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: userRecord } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user?.id)
      .maybeSingle();

    if (!userRecord?.company_id) {
      setLoading(false);
      return;
    }

    const { data: employeesData } = await supabase
      .from('employees')
      .select('id, full_name, email, position')
      .eq('company_id', userRecord.company_id)
      .order('full_name');

    if (employeesData) {
      setEmployees(employeesData);
    }

    let query = supabase
      .from('time_entries')
      .select(`
        *,
        employee:employees(id, full_name, email, position)
      `)
      .eq('company_id', userRecord.company_id)
      .eq('date', selectedDate)
      .order('clock_in', { ascending: true });

    if (selectedEmployee) {
      query = query.eq('employee_id', selectedEmployee);
    }

    const { data: entriesData } = await query;

    if (entriesData) {
      setTimeEntries(entriesData as unknown as TimeEntry[]);
    }

    const { data: correctionsData } = await supabase
      .from('time_corrections')
      .select('time_entry_id')
      .eq('company_id', userRecord.company_id)
      .eq('status', 'pending');

    if (correctionsData) {
      setPendingCorrections(new Set(correctionsData.map((c: { time_entry_id: string }) => c.time_entry_id)));
    }

    setLoading(false);
  }, [selectedDate, selectedEmployee, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatSeconds = (seconds: number) => {
    if (!seconds) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const todayEntries = timeEntries;
  const employeesToday = new Set(todayEntries.map((e) => e.employee_id)).size;
  const clockedIn = todayEntries.filter((e) => e.status === 'active' && !e.clock_out).length;
  const totalSecondsToday = todayEntries.reduce((sum, e) => sum + (e.total_seconds || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400';
      case 'completed':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400';
      case 'corrected':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400';
    }
  };

  const statsCards = [
    {
      icon: Users,
      label: t('timeTracking.stats.totalEmployees'),
      value: employeesToday.toString(),
      color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    },
    {
      icon: Clock,
      label: t('timeTracking.stats.clockedIn'),
      value: clockedIn.toString(),
      color: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    },
    {
      icon: FileText,
      label: t('timeTracking.stats.totalHours'),
      value: formatSeconds(totalSecondsToday),
      color: 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
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
                <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  {t('nav.dashboard')}
                </button>
                <button onClick={() => navigate('/documents')} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  {t('nav.documents')}
                </button>
                <button onClick={() => navigate('/leave')} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  {t('nav.leave')}
                </button>
                <button onClick={() => navigate('/time-tracking')} className="px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400">
                  {t('nav.timeTracking')}
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
            {t('timeTracking.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('timeTracking.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {statsCards.map((stat, index) => (
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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                />
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t('timeTracking.filters.allEmployees')}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {}}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <FileText className="w-5 h-5" />
                {t('timeTracking.downloadPdf')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
          ) : todayEntries.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('timeTracking.empty')}
              </h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('timeTracking.table.employee')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('timeTracking.table.clockIn')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('timeTracking.table.clockOut')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('timeTracking.table.breakStart')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('timeTracking.table.breakEnd')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('timeTracking.table.totalWork')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('timeTracking.table.totalBreak')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('timeTracking.table.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {todayEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.employee?.full_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {entry.employee?.position}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(entry.clock_in)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(entry.clock_out)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(entry.break_start)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(entry.break_end)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatSeconds(entry.total_seconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatSeconds(entry.break_seconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(entry.status)}`}>
                            {t(`timeTracking.status.${entry.status}`, { defaultValue: entry.status })}
                          </span>
                          {pendingCorrections.has(entry.id) && (
                            <Link
                              to="/time-corrections"
                              className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 hover:underline"
                            >
                              {t('timeTracking.correctionPending')}
                            </Link>
                          )}
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
    </div>
  );
}
