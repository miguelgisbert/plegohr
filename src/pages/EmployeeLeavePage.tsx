import { useTranslation } from 'react-i18next';
import { TopNav } from '../components/common/TopNav';
import { useAuth } from '../contexts/AuthContext';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Card, CardContent, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Grid, IconButton,  } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import type { Dayjs } from 'dayjs';

interface LeaveType {
  id: string;
  name: string;
}

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
  review_notes?: string;
  leave_type: LeaveType;
}

export function EmployeeLeavePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    leave_type_id: '',
    start_date: null as Dayjs | null,
    end_date: null as Dayjs | null,
    reason: '',
  });

  useEffect(() => {
    loadLeaveTypes();
    loadLeaveRequests();
  }, []);

  const loadLeaveTypes = async () => {
    const { data: employee } = await supabase
      .from('employees')
      .select('company_id')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (!employee?.company_id) return;

    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('company_id', employee.company_id)
      .order('name');

    if (!error && data) {
      setLeaveTypes(data);
    }
  };

  const loadLeaveRequests = async () => {
    const { data: employee } = await supabase
      .from('employees')
      .select('id, company_id')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (!employee) return;

    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        leave_type:leave_types(id, name)
      `)
      .eq('employee_id', employee.id)
      .order('requested_at', { ascending: false });

    if (!error && data) {
      setLeaveRequests(data as unknown as LeaveRequest[]);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requestForm.start_date || !requestForm.end_date) return;

    const { data: employee } = await supabase
      .from('employees')
      .select('id, company_id')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (!employee) return;

    const { error } = await supabase
      .from('leave_requests')
      .insert({
        company_id: employee.company_id,
        employee_id: employee.id,
        leave_type_id: requestForm.leave_type_id,
        start_date: requestForm.start_date.format('YYYY-MM-DD'),
        end_date: requestForm.end_date.format('YYYY-MM-DD'),
        reason: requestForm.reason,
      });

    if (!error) {
      setShowRequestModal(false);
      setRequestForm({
        leave_type_id: '',
        start_date: null,
        end_date: null,
        reason: '',
      });
      loadLeaveRequests();
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopNav role="employee" active="leave" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <div>
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              {t('leave.myTitle')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('leave.mySubtitle')}
            </Typography>
          </div>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowRequestModal(true)}
            size="large"
          >
            {t('leave.newRequest')}
          </Button>
        </Box>

        <Grid container spacing={3} mb={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="warning.main" fontWeight="bold">
                  {leaveRequests.filter((r) => r.status === 'pending').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('leave.stats.pending')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="success.main" fontWeight="bold">
                  {leaveRequests.filter((r) => r.status === 'approved').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('leave.stats.approved')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary.main" fontWeight="bold">
                  {leaveRequests
                    .filter((r) => r.status === 'approved')
                    .reduce((total, r) => total + calculateDays(r.start_date, r.end_date), 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('leave.stats.totalApprovedDays')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card>
          <Box p={3} borderBottom={1} borderColor="divider">
            <Typography variant="h5" fontWeight="bold">
              {t('leave.historyTitle')}
            </Typography>
          </Box>

          {leaveRequests.length === 0 ? (
            <Box p={6} textAlign="center">
              <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <Typography variant="h6" gutterBottom>
                {t('leave.empty.myTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('leave.empty.myDescription')}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('leave.columns.type')}</TableCell>
                    <TableCell>{t('leave.columns.dates')}</TableCell>
                    <TableCell>{t('leave.columns.days')}</TableCell>
                    <TableCell>{t('leave.columns.reason')}</TableCell>
                    <TableCell>{t('leave.columns.status')}</TableCell>
                    <TableCell>{t('leave.columns.requested')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaveRequests.map((request) => (
                    <TableRow key={request.id} hover>
                      <TableCell>
                        <Chip label={request.leave_type.name} color="primary" size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(request.start_date).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('leave.until')} {new Date(request.end_date).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {calculateDays(request.start_date, request.end_date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                          {request.reason}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={t(`leave.status.${request.status}`)}
                          color={getStatusColor(request.status)}
                          size="small"
                        />
                        {request.review_notes && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {request.review_notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(request.requested_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </main>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Dialog
          open={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight="bold">
                {t('leave.request.title')}
              </Typography>
              <IconButton onClick={() => setShowRequestModal(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <form onSubmit={handleSubmitRequest}>
            <DialogContent>
              <Box display="flex" flexDirection="column" gap={3}>
                <TextField
                  select
                  label={t('leave.request.type')}
                  value={requestForm.leave_type_id}
                  onChange={(e) => setRequestForm({ ...requestForm, leave_type_id: e.target.value })}
                  required
                  fullWidth
                >
                  {leaveTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </TextField>

                <DatePicker
                  label={t('leave.request.startDate')}
                  value={requestForm.start_date}
                  onChange={(newValue) => setRequestForm({ ...requestForm, start_date: newValue })}
                  slotProps={{
                    textField: {
                      required: true,
                      fullWidth: true,
                    },
                  }}
                />

                <DatePicker
                  label={t('leave.request.endDate')}
                  value={requestForm.end_date}
                  onChange={(newValue) => setRequestForm({ ...requestForm, end_date: newValue })}
                  minDate={requestForm.start_date || undefined}
                  slotProps={{
                    textField: {
                      required: true,
                      fullWidth: true,
                    },
                  }}
                />

                <TextField
                  label={t('leave.request.reason')}
                  multiline
                  rows={4}
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  placeholder={t('leave.request.reasonPlaceholder')}
                  required
                  fullWidth
                />
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 2 }}>
              <Button onClick={() => setShowRequestModal(false)}>{t('common.cancel')}</Button>
              <Button type="submit" variant="contained" size="large">
                {t('leave.request.submit')}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </LocalizationProvider>
    </div>
  );
}
