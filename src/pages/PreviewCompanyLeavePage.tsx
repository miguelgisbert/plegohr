import { Plus, Check, XCircle, Calendar, Tag, Pencil, Trash2 } from 'lucide-react';
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
  employee_name: string;
  employee_position: string;
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

const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  { id: '1', employee_name: 'Maria García', employee_position: 'Software Developer', leave_type: { id: '1', name: 'Vacation' }, start_date: '2025-04-07', end_date: '2025-04-11', reason: 'Easter holidays', status: 'pending', requested_at: '2025-03-20T10:00:00Z' },
  { id: '2', employee_name: 'Joan Puig', employee_position: 'Product Manager', leave_type: { id: '3', name: 'Personal day' }, start_date: '2025-03-28', end_date: '2025-03-28', reason: 'Administrative errands', status: 'approved', requested_at: '2025-03-15T09:00:00Z', review_notes: 'Approved' },
  { id: '3', employee_name: 'Laura Martínez', employee_position: 'UX Designer', leave_type: { id: '1', name: 'Vacation' }, start_date: '2025-05-01', end_date: '2025-05-09', reason: 'Spring break', status: 'pending', requested_at: '2025-03-18T11:00:00Z' },
  { id: '4', employee_name: 'Carlos López', employee_position: 'Marketing Specialist', leave_type: { id: '2', name: 'Sick leave' }, start_date: '2025-03-10', end_date: '2025-03-14', reason: 'Flu', status: 'approved', requested_at: '2025-03-10T08:00:00Z', review_notes: 'Approved with medical certificate' },
  { id: '5', employee_name: 'Ana Fernández', employee_position: 'HR Manager', leave_type: { id: '4', name: 'Training' }, start_date: '2025-04-22', end_date: '2025-04-23', reason: 'HR Analytics course', status: 'rejected', requested_at: '2025-03-05T14:00:00Z', review_notes: 'Conflict with annual salary review dates' },
];

