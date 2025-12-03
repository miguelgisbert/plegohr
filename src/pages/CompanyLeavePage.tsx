import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Plus, X, Check, XCircle, Calendar, Tag, Pencil, Trash2 } from 'lucide-react';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { AlarmClockIcon } from '../components/common/AlarmClockIcon';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

interface LeaveType {
  id: string;
  name: string;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
  review_notes?: string;
  leave_type: LeaveType;
  employee?: {
    id: string;
    full_name: string;
    email: string;
    position: string;
  };
}

export function CompanyLeavePage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [reviewingRequest, setReviewingRequest] = useState<LeaveRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    loadLeaveTypes();
    loadLeaveRequests();
  }, []);

  const loadLeaveTypes = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user?.id)
      .maybeSingle();

    if (!profile?.company_id) return;

    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('name');

    if (!error && data) {
      setLeaveTypes(data);
    }
  };

  const loadLeaveRequests = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user?.id)
      .maybeSingle();

    if (!profile?.company_id) return;

    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        leave_type:leave_types(id, name),
        employee:employees(id, full_name, email, position)
      `)
      .eq('company_id', profile.company_id)
      .order('requested_at', { ascending: false });

    if (!error && data) {
      setLeaveRequests(data as any);
    }
  };

  const handleAddLeaveType = async () => {
    if (!newTypeName.trim()) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user?.id)
      .maybeSingle();

    if (!profile?.company_id) return;

    if (editingType) {
      const { error } = await supabase
        .from('leave_types')
        .update({ name: newTypeName })
        .eq('id', editingType.id);

      if (!error) {
        setShowTypeModal(false);
        setNewTypeName('');
        setEditingType(null);
        loadLeaveTypes();
      }
    } else {
      const { error } = await supabase
        .from('leave_types')
        .insert({ company_id: profile.company_id, name: newTypeName });

      if (!error) {
        setShowTypeModal(false);
        setNewTypeName('');
        loadLeaveTypes();
      }
    }
  };

  const handleDeleteLeaveType = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this leave type?')) return;

    const { error } = await supabase
      .from('leave_types')
      .delete()
      .eq('id', typeId);

    if (!error) {
      loadLeaveTypes();
    }
  };

  const handleReviewRequest = async (status: 'approved' | 'rejected') => {
    if (!reviewingRequest) return;

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
        review_notes: reviewNotes || null,
      })
      .eq('id', reviewingRequest.id);

    if (!error) {
      setShowReviewModal(false);
      setReviewingRequest(null);
      setReviewNotes('');
      loadLeaveRequests();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const filteredRequests = leaveRequests.filter((req) => {
    if (!filterStatus) return true;
    return req.status === filterStatus;
  });

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
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
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
                  className="px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400"
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
            Leave Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage leave types and review employee leave requests
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave Types</h2>
              <button
                onClick={() => {
                  setEditingType(null);
                  setNewTypeName('');
                  setShowTypeModal(true);
                }}
                className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {leaveTypes.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No leave types yet
                </p>
              ) : (
                leaveTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {type.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingType(type);
                          setNewTypeName(type.name);
                          setShowTypeModal(true);
                        }}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLeaveType(type.id)}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {leaveRequests.filter((r) => r.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {leaveRequests.filter((r) => r.status === 'approved').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {leaveRequests.filter((r) => r.status === 'rejected').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Rejected</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Leave Requests</h2>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No leave requests found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Leave requests will appear here when employees submit them
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Leave Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {request.employee?.full_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {request.employee?.position}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900/20 text-teal-800 dark:text-teal-400">
                          {request.leave_type.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        <div>{new Date(request.start_date).toLocaleDateString()}</div>
                        <div>to {new Date(request.end_date).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {request.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {request.status === 'pending' && (
                          <button
                            onClick={() => {
                              setReviewingRequest(request);
                              setReviewNotes('');
                              setShowReviewModal(true);
                            }}
                            className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                          >
                            Review
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

      {showTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingType ? 'Edit Leave Type' : 'Add Leave Type'}
            </h3>
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="Enter leave type name..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowTypeModal(false);
                  setNewTypeName('');
                  setEditingType(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLeaveType}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                {editingType ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && reviewingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Review Leave Request
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Employee: </span>
                <span className="text-gray-600 dark:text-gray-400">{reviewingRequest.employee?.full_name}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Leave Type: </span>
                <span className="text-gray-600 dark:text-gray-400">{reviewingRequest.leave_type.name}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Period: </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {new Date(reviewingRequest.start_date).toLocaleDateString()} - {new Date(reviewingRequest.end_date).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Reason: </span>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{reviewingRequest.reason}</p>
              </div>
              <div>
                <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                  Review Notes (optional):
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this decision..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewingRequest(null);
                  setReviewNotes('');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewRequest('rejected')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
              <button
                onClick={() => handleReviewRequest('approved')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Check className="w-5 h-5" />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
