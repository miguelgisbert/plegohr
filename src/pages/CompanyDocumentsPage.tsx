import { useTranslation } from 'react-i18next';
import { TopNav } from '../components/common/TopNav';
import { useAuth } from '../contexts/AuthContext';
import { Upload, FileText, Trash2, Download, Search, Eye, X, FileSignature } from 'lucide-react';
import { Toast } from '../components/common/Toast';
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { isNetworkError } from '../utils/errorUtils';

const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'];
const MAX_FILE_SIZE_MB = 10;

interface Employee {
  id: string;
  full_name: string;
  email: string;
  position: string;
}

interface Document {
  id: string;
  employee_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  document_type: string;
  uploaded_at: string;
  description: string | null;
  requires_signature: boolean;
  signed_at: string | null;
  employee?: Employee;
}

export function CompanyDocumentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    employee_id: '',
    document_type: 'contract',
    description: '',
    file: null as File | null,
    requires_signature: false,
  });
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadEmployees();
    loadDocuments();
  }, []);

  const loadEmployees = async () => {
    const { data: userRecord } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user?.id)
      .maybeSingle();

    if (!userRecord?.company_id) return;

    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name, email, position')
      .eq('company_id', userRecord.company_id)
      .order('full_name');

    if (!error && data) {
      setEmployees(data);
    }
  };

  const loadDocuments = async () => {
    const { data: userRecord } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user?.id)
      .maybeSingle();

    if (!userRecord?.company_id) return;

    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        employee:employees(id, full_name, email, position)
      `)
      .eq('company_id', userRecord.company_id)
      .order('uploaded_at', { ascending: false });

    if (!error && data) {
      setDocuments(data as unknown as Document[]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm({ ...uploadForm, file: e.target.files[0] });
    }
  };

  const validateFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return t('documents.errors.invalidFileType');
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return t('documents.errors.fileTooLarge');
    }
    return null;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.employee_id) return;

    const validationError = validateFile(uploadForm.file);
    if (validationError) {
      setToast({ message: validationError, type: 'error' });
      return;
    }

    setIsUploading(true);

    try {
      const { data: userRecord } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user?.id)
        .maybeSingle();

      if (!userRecord?.company_id) {
        alert(t('employees.toast.noCompany'));
        return;
      }

      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${userRecord.company_id}/${uploadForm.employee_id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, uploadForm.file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          company_id: userRecord.company_id,
          employee_id: uploadForm.employee_id,
          file_name: uploadForm.file.name,
          file_path: fileName,
          file_type: uploadForm.file.type,
          file_size: uploadForm.file.size,
          document_type: uploadForm.document_type,
          description: uploadForm.description || null,
          uploaded_by: user?.id,
          requires_signature: uploadForm.requires_signature,
        });

      if (insertError) throw insertError;

      setUploadForm({
        employee_id: '',
        document_type: 'contract',
        description: '',
        file: null,
        requires_signature: false,
      });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      setToast({ message: t('documents.toast.uploaded'), type: 'success' });
      loadDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      if (isNetworkError(error)) {
        alert(t('common.errors.networkError'));
      } else {
        alert(t('common.errors.unexpected'));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(t('documents.confirmDelete'))) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (deleteError) throw deleteError;

      loadDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      if (isNetworkError(error)) {
        alert(t('common.errors.networkError'));
      } else {
        alert(t('common.errors.unexpected'));
      }
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handlePreview = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600);

      if (error) throw error;

      setPreviewDoc(doc);
      setPreviewUrl(data.signedUrl);
    } catch (error) {
      console.error('Preview error:', error);
      setToast({ message: t('documents.errors.previewFailed'), type: 'error' });
    }
  };

  const closePreview = () => {
    setPreviewDoc(null);
    setPreviewUrl(null);
  };

  const handleToggleSignature = async (doc: Document) => {
    if (doc.signed_at) return;

    setTogglingId(doc.id);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ requires_signature: !doc.requires_signature })
        .eq('id', doc.id)
        .eq('signed_at', null);

      if (error) throw error;

      setToast({ message: t('documents.toast.signatureUpdated'), type: 'success' });
      await loadDocuments();
    } catch (error) {
      console.error('Toggle signature error:', error);
      if (isNetworkError(error)) {
        setToast({ message: t('common.errors.networkError'), type: 'error' });
      } else {
        setToast({ message: t('documents.toast.signatureUpdateFailed'), type: 'error' });
      }
    } finally {
      setTogglingId(null);
    }
  };


  const filteredDocuments = documents.filter((doc) => {
    const matchesEmployee = !selectedEmployee || doc.employee_id === selectedEmployee;
    const matchesSearch = !searchTerm ||
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.employee?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesEmployee && matchesSearch;
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const signatureStatus = (doc: Document): 'signed' | 'pending' | 'none' =>
    doc.signed_at ? 'signed' : doc.requires_signature ? 'pending' : 'none';

  const documentTypes = [
    { value: 'contract', label: t('documents.types.contract') },
    { value: 'payslip', label: t('documents.types.payslip') },
    { value: 'certificate', label: t('documents.types.certificate') },
    { value: 'id', label: t('documents.types.id') },
    { value: 'other', label: t('documents.types.other') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopNav role="admin" active="documents" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('documents.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('documents.subtitle')}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('documents.upload')}</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('documents.uploadModal.employee')}
                </label>
                <select
                  value={uploadForm.employee_id}
                  onChange={(e) => setUploadForm({ ...uploadForm, employee_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t('documents.uploadModal.selectEmployee')}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.position}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('documents.uploadModal.type')}
                </label>
                <select
                  value={uploadForm.document_type}
                  onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                >
                  {documentTypes.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('documents.uploadModal.description')}
              </label>
              <input
                type="text"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder={t('documents.uploadModal.descriptionPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('documents.uploadModal.fileLabel')}
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-50 dark:file:bg-teal-900/20 file:text-teal-700 dark:file:text-teal-400 file:cursor-pointer"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('documents.uploadModal.fileHint', { max: MAX_FILE_SIZE_MB })}
              </p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={uploadForm.requires_signature}
                onChange={(e) => setUploadForm({ ...uploadForm, requires_signature: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('documents.uploadModal.requireSignature')}
              </span>
            </label>

            <button
              type="submit"
              disabled={isUploading}
              className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              {isUploading ? t('documents.uploading') : t('documents.upload')}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('documents.allDocuments')}</h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('documents.filters.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t('documents.filters.allEmployees')}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('documents.empty.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('documents.empty.description')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {[t('documents.columns.employee'), t('documents.columns.document'), t('documents.columns.type'), t('documents.columns.size'), t('documents.columns.date'), t('documents.columns.status'), t('documents.columns.actions')].map((h, i) => (
                      <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{doc.employee?.full_name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{doc.employee?.position}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">{doc.file_name}</div>
                        {doc.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">{doc.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900/20 text-teal-800 dark:text-teal-400">
                          {t(`documents.types.${doc.document_type}`, { defaultValue: doc.document_type })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatFileSize(doc.file_size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {signatureStatus(doc) === 'signed' ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                            {t('documents.status.signed')}
                          </span>
                        ) : signatureStatus(doc) === 'pending' ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400">
                            {t('documents.status.pending')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {t('documents.status.notRequired')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePreview(doc)}
                            className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                            title={t('common.preview')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!doc.signed_at && (
                            <button
                              onClick={() => handleToggleSignature(doc)}
                              disabled={togglingId === doc.id}
                              className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                doc.requires_signature
                                  ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                              title={
                                doc.requires_signature
                                  ? t('documents.actions.signatureOptional')
                                  : t('documents.actions.requireSignature')
                              }
                            >
                              <FileSignature className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                            title={t('common.download')}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {previewDoc && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closePreview}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {previewDoc.file_name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {previewDoc.employee?.full_name} — {t(`documents.types.${previewDoc.document_type}`, { defaultValue: previewDoc.document_type })}
                </p>
              </div>
              <button
                onClick={closePreview}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {previewDoc.file_type.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={previewDoc.file_name}
                  className="mx-auto max-h-[70vh] rounded"
                />
              ) : previewDoc.file_type === 'application/pdf' || previewDoc.file_name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewUrl}
                  title={previewDoc.file_name}
                  className="w-full h-[70vh] rounded border-0"
                />
              ) : (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('documents.errors.previewNotSupported')}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleDownload(previewDoc)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                {t('common.download')}
              </button>
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
