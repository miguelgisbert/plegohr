import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Clock, Play, Square, Coffee } from 'lucide-react';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { AlarmClockIcon } from '../components/common/AlarmClockIcon';
import { Toast } from '../components/common/Toast';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

interface TimeEntry {
  id: string;
  employee_id: string;
  company_id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_seconds: number;
  break_seconds: number;
  status: string;
}

interface EmployeeRecord {
  id: string;
  company_id: string;
}

interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

export function EmployeeDashboardPage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [timeEntry, setTimeEntry] = useState<TimeEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [currentBreakSeconds, setCurrentBreakSeconds] = useState(0);
  const [isWorkRunning, setIsWorkRunning] = useState(false);
  const [isBreakRunning, setIsBreakRunning] = useState(false);

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctingEntry, setCorrectingEntry] = useState<TimeEntry | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionClockIn, setCorrectionClockIn] = useState('');
  const [correctionClockOut, setCorrectionClockOut] = useState('');

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  }, []);

  const loadEmployee = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('employees')
      .select('id, company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setEmployee(data);
    return data;
  }, [user]);

  const loadTodayEntry = useCallback(async (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  }, []);

  const loadTodayHistory = useCallback(async (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .order('clock_in', { ascending: false });
    setTodayEntries(data || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const emp = await loadEmployee();
      if (emp) {
        const existing = await loadTodayEntry(emp.id);
        if (existing) {
          setTimeEntry(existing);
          if (existing.status === 'active') {
            setIsWorkRunning(true);
            if (existing.clock_in) {
              const elapsed = Math.floor((Date.now() - new Date(existing.clock_in).getTime()) / 1000);
              setCurrentSeconds(Math.max(0, elapsed) + (existing.total_seconds || 0));
            }
            if (existing.break_start && !existing.break_end) {
              setIsBreakRunning(true);
              const breakElapsed = Math.floor((Date.now() - new Date(existing.break_start).getTime()) / 1000);
              setCurrentBreakSeconds(Math.max(0, breakElapsed) + (existing.break_seconds || 0));
            }
          } else {
            setCurrentSeconds(existing.total_seconds || 0);
            setCurrentBreakSeconds(existing.break_seconds || 0);
          }
        }
        await loadTodayHistory(emp.id);
      }
      setLoading(false);
    };
    init();
  }, [loadEmployee, loadTodayEntry, loadTodayHistory]);

  useEffect(() => {
    let interval: number | null = null;
    if (isWorkRunning && !isBreakRunning) {
      interval = window.setInterval(() => {
        if (timeEntry?.clock_in) {
          const elapsed = Math.floor((Date.now() - new Date(timeEntry.clock_in).getTime()) / 1000);
          setCurrentSeconds(Math.max(0, elapsed));
        }
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isWorkRunning, isBreakRunning, timeEntry?.clock_in]);

  useEffect(() => {
    let interval: number | null = null;
    if (isBreakRunning && timeEntry?.break_start) {
      interval = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(timeEntry.break_start!).getTime()) / 1000);
        setCurrentBreakSeconds(Math.max(0, elapsed));
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isBreakRunning, timeEntry?.break_start]);

  useEffect(() => {
    if (!isWorkRunning && !isBreakRunning) return;
    const saveInterval = setInterval(async () => {
      if (timeEntry?.id && employee) {
        const updates: Record<string, unknown> = {};
        if (isWorkRunning) {
          const clockIn = new Date(timeEntry.clock_in).getTime();
          updates.total_seconds = Math.floor((Date.now() - clockIn) / 1000);
        }
        if (isBreakRunning && timeEntry.break_start) {
          const breakStart = new Date(timeEntry.break_start).getTime();
          updates.break_seconds = Math.floor((Date.now() - breakStart) / 1000);
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('time_entries').update(updates).eq('id', timeEntry.id);
        }
      }
    }, 30000);
    return () => clearInterval(saveInterval);
  }, [isWorkRunning, isBreakRunning, timeEntry, employee]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleStartWork = async () => {
    if (!employee) return;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        company_id: employee.company_id,
        employee_id: employee.id,
        date: today,
        clock_in: now.toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      showToast(t('employees.toast.addFailed', { error: error.message }), 'error');
      return;
    }

    setTimeEntry(data);
    setIsWorkRunning(true);
    setCurrentSeconds(0);
    showToast(t('timer.clockedIn'), 'success');
    await loadTodayHistory(employee.id);
  };

  const handleEndWork = async () => {
    if (!timeEntry || !employee) return;

    const now = new Date();
    const clockIn = new Date(timeEntry.clock_in).getTime();
    const totalSecs = Math.floor((now.getTime() - clockIn) / 1000);

    const updates: Record<string, unknown> = {
      clock_out: now.toISOString(),
      total_seconds: totalSecs,
      status: 'completed',
    };

    if (isBreakRunning && timeEntry.break_start) {
      const breakStart = new Date(timeEntry.break_start).getTime();
      updates.break_end = now.toISOString();
      updates.break_seconds = Math.floor((now.getTime() - breakStart) / 1000);
    }

    const { error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', timeEntry.id);

    if (error) {
      showToast(t('employees.toast.addFailed', { error: error.message }), 'error');
      return;
    }

    setIsWorkRunning(false);
    setIsBreakRunning(false);
    setCurrentSeconds(totalSecs);
    showToast(t('timer.clockedOut'), 'success');
    await loadTodayEntry(employee.id);
    await loadTodayHistory(employee.id);
  };

  const handleStartBreak = async () => {
    if (!timeEntry || !employee) return;

    const now = new Date();
    const clockIn = new Date(timeEntry.clock_in).getTime();
    const workElapsed = Math.floor((now.getTime() - clockIn) / 1000);

    const { error } = await supabase
      .from('time_entries')
      .update({
        break_start: now.toISOString(),
        total_seconds: workElapsed,
      })
      .eq('id', timeEntry.id);

    if (error) {
      showToast(t('employees.toast.addFailed', { error: error.message }), 'error');
      return;
    }

    setIsBreakRunning(true);
    setCurrentSeconds(workElapsed);
    setCurrentBreakSeconds(0);
    showToast(t('timer.breakStarted'), 'info');
  };

  const handleEndBreak = async () => {
    if (!timeEntry?.break_start || !employee) return;

    const now = new Date();
    const breakStart = new Date(timeEntry.break_start).getTime();
    const breakSecs = Math.floor((now.getTime() - breakStart) / 1000);

    const { error } = await supabase
      .from('time_entries')
      .update({
        break_end: now.toISOString(),
        break_seconds: breakSecs,
      })
      .eq('id', timeEntry.id);

    if (error) {
      showToast(t('employees.toast.addFailed', { error: error.message }), 'error');
      return;
    }

    setIsBreakRunning(false);
    setCurrentBreakSeconds(breakSecs);
    showToast(t('timer.breakEnded'), 'info');
  };

  const handleEndDay = async () => {
    if (!timeEntry || !employee) return;
    if (isWorkRunning) {
      await handleEndWork();
    }
  };

  const handleRequestCorrection = (entry: TimeEntry) => {
    setCorrectingEntry(entry);
    setCorrectionReason('');
    setCorrectionClockIn(new Date(entry.clock_in).toISOString().slice(0, 16));
    setCorrectionClockOut(entry.clock_out ? new Date(entry.clock_out).toISOString().slice(0, 16) : '');
    setShowCorrectionModal(true);
  };

  const handleSubmitCorrection = async () => {
    if (!correctingEntry || !correctionReason) return;
    if (!employee) return;

    const { error } = await supabase.from('time_corrections').insert({
      time_entry_id: correctingEntry.id,
      employee_id: employee.id,
      company_id: employee.company_id,
      reason: correctionReason,
      new_clock_in: correctionClockIn ? new Date(correctionClockIn).toISOString() : null,
      new_clock_out: correctionClockOut ? new Date(correctionClockOut).toISOString() : null,
    });

    if (error) {
      showToast(t('employees.toast.addFailed', { error: error.message }), 'error');
      return;
    }

    showToast(t('timer.correctionRequested'), 'success');
    setShowCorrectionModal(false);
    setCorrectingEntry(null);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDisplayTime = (dateStr: string | null): string => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString([], { hour12: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

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
                <button onClick={() => navigate('/employee-dashboard')} className="px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400">
                  {t('nav.dashboard')}
                </button>
                <button onClick={() => navigate('/employee-documents')} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  {t('nav.documents')}
                </button>
                <button onClick={() => navigate('/employee-leave')} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  {t('nav.leave')}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline">{t('common.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <Clock className="w-8 h-8 text-teal-600 dark:text-teal-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{t('timer.workTime')}</p>
            <div className={`text-5xl font-bold mb-4 font-mono transition-colors ${isWorkRunning && !isBreakRunning ? 'text-teal-600 dark:text-teal-400' : 'text-gray-900 dark:text-white'}`}>
              {formatTime(currentSeconds)}
            </div>

            {!timeEntry || (timeEntry.status === 'completed') ? (
              <button onClick={handleStartWork} className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-lg w-full max-w-xs">
                <Play className="w-5 h-5" /> {t('timer.startWork')}
              </button>
            ) : (
              <button onClick={handleEndWork} className="inline-flex items-center gap-2 px-8 py-3 border-2 border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-semibold text-lg w-full max-w-xs">
                <Square className="w-5 h-5" /> {t('timer.endWork')}
              </button>
            )}

            {timeEntry && (
              <div className="mt-3 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                <p>{t('timer.clockIn')}: {formatDisplayTime(timeEntry.clock_in)}</p>
                {timeEntry.clock_out && <p>{t('timer.clockOut')}: {formatDisplayTime(timeEntry.clock_out)}</p>}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <Coffee className="w-8 h-8 text-amber-500 dark:text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{t('timer.pauseTime')}</p>
            <div className={`text-5xl font-bold mb-4 font-mono transition-colors ${isBreakRunning ? 'text-amber-500 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
              {formatTime(currentBreakSeconds)}
            </div>

            {!isBreakRunning ? (
              <button onClick={handleStartBreak} disabled={!isWorkRunning || !timeEntry} className="inline-flex items-center gap-2 px-8 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed w-full max-w-xs">
                <Play className="w-5 h-5" /> {t('timer.startPause')}
              </button>
            ) : (
              <button onClick={handleEndBreak} className="inline-flex items-center gap-2 px-8 py-3 border-2 border-amber-500 text-amber-500 dark:border-amber-400 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors font-semibold text-lg w-full max-w-xs">
                <Square className="w-5 h-5" /> {t('timer.endPause')}
              </button>
            )}

            {timeEntry?.break_start && (
              <div className="mt-3 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                <p>{t('timer.pauseStart')}: {formatDisplayTime(timeEntry.break_start)}</p>
                {timeEntry.break_end && <p>{t('timer.pauseEnd')}: {formatDisplayTime(timeEntry.break_end)}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Day summary when work is running */}
        {timeEntry && timeEntry.status === 'active' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8 text-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('timer.summary')}</h2>
            <div className="grid grid-cols-3 gap-4 mb-6 max-w-md mx-auto">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('timer.workedTime')}</p>
                <p className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400">{formatTime(currentSeconds - currentBreakSeconds)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('timer.pausedTime')}</p>
                <p className="text-2xl font-bold font-mono text-amber-500 dark:text-amber-400">{formatTime(currentBreakSeconds)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('timer.totalTime')}</p>
                <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{formatTime(currentSeconds)}</p>
              </div>
            </div>
            <button onClick={handleEndDay} className="px-12 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-lg">
              {t('timer.endDay')}
            </button>
          </div>
        )}

        {/* Today's history */}
        {todayEntries.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('timer.todayHistory')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('timer.clockIn')}</th>
                    <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('timer.clockOut')}</th>
                    <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('timer.workTime')}</th>
                    <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('timer.pauseTime')}</th>
                    <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('common.statusColumn')}</th>
                    <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {todayEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-3 px-3 text-gray-900 dark:text-white">{formatDisplayTime(entry.clock_in)}</td>
                      <td className="py-3 px-3 text-gray-900 dark:text-white">{formatDisplayTime(entry.clock_out)}</td>
                      <td className="py-3 px-3 font-mono text-gray-900 dark:text-white">{formatTime(entry.total_seconds)}</td>
                      <td className="py-3 px-3 font-mono text-gray-900 dark:text-white">{formatTime(entry.break_seconds)}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          entry.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          entry.status === 'corrected' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {entry.status === 'completed' ? t('common.status.approved') :
                           entry.status === 'corrected' ? t('employees.statusCorrected') :
                           t('common.status.pending')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {entry.status === 'completed' && (
                          <button
                            onClick={() => handleRequestCorrection(entry)}
                            className="text-teal-600 hover:text-teal-700 dark:text-teal-400 text-xs font-medium"
                          >
                            {t('timer.requestCorrection')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!timeEntry && todayEntries.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('timer.noEntriesToday')}</p>
          </div>
        )}
      </main>

      {showCorrectionModal && correctingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('timer.correctionTitle')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('timer.correctionReason')}</label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('timer.clockIn')}</label>
                <input
                  type="datetime-local"
                  value={correctionClockIn}
                  onChange={(e) => setCorrectionClockIn(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('timer.clockOut')}</label>
                <input
                  type="datetime-local"
                  value={correctionClockOut}
                  onChange={(e) => setCorrectionClockOut(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCorrectionModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  {t('common.cancel')}
                </button>
                <button onClick={handleSubmitCorrection} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                  {t('common.send')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
