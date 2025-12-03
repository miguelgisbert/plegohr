import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { AlarmClockIcon } from '../components/common/AlarmClockIcon';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function EmployeeDashboardPage() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [workTime, setWorkTime] = useState(0);
  const [pauseTime, setPauseTime] = useState(0);

  const [isWorkRunning, setIsWorkRunning] = useState(false);
  const [isPauseRunning, setIsPauseRunning] = useState(false);

  const [workStartTime, setWorkStartTime] = useState<Date | null>(null);
  const [workEndTime, setWorkEndTime] = useState<Date | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [pauseEndTime, setPauseEndTime] = useState<Date | null>(null);

  const [currentWorkSessionStart, setCurrentWorkSessionStart] = useState<Date | null>(null);
  const [currentPauseSessionStart, setCurrentPauseSessionStart] = useState<Date | null>(null);

  const [accumulatedWorkTime, setAccumulatedWorkTime] = useState(0);
  const [accumulatedPauseTime, setAccumulatedPauseTime] = useState(0);

  const [totalWorkedTime, setTotalWorkedTime] = useState(0);
  const [totalPausedTime, setTotalPausedTime] = useState(0);

  useEffect(() => {
    let interval: number | null = null;

    if (isWorkRunning && !isPauseRunning) {
      interval = window.setInterval(() => {
        if (currentWorkSessionStart) {
          setWorkTime(Math.floor((Date.now() - currentWorkSessionStart.getTime()) / 1000) + accumulatedWorkTime);
        }
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWorkRunning, isPauseRunning, currentWorkSessionStart, accumulatedWorkTime]);

  useEffect(() => {
    let interval: number | null = null;

    if (isPauseRunning) {
      interval = window.setInterval(() => {
        if (currentPauseSessionStart) {
          setPauseTime(Math.floor((Date.now() - currentPauseSessionStart.getTime()) / 1000) + accumulatedPauseTime);
        }
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPauseRunning, currentPauseSessionStart, accumulatedPauseTime]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleStartWork = () => {
    const now = new Date();
    setWorkStartTime(now);
    setCurrentWorkSessionStart(now);
    setIsWorkRunning(true);
    setWorkEndTime(null);
  };

  const handleEndWork = () => {
    const now = new Date();
    setWorkEndTime(now);
    setIsWorkRunning(false);
    setTotalWorkedTime(workTime);

    if (isPauseRunning) {
      setPauseEndTime(now);
      setIsPauseRunning(false);
      setTotalPausedTime(pauseTime);
    }
  };

  const handleStartPause = () => {
    if (isWorkRunning && !isPauseRunning) {
      const now = new Date();
      setAccumulatedWorkTime(workTime);

      setPauseStartTime(now);
      setCurrentPauseSessionStart(now);
      setIsPauseRunning(true);
      setPauseEndTime(null);
    }
  };

  const handleEndPause = () => {
    if (isPauseRunning) {
      const now = new Date();
      setPauseEndTime(now);
      setIsPauseRunning(false);
      setAccumulatedPauseTime(pauseTime);
      setTotalPausedTime(pauseTime);

      setCurrentWorkSessionStart(now);
    }
  };

  const handleEndDay = () => {
    const now = new Date();

    if (isWorkRunning) {
      setWorkEndTime(now);
      setIsWorkRunning(false);
      setTotalWorkedTime(workTime);
    }

    if (isPauseRunning) {
      setPauseEndTime(now);
      setIsPauseRunning(false);
      setTotalPausedTime(pauseTime);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDisplayTime = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

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
                  onClick={() => navigate('/employee-dashboard')}
                  className="px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/employee-documents')}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  Documents
                </button>
                <button
                  onClick={() => navigate('/employee-leave')}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="text-5xl font-bold text-gray-900 dark:text-white mb-6 font-mono">
              {formatTime(workTime)}
            </div>

            {!isWorkRunning ? (
              <button
                onClick={handleStartWork}
                className="px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-lg mb-6 w-full max-w-xs"
              >
                START WORK
              </button>
            ) : (
              <button
                onClick={handleEndWork}
                className="px-8 py-3 border-2 border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-semibold text-lg mb-6 w-full max-w-xs"
              >
                END WORK
              </button>
            )}

            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              {workStartTime && (
                <div className="text-sm">
                  <span className="font-medium">start time:</span> {formatDisplayTime(workStartTime)}
                </div>
              )}
              {workEndTime && (
                <div className="text-sm">
                  <span className="font-medium">end time:</span> {formatDisplayTime(workEndTime)}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="text-5xl font-bold text-gray-900 dark:text-white mb-6 font-mono">
              {formatTime(pauseTime)}
            </div>

            {!isPauseRunning ? (
              <button
                onClick={handleStartPause}
                disabled={!isWorkRunning}
                className="px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-lg mb-6 disabled:opacity-50 disabled:cursor-not-allowed w-full max-w-xs"
              >
                START PAUSE
              </button>
            ) : (
              <button
                onClick={handleEndPause}
                className="px-8 py-3 border-2 border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-semibold text-lg mb-6 w-full max-w-xs"
              >
                END PAUSE
              </button>
            )}

            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              {pauseStartTime && (
                <div className="text-sm">
                  <span className="font-medium">start pause:</span> {formatDisplayTime(pauseStartTime)}
                </div>
              )}
              {pauseEndTime && (
                <div className="text-sm">
                  <span className="font-medium">end pause:</span> {formatDisplayTime(pauseEndTime)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center space-y-3">
            <div className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">worked time:</span>{' '}
              <span className="font-mono font-bold">{formatTime(totalWorkedTime)}</span>
            </div>
            <div className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">paused time:</span>{' '}
              <span className="font-mono font-bold">{formatTime(totalPausedTime)}</span>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={handleEndDay}
              disabled={!isWorkRunning && !workStartTime}
              className="px-12 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              END DAY
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
