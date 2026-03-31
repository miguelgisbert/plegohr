import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlarmClockIcon } from '../components/common/AlarmClockIcon';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { DemoBanner } from '../components/common/DemoBanner';

export function PreviewEmployeeDashboardPage() {
  const { t } = useTranslation();

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
  const [dayEnded, setDayEnded] = useState(false);

  useEffect(() => {
    let interval: number | null = null;
    if (isWorkRunning && !isPauseRunning) {
      interval = window.setInterval(() => {
        if (currentWorkSessionStart) {
          setWorkTime(Math.floor((Date.now() - currentWorkSessionStart.getTime()) / 1000) + accumulatedWorkTime);
        }
      }, 100);
    }
    return () => { if (interval) clearInterval(interval); };
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
    return () => { if (interval) clearInterval(interval); };
  }, [isPauseRunning, currentPauseSessionStart, accumulatedPauseTime]);

  const handleStartWork = () => {
    const now = new Date();
    setWorkStartTime(now);
    setCurrentWorkSessionStart(now);
    setIsWorkRunning(true);
    setWorkEndTime(null);
    setDayEnded(false);
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
    setDayEnded(true);
  };

  const handleReset = () => {
    setWorkTime(0); setPauseTime(0);
    setIsWorkRunning(false); setIsPauseRunning(false);
    setWorkStartTime(null); setWorkEndTime(null);
    setPauseStartTime(null); setPauseEndTime(null);
    setCurrentWorkSessionStart(null); setCurrentPauseSessionStart(null);
    setAccumulatedWorkTime(0); setAccumulatedPauseTime(0);
    setTotalWorkedTime(0); setTotalPausedTime(0);
    setDayEnded(false);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDisplayTime = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour12: false });
  };

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
                <Link to="/preview/employee-dashboard" className="px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400">{t('nav.dashboard')}</Link>
                <Link to="/preview/employee-documents" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">{t('nav.documents')}</Link>
                <Link to="/preview/employee-leave" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">{t('nav.leave')}</Link>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Maria García</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {dayEnded && (
          <div className="max-w-2xl mx-auto mb-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <p className="text-green-800 dark:text-green-300 font-semibold">{t('timer.dayEnded')}</p>
            <button onClick={handleReset} className="mt-2 text-sm text-green-700 dark:text-green-400 underline hover:no-underline">
              {t('timer.resetDemo')}
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Work timer */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{t('timer.workTime')}</p>
            <div className={`text-5xl font-bold mb-6 font-mono transition-colors ${isWorkRunning && !isPauseRunning ? 'text-teal-600 dark:text-teal-400' : 'text-gray-900 dark:text-white'}`}>
              {formatTime(workTime)}
            </div>
            {!isWorkRunning ? (
              <button onClick={handleStartWork} disabled={dayEnded} className="px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-lg mb-6 w-full max-w-xs disabled:opacity-50 disabled:cursor-not-allowed">
                {t('timer.startWork')}
              </button>
            ) : (
              <button onClick={handleEndWork} className="px-8 py-3 border-2 border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-semibold text-lg mb-6 w-full max-w-xs">
                {t('timer.endWork')}
              </button>
            )}
            <div className="space-y-1 text-gray-600 dark:text-gray-300">
              {workStartTime && <div className="text-sm"><span className="font-medium">{t('timer.clockIn')}:</span> {formatDisplayTime(workStartTime)}</div>}
              {workEndTime && <div className="text-sm"><span className="font-medium">{t('timer.clockOut')}:</span> {formatDisplayTime(workEndTime)}</div>}
            </div>
          </div>

          {/* Pause timer */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{t('timer.pauseTime')}</p>
            <div className={`text-5xl font-bold mb-6 font-mono transition-colors ${isPauseRunning ? 'text-amber-500 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
              {formatTime(pauseTime)}
            </div>
            {!isPauseRunning ? (
              <button onClick={handleStartPause} disabled={!isWorkRunning} className="px-8 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-semibold text-lg mb-6 disabled:opacity-50 disabled:cursor-not-allowed w-full max-w-xs">
                {t('timer.startPause')}
              </button>
            ) : (
              <button onClick={handleEndPause} className="px-8 py-3 border-2 border-amber-500 text-amber-500 dark:border-amber-400 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors font-semibold text-lg mb-6 w-full max-w-xs">
                {t('timer.endPause')}
              </button>
            )}
            <div className="space-y-1 text-gray-600 dark:text-gray-300">
              {pauseStartTime && <div className="text-sm"><span className="font-medium">{t('timer.pauseStart')}:</span> {formatDisplayTime(pauseStartTime)}</div>}
              {pauseEndTime && <div className="text-sm"><span className="font-medium">{t('timer.pauseEnd')}:</span> {formatDisplayTime(pauseEndTime)}</div>}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 text-center">{t('timer.summary')}</h2>
          <div className="grid grid-cols-2 gap-6 text-center mb-8">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('timer.workedTime')}</p>
              <p className="text-3xl font-bold font-mono text-teal-600 dark:text-teal-400">{formatTime(totalWorkedTime || workTime)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('timer.pausedTime')}</p>
              <p className="text-3xl font-bold font-mono text-amber-500 dark:text-amber-400">{formatTime(totalPausedTime || pauseTime)}</p>
            </div>
          </div>
          <div className="text-center">
            <button
              onClick={handleEndDay}
              disabled={(!isWorkRunning && !workStartTime) || dayEnded}
              className="px-12 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('timer.endDay')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
