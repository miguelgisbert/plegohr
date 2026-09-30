import { useTranslation } from 'react-i18next';
import { TopNav } from '../components/common/TopNav';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Download, Search, Filter, Eye, PenLine, X } from 'lucide-react';
import { Toast } from '../components/common/Toast';
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  document_type: string;
  uploaded_at: string;
  description: string | null;
  requires_signature: boolean;
  signed_at: string | null;
}

export function EmployeeDocumentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (!employee) return;

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employee.id)
      .order('uploaded_at', { ascending: false });

    if (!error && data) {
      setDocuments(data);
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
      alert(t('documents.errors.downloadFailed'));
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

  const handleSign = async (doc: Document) => {
    if (!confirm(t('documents.confirmSign'))) return;

    setSigningId(doc.id);
    try {
      const { error } = await supabase.rpc('sign_document', {
        p_document_id: doc.id,
      });

      if (error) throw error;

      setToast({ message: t('documents.toast.signed'), type: 'success' });
      await loadDocuments();
    } catch (error) {
      console.error('Sign error:', error);
      const code = (error as { code?: string; message?: string })?.message ?? '';
      if (code.includes('already_signed')) {
        setToast({ message: t('documents.toast.alreadySigned'), type: 'info' });
        await loadDocuments();
      } else if (code.includes('signature_not_required')) {
        setToast({ message: t('documents.toast.signatureNotRequired'), type: 'info' });
        await loadDocuments();
      } else {
        setToast({ message: t('documents.toast.signFailed'), type: 'error' });
      }
    } finally {
      setSigningId(null);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = !searchTerm ||
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || doc.document_type === filterType;
    return matchesSearch && matchesType;
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const signatureStatus = (doc: Document): 'signed' | 'pending' | 'none' =>
    doc.signed_at ? 'signed' : doc.requires_signature ? 'pending' : 'none';

  const documentTypes = Array.from(new Set(documents.map((doc) => doc.document_type)));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopNav role="employee" active="documents" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('documents.myTitle')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('documents.mySubtitle')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('documents.title')}</h2>
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
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white appearance-none"
                  >
                    <option value="">{t('documents.filters.allTypes')}</option>
                    {documentTypes.map((type) => (
                      <option key={type} value={type}>
                        {t(`documents.types.${type}`)}
                      </option>
                    ))}
                  </select>
                </div>
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
                {documents.length === 0
                  ? t('documents.empty.noCompanyDocs')
                  : t('documents.empty.noSearchResults')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('documents.columns.document')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('documents.columns.type')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('documents.columns.size')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('documents.columns.date')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('documents.columns.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('documents.columns.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
                            <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {doc.file_name}
                            </div>
                            {doc.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {doc.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900/20 text-teal-800 dark:text-teal-400">
                          {t(`documents.types.${doc.document_type}`)}
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePreview(doc)}
                            className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                            title={t('common.preview')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {doc.requires_signature && !doc.signed_at && (
                            <button
                              onClick={() => handleSign(doc)}
                              disabled={signingId === doc.id}
                              className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <PenLine className="w-4 h-4" />
                              {signingId === doc.id
                                ? t('documents.signing')
                                : t('documents.sign')}
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                            title={t('common.download')}
                          >
                            <Download className="w-4 h-4" />
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

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
                {t('documents.about.title')}
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                {t('documents.about.description')}
              </p>
            </div>
          </div>
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
                  {t(`documents.types.${previewDoc.document_type}`, { defaultValue: previewDoc.document_type })}
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
              {previewDoc.requires_signature && !previewDoc.signed_at && (
                <button
                  onClick={() => {
                    const doc = previewDoc;
                    closePreview();
                    handleSign(doc);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                >
                  <PenLine className="w-4 h-4" />
                  {t('documents.sign')}
                </button>
              )}
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