export function PreviewCompanyLeavePage() {
  const { t } = useTranslation();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(MOCK_LEAVE_TYPES);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(MOCK_LEAVE_REQUESTS);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [reviewingRequest, setReviewingRequest] = useState<LeaveRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const showDemoToast = (msg: string) => {
    setDemoMessage(msg);
    setTimeout(() => setDemoMessage(null), 2500);
  };

  const handleAddLeaveType = () => {
    if (!newTypeName.trim()) return;
    if (editingType) {
      setLeaveTypes(leaveTypes.map(t => t.id === editingType.id ? { ...t, name: newTypeName } : t));
      showDemoToast(t('demo.leaveTypeUpdated'));
    } else {
      setLeaveTypes([...leaveTypes, { id: String(Date.now()), name: newTypeName }]);
      showDemoToast(t('demo.leaveTypeAdded'));
    }
    setShowTypeModal(false);
    setNewTypeName('');
    setEditingType(null);
  };

  const handleDeleteLeaveType = (typeId: string) => {
    if (!confirm(t('leave.types.confirmDelete'))) return;
    setLeaveTypes(leaveTypes.filter(lt => lt.id !== typeId));
    showDemoToast(t('demo.leaveTypeDeleted'));
  };

  const handleReviewRequest = (status: 'approved' | 'rejected') => {
    if (!reviewingRequest) return;
    setLeaveRequests(leaveRequests.map(r =>
      r.id === reviewingRequest.id ? { ...r, status, review_notes: reviewNotes || undefined } : r
    ));
    setShowReviewModal(false);
    setReviewingRequest(null);
    setReviewNotes('');
    showDemoToast(status === 'approved' ? t('demo.leaveApproved') : t('demo.leaveRejected'));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400';
      case 'rejected': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400';
      default: return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400';
    }
  };

  const diffDays = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const filteredRequests = leaveRequests.filter(req => !filterStatus || req.status === filterStatus);

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
                <Link to="/preview/company-dashboard" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">{t('nav.dashboard')}</Link>
                <Link to="/preview/company-documents" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">{t('nav.documents')}</Link>
                <Link to="/preview/company-leave" className="px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400">{t('nav.leave')}</Link>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('leave.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('leave.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('leave.types.sectionTitle')}</h2>
              <button onClick={() => { setEditingType(null); setNewTypeName(''); setShowTypeModal(true); }} className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {leaveTypes.map((type) => (
                <div key={type.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{type.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingType(type); setNewTypeName(type.name); setShowTypeModal(true); }} className="p-1 text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteLeaveType(type.id)} className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('leave.stats.summary')}</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{leaveRequests.filter(r => r.status === 'pending').length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('leave.stats.pending')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{leaveRequests.filter(r => r.status === 'approved').length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('leave.stats.approved')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">{leaveRequests.filter(r => r.status === 'rejected').length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('leave.stats.rejected')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('leave.myTitle')}</h2>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white">
              <option value="">{t('leave.filters.allStatuses')}</option>
              <option value="pending">{t('leave.filters.pending')}</option>
              <option value="approved">{t('leave.filters.approved')}</option>
              <option value="rejected">{t('leave.filters.rejected')}</option>
            </select>
          </div>
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('leave.empty.requestsTitle')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{t('leave.empty.requestsDescription')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {[t('leave.columns.employee'), t('leave.columns.type'), t('leave.columns.dates'), t('leave.columns.days'), t('leave.columns.reason'), t('leave.columns.status'), t('leave.columns.actions')].map((h, i) => (
                      <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{request.employee_name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{request.employee_position}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900/20 text-teal-800 dark:text-teal-400">{request.leave_type.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        <div>{new Date(request.start_date).toLocaleDateString()}</div>
                        <div>{t('leave.until')} {new Date(request.end_date).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{diffDays(request.start_date, request.end_date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{request.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>{t(`leave.status.${request.status}`)}</span>
                        {request.review_notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-32">{request.review_notes}</p>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {request.status === 'pending' && (
                          <button onClick={() => { setReviewingRequest(request); setReviewNotes(''); setShowReviewModal(true); }} className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
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

      {demoMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-50 text-sm font-medium">{demoMessage}</div>
      )}

      {showTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{editingType ? t('leave.types.editModal') : t('leave.types.addModal')}</h3>
            <input type="text" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder={t('leave.types.namePlaceholder')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowTypeModal(false); setNewTypeName(''); setEditingType(null); }} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">{t('common.cancel')}</button>
              <button onClick={handleAddLeaveType} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">{editingType ? t('common.update') : t('common.add')}</button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && reviewingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('leave.review.title')}</h3>
            <div className="space-y-3 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div><span className="font-semibold text-gray-900 dark:text-white">{t('leave.review.employee')}: </span><span className="text-gray-600 dark:text-gray-300">{reviewingRequest.employee_name}</span></div>
              <div><span className="font-semibold text-gray-900 dark:text-white">{t('leave.review.type')}: </span><span className="text-gray-600 dark:text-gray-300">{reviewingRequest.leave_type.name}</span></div>
              <div><span className="font-semibold text-gray-900 dark:text-white">{t('leave.review.period')}: </span><span className="text-gray-600 dark:text-gray-300">{new Date(reviewingRequest.start_date).toLocaleDateString()} — {new Date(reviewingRequest.end_date).toLocaleDateString()} ({diffDays(reviewingRequest.start_date, reviewingRequest.end_date)} {t('leave.columns.days')})</span></div>
              <div><span className="font-semibold text-gray-900 dark:text-white">{t('leave.review.reason')}: </span><span className="text-gray-600 dark:text-gray-300">{reviewingRequest.reason}</span></div>
            </div>
            <div className="mb-4">
              <label className="block font-semibold text-gray-900 dark:text-white mb-2">{t('leave.review.notes')}</label>
              <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder={t('leave.review.notesPlaceholder')} rows={3} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowReviewModal(false); setReviewingRequest(null); }} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">{t('common.cancel')}</button>
              <button onClick={() => handleReviewRequest('rejected')} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                <XCircle className="w-5 h-5" />{t('leave.review.reject')}
              </button>
              <button onClick={() => handleReviewRequest('approved')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <Check className="w-5 h-5" />{t('leave.review.approve')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
