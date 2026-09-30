import { Upload, FileText, Trash2, Download, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlarmClockIcon } from '../components/common/AlarmClockIcon';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { DemoBanner } from '../components/common/DemoBanner';

interface MockDocument {
  id: string;
  employee_name: string;
  file_name: string;
  document_type: string;
  file_size: number;
  uploaded_at: string;
  description: string;
}

const MOCK_DOCUMENTS: MockDocument[] = [
  { id: '1', employee_name: 'Maria García', file_name: 'contract_maria_garcia.pdf', document_type: 'contract', file_size: 245760, uploaded_at: '2025-01-15T10:30:00Z', description: 'Permanent contract' },
  { id: '2', employee_name: 'Maria García', file_name: 'payslip_maria_feb_2025.pdf', document_type: 'payslip', file_size: 102400, uploaded_at: '2025-03-01T09:00:00Z', description: 'Payslip February 2025' },
  { id: '3', employee_name: 'Joan Puig', file_name: 'contract_joan_puig.pdf', document_type: 'contract', file_size: 256000, uploaded_at: '2024-11-10T11:00:00Z', description: 'Part-time contract' },
  { id: '4', employee_name: 'Joan Puig', file_name: 'payslip_joan_feb_2025.pdf', document_type: 'payslip', file_size: 98304, uploaded_at: '2025-03-01T09:05:00Z', description: 'Payslip February 2025' },
  { id: '5', employee_name: 'Laura Martínez', file_name: 'contract_laura_martinez.pdf', document_type: 'contract', file_size: 270336, uploaded_at: '2024-09-05T14:00:00Z', description: 'Senior permanent contract' },
  { id: '6', employee_name: 'Laura Martínez', file_name: 'tax_certificate_2024.pdf', document_type: 'certificate', file_size: 155648, uploaded_at: '2025-01-20T08:30:00Z', description: 'Income tax certificate 2024' },
  { id: '7', employee_name: 'Carlos López', file_name: 'payslip_carlos_feb_2025.pdf', document_type: 'payslip', file_size: 94208, uploaded_at: '2025-03-01T09:10:00Z', description: 'Payslip February 2025' },
];

const MOCK_EMPLOYEES = ['Maria García', 'Joan Puig', 'Laura Martínez', 'Carlos López', 'Ana Fernández'];

const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  contract: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  payslip: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  certificate: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
};

export function PreviewCompanyDocumentsPage() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<MockDocument[]>(MOCK_DOCUMENTS);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ employee_name: '', document_type: 'contract', description: '', file_name: '' });
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const showDemoToast = (msg: string) => {
    setDemoMessage(msg);
    setTimeout(() => setDemoMessage(null), 2500);
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const newDoc: MockDocument = {
      id: String(Date.now()),
      employee_name: uploadForm.employee_name,
      file_name: uploadForm.file_name || `document_${Date.now()}.pdf`,
      document_type: uploadForm.document_type,
      file_size: Math.floor(Math.random() * 300000) + 50000,
      uploaded_at: new Date().toISOString(),
      description: uploadForm.description,
    };
    setDocuments([newDoc, ...documents]);
    setShowUploadModal(false);
    setUploadForm({ employee_name: '', document_type: 'contract', description: '', file_name: '' });
    showDemoToast(t('demo.documentUploaded'));
  };

  const handleDelete = (docId: string) => {
    if (!confirm(t('documents.confirmDelete'))) return;
    setDocuments(documents.filter(d => d.id !== docId));
    showDemoToast(t('demo.documentDeleted'));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filtered = documents.filter(doc => {
    const matchesEmployee = !selectedEmployee || doc.employee_name === selectedEmployee;
    const matchesSearch = !searchTerm || doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) || doc.employee_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesEmployee && matchesSearch;
  });

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
                <Link to="/preview/company-documents" className="px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400">{t('nav.documents')}</Link>
                <Link to="/preview/company-leave" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">{t('nav.leave')}</Link>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('documents.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('documents.subtitle')}</p>
          </div>
          <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
            <Upload className="w-5 h-5" />
            {t('documents.upload')}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('documents.filters.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border-none outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white">
            <option value="">{t('documents.filters.allEmployees')}</option>
            {MOCK_EMPLOYEES.map(emp => <option key={emp} value={emp}>{emp}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('documents.empty.title')}</h3>
            <p className="text-gray-600 dark:text-gray-400">{t('documents.empty.description')}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {[t('documents.columns.document'), t('documents.columns.employee'), t('documents.columns.type'), t('documents.columns.size'), t('documents.columns.date'), t('documents.columns.actions')].map((h, i) => (
                    <th key={i} className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.file_name}</p>
                          {doc.description && <p className="text-xs text-gray-500 dark:text-gray-400">{doc.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{doc.employee_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${DOCUMENT_TYPE_COLORS[doc.document_type] || DOCUMENT_TYPE_COLORS.other}`}>
                        {t(`documents.types.${doc.document_type}`, { defaultValue: doc.document_type })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{formatFileSize(doc.file_size)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => showDemoToast(t('demo.downloading'))} className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors" title={t('common.download')}>
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(doc.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={t('common.delete')}>
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
      </main>

      {demoMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-50 text-sm font-medium">{demoMessage}</div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('documents.uploadModal.title')}</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('documents.uploadModal.employee')}</label>
                <select value={uploadForm.employee_name} onChange={(e) => setUploadForm({ ...uploadForm, employee_name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white">
                  <option value="">{t('documents.uploadModal.selectEmployee')}</option>
                  {MOCK_EMPLOYEES.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('documents.uploadModal.type')}</label>
                <select value={uploadForm.document_type} onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white">
                  <option value="contract">{t('documents.types.contract')}</option>
                  <option value="payslip">{t('documents.types.payslip')}</option>
                  <option value="certificate">{t('documents.types.certificate')}</option>
                  <option value="other">{t('documents.types.other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('documents.uploadModal.description')}</label>
                <input type="text" value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder={t('documents.uploadModal.descriptionPlaceholder')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('documents.uploadModal.fileLabel')}</label>
                <div className="w-full px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center text-gray-500 dark:text-gray-400 text-sm">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  {t('documents.uploadModal.filePlaceholder')}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">{t('common.cancel')}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">{t('common.upload')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
