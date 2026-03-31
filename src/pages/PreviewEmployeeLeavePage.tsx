import { Calendar, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlarmClockIcon } from '../components/common/AlarmClockIcon';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { DemoBanner } from '../components/common/DemoBanner';

interface LeaveType {
  id: string;
  name: string;
}

interface LeaveRequest {
  id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  review_notes?: string;
}

const MOCK_LEAVE_TYPES: LeaveType[] = [
  { id: '1', name: 'Vacation' },
  { id: '2', name: 'Sick leave' },
  { id: '3', name: 'Personal day' },
  { id: '4', name: 'Training' },
];

const MOCK_MY_REQUESTS: LeaveRequest[] = [
  { id: '1', leave_type: { id: '1', name: 'Vacation' }, start_date: '2025-04-07', end_date: '2025-04-11', reason: 'Easter holidays', status: 'pending', requested_at: '2025-03-20T10:00:00Z' },
  { id: '2', leave_type: { id: '3', name: 'Personal day' }, start_date: '2025-03-28', end_date: '2025-03-28', reason: 'Administrative errands', status: 'approved', requested_at: '2025-03-15T09:00:00Z', review_notes: 'Approved' },
  { id: '3', leave_type: { id: '1', name: 'Vacation' }, start_date: '2024-08-12', end_date: '2024-08-23', reason: 'Summer holidays', status: 'approved', requested_at: '2024-06-01T10:00:00Z', review_notes: 'Approved. Enjoy your vacation!' },
];

export function PreviewEmployeeLeavePage() {
  const { t } = useTranslation();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(MOCK_MY_REQUESTS);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const showDemoToast = (msg: string) => {
    setDemoMessage(msg);
    setTimeout(() => setDemoMessage(null), 2500);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const leaveType = MOCK_LEAVE_TYPES.find(lt => lt.id === requestForm.leave_type_id) || MOCK_LEAVE_TYPES[0];
    const newRequest: LeaveRequest = {
      id: String(Date.now()),
      leave_type: leaveType,
      start_date: requestForm.start_date,
      end_date: requestForm.end_date,
      reason: requestForm.reason,
      status: 'pending',
      requested_at: new Date().toISOString(),
    };
    setLeaveRequests([newRequest, ...leaveRequests]);
    setShowRequestModal(false);
    setRequestForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
    showDemoToast(t('leave.toast.submitted'));
  };

  const diffDays = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
  };

  const totalApprovedDays = leaveRequests
    .filter(r => r.status === 'approved')
    .reduce((total, r) => total + diffDays(r.start_date, r.end_date), 0);

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
                <Link to="/preview/employee-dashboard" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">{t('nav.dashboard')}</Link>
                <Link to="/preview/employee-documents" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">{t('nav.documents')}</Link>
                <Link to="/preview/employee-leave" className="px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400">{t('nav.leave')}</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <Link to="/signup" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold">{t('common.signup')}</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('leave.myTitle')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('leave.mySubtitle')}</p>
          </div>
          <button onClick={() => setShowRequestModal(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold">
            <Plus className="w-5 h-5" />
            {t('leave.newRequest')}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{leaveRequests.filter(r => r.status === 'pending').length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('leave.stats.pending')}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{leaveRequests.filter(r => r.status === 'approved').length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('leave.stats.approved')}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{totalApprovedDays}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('leave.stats.totalApprovedDays')}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('leave.historyTitle')}</h2>
          </div>

          {leaveRequests.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('leave.empty.myTitle')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{t('leave.empty.myDescription')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {leaveRequests.map((request) => (
                <div key={request.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900/20 text-teal-800 dark:text-teal-400">{request.leave_type.name}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>{t(`leave.status.${request.status}`)}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{diffDays(request.start_date, request.end_date)} {t('leave.columns.days')}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                        <span className="font-medium">{new Date(request.start_date).toLocaleDateString()}</span>
                        {' — '}
                        <span className="font-medium">{new Date(request.end_date).toLocaleDateString()}</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{request.reason}</p>
                      {request.review_notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 italic">{t('leave.review.hrNote')}: {request.review_notes}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {new Date(request.requested_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {demoMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-50 text-sm font-medium">{demoMessage}</div>
      )}

      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('leave.request.title')}</h3>
              <button onClick={() => setShowRequestModal(false)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('leave.request.type')}</label>
                <select value={requestForm.leave_type_id} onChange={(e) => setRequestForm({ ...requestForm, leave_type_id: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white">
                  <option value="">{t('leave.request.selectType')}</option>
                  {MOCK_LEAVE_TYPES.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('leave.request.startDate')}</label>
                  <input type="date" value={requestForm.start_date} onChange={(e) => setRequestForm({ ...requestForm, start_date: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('leave.request.endDate')}</label>
                  <input type="date" value={requestForm.end_date} min={requestForm.start_date} onChange={(e) => setRequestForm({ ...requestForm, end_date: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('leave.request.reason')}</label>
                <textarea value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} required rows={3} placeholder={t('leave.request.reasonPlaceholder')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white" />
              </div>
              {requestForm.start_date && requestForm.end_date && (
                <p className="text-sm text-teal-600 dark:text-teal-400 font-medium">
                  {t('leave.request.daysRequested', { count: diffDays(requestForm.start_date, requestForm.end_date) })}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRequestModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">{t('common.cancel')}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold">{t('leave.request.submit')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
