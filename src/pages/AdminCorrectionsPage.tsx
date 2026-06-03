import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Loader2, Clock, Check, XCircle } from 'lucide-react';
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
  clock_in: string;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_seconds: number;
  break_seconds: number;
}

interface Correction {
  id: string;
  time_entry_id: string;
  employee_id: string;
  reason: string;
  new_clock_in: string | null;
  new_clock_out: string | null;
  new_break_start: string | null;
  new_break_end: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  requested_at: string;
  employee?: Employee;
  time_entry?: TimeEntry;
}

type TabType = 'pending' | 'approved' | 'rejected';

export function AdminCorrectionsPage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [reviewingCorrection, setReviewingCorrection] = useState<Correction | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  const loadCorrections = useCallback(async () => {
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

    const { data, error } = await supabase
      .from('time_corrections')
      .select(`
        *,
        employee:employees(id, full_name, email, position),
        time_entry:time_entries!inner(id, clock_in, clock_out, break_start, break_end, total_seconds, break_seconds)
      `)
      .eq('company_id', userRecord.company_id)
      .order('requested_at', { ascending: false });

    if (!error && data) {
      setCorrections(data as unknown as Correction[]);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadCorrections();
  }, [loadCorrections]);

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!reviewingCorrection) return;

    const { error } = await supabase
      .from('time_corrections')
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq('id', reviewingCorrection.id);

    if (!error) {
      setShowReviewModal(false);
      setReviewingCorrection(null);
      setReviewNotes('');
      loadCorrections();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredCorrections = corrections.filter((c) => c.status === activeTab);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400';
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400';
    }
  };

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'pending', label: t('corrections.tabs.pending'), count: corrections.filter((c) => c.status === 'pending').length },
    { key: 'approved', label: t('corrections.tabs.approved'), count: corrections.filter((c) => c.status === 'approved').length },
    { key: 'rejected', label: t('corrections.tabs.rejected'), count: corrections.filter((c) => c.status === 'rejected').length },
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
                <button onClick={() => navigate('/time-tracking')} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  {t('nav.timeTracking')}
                </button>
                <button onClick={() => navigate('/time-corrections')} className="px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400">
                  {t('nav.timeCorrections')}
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
            {t('corrections.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('corrections.subtitle')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'text-teal-600 dark:text-teal-400 border-teal-600 dark:border-teal-400'
                      : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-teal-600 dark:hover:text-teal-400'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.key
                      ? 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
          ) : filteredCorrections.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('corrections.empty')}
              </h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('corrections.table.employee')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('corrections.table.date')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('corrections.table.reason')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('corrections.table.newClockIn')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('corrections.table.newClockOut')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('corrections.table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('corrections.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCorrections.map((correction) => (
                    <tr key={correction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {correction.employee?.full_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {correction.employee?.position}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(correction.requested_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {correction.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(correction.new_clock_in)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(correction.new_clock_out)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(correction.status)}`}>
                          {t(`common.status.${correction.status}`, { defaultValue: correction.status })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {correction.status === 'pending' && (
                          <button
                            onClick={() => {
                              setReviewingCorrection(correction);
                              setReviewNotes('');
                              setShowReviewModal(true);
                            }}
                            className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                          >
                            {t('common.review')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showReviewModal && reviewingCorrection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t('corrections.review.title')}
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">{t('corrections.table.employee')}: </span>
                <span className="text-gray-600 dark:text-gray-400">{reviewingCorrection.employee?.full_name}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">{t('corrections.table.reason')}: </span>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{reviewingCorrection.reason}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('corrections.review.oldValues')}</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-500 dark:text-gray-400">{t('corrections.review.clockIn')}:</span> <span className="text-gray-900 dark:text-white">{formatTime(reviewingCorrection.time_entry?.clock_in || null)}</span></div>
                    <div><span className="text-gray-500 dark:text-gray-400">{t('corrections.review.clockOut')}:</span> <span className="text-gray-900 dark:text-white">{formatTime(reviewingCorrection.time_entry?.clock_out || null)}</span></div>
                    <div><span className="text-gray-500 dark:text-gray-400">{t('corrections.review.breakStart')}:</span> <span className="text-gray-900 dark:text-white">{formatTime(reviewingCorrection.time_entry?.break_start || null)}</span></div>
                    <div><span className="text-gray-500 dark:text-gray-400">{t('corrections.review.breakEnd')}:</span> <span className="text-gray-900 dark:text-white">{formatTime(reviewingCorrection.time_entry?.break_end || null)}</span></div>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-yellow-900/10 rounded-lg p-4 border border-amber-200 dark:border-yellow-900/30">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('corrections.review.newValues')}</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-500 dark:text-gray-400">{t('corrections.review.clockIn')}:</span> <span className="text-gray-900 dark:text-white">{formatTime(reviewingCorrection.new_clock_in)}</span></div>
                    <div><span className="text-gray-500 dark:text-gray-400">{t('corrections.review.clockOut')}:</span> <span className="text-gray-900 dark:text-white">{formatTime(reviewingCorrection.new_clock_out)}</span></div>
                    <div><span className="text-gray-500 dark:text-gray-400">{t('corrections.review.breakStart')}:</span> <span className="text-gray-900 dark:text-white">{formatTime(reviewingCorrection.new_break_start)}</span></div>
                    <div><span className="text-gray-500 dark:text-gray-400">{t('corrections.review.breakEnd')}:</span> <span className="text-gray-900 dark:text-white">{formatTime(reviewingCorrection.new_break_end)}</span></div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                  {t('corrections.review.notes')}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={t('corrections.review.notesPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewingCorrection(null);
                  setReviewNotes('');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleReview('rejected')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <XCircle className="w-5 h-5" />
                {t('common.reject')}
              </button>
              <button
                onClick={() => handleReview('approved')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Check className="w-5 h-5" />
                {t('common.approve')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
