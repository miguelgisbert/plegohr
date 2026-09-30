import { useTranslation } from 'react-i18next';
import { TopNav } from '../components/common/TopNav';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Clock, Users, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,  } from 'recharts';
import type { PDFLabels } from '../components/reports/TimeReportPDF';
import { Toast } from '../components/common/Toast';
import { Link } from 'react-router-dom';
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

type Period = 'day' | 'week' | 'month';

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7)); // Monday
const rangeFor = (period: Period, anchor: string): { start: string; end: string } => {
  const d = parseKey(anchor);
  if (period === 'day') return { start: toKey(d), end: toKey(d) };
  if (period === 'week') {
    const from = startOfWeek(d);
    return { start: toKey(from), end: toKey(addDays(from, 6)) };
  }
  return {
    start: toKey(new Date(d.getFullYear(), d.getMonth(), 1)),
    end: toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
};

export function AdminTimeTrackingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState<Set<string>>(new Set());
  const [period, setPeriod] = useState<Period>('day');
  const [anchorDate, setAnchorDate] = useState(toKey(new Date()));
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const { start: dateFrom, end: dateTo } = rangeFor(period, anchorDate);

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

    const { data: companyData } = await supabase
      .from('companies')
      .select('name')
      .eq('id', userRecord.company_id)
      .maybeSingle();
    setCompanyName(companyData?.name || '');

    let query = supabase
      .from('time_entries')
      .select(`
        *,
        employee:employees(id, full_name, email, position)
      `)
      .eq('company_id', userRecord.company_id)
      .gte('date', dateFrom)
      .lte('date', dateTo)
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
  }, [dateFrom, dateTo, selectedEmployee, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const handleDownloadPdf = async () => {
    if (pdfGenerating) return;

    const targets = employees.filter((emp) =>
      todayEntries.some((entry) => entry.employee_id === emp.id),
    );

    if (targets.length === 0) {
      setToast({ message: t('timeTracking.pdf.empty'), type: 'info' });
      return;
    }

    const labels: PDFLabels = {
      reportTitle: t('timeTracking.pdf.reportTitle'),
      date: t('timeTracking.filters.date'),
      clockIn: t('timeTracking.table.clockIn'),
      clockOut: t('timeTracking.table.clockOut'),
      breakStart: t('timeTracking.table.breakStart'),
      breakEnd: t('timeTracking.table.breakEnd'),
      totalWork: t('timeTracking.table.totalWork'),
      totalBreak: t('timeTracking.table.totalBreak'),
      employee: t('timeTracking.table.employee'),
      period: t('timeTracking.pdf.period'),
      generatedBy: t('timeTracking.pdf.generatedBy'),
      total: t('timeTracking.pdf.total'),
    };

    setPdfGenerating(true);
    try {
      // Load the PDF engine on demand: it is by far the heaviest dependency.
      const { downloadTimeReportPDF } = await import('../utils/pdfGenerator');
      for (const employee of targets) {
        const entries = todayEntries.filter((entry) => entry.employee_id === employee.id);
        await downloadTimeReportPDF(
          employee.full_name,
          companyName || 'PlegoHR',
          entries,
          dateFrom,
          dateTo,
          labels,
        );
      }
      setToast({ message: t('timeTracking.pdf.success'), type: 'success' });
    } catch (err) {
      console.error('PDF export failed:', err);
      setToast({ message: t('timeTracking.pdf.failed'), type: 'error' });
    } finally {
      setPdfGenerating(false);
    }
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

  const chartData = Array.from(
    todayEntries.reduce((acc, entry) => {
      const name = entry.employee?.full_name || '—';
      acc.set(name, (acc.get(name) || 0) + (entry.total_seconds || 0));
      return acc;
    }, new Map<string, number>()),
  )
    .map(([name, seconds]) => ({
      name,
      hours: Math.round((seconds / 3600) * 100) / 100,
    }))
    .sort((a, b) => b.hours - a.hours);

  const shiftAnchor = (direction: 1 | -1) => {
    const d = parseKey(anchorDate);
    if (period === 'day') setAnchorDate(toKey(addDays(d, direction)));
    else if (period === 'week') setAnchorDate(toKey(addDays(d, 7 * direction)));
    else setAnchorDate(toKey(new Date(d.getFullYear(), d.getMonth() + direction, 1)));
  };

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
      <TopNav role="admin" active="time-tracking" />

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

        {chartData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {t('timeTracking.chart.title')}
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`${value} h`, t('timeTracking.chart.hours')]}
                    contentStyle={{ borderRadius: 8 }}
                  />
                  <Bar dataKey="hours" fill="#0d9488" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                  {(['day', 'week', 'month'] as Period[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPeriod(value)}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        period === value
                          ? 'bg-teal-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t(`timeTracking.period.${value}`)}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => shiftAnchor(-1)}
                    aria-label={t('timeTracking.previousPeriod')}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <input
                    type="date"
                    value={anchorDate}
                    onChange={(e) => e.target.value && setAnchorDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => shiftAnchor(1)}
                    aria-label={t('timeTracking.nextPeriod')}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

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
                onClick={handleDownloadPdf}
                disabled={pdfGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pdfGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                {pdfGenerating ? t('timeTracking.pdf.preparing') : t('timeTracking.downloadPdf')}
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
                    {period !== 'day' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('timeTracking.filters.date')}
                      </th>
                    )}
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
                      {period !== 'day' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {entry.date}
                        </td>
                      )}
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

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
