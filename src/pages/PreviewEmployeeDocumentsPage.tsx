import { FileText, Download, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlarmClockIcon } from '../components/common/AlarmClockIcon';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { DemoBanner } from '../components/common/DemoBanner';

interface MockDocument {
  id: string;
  file_name: string;
  document_type: string;
  file_size: number;
  uploaded_at: string;
  description: string;
  signed: boolean;
}

const MOCK_MY_DOCUMENTS: MockDocument[] = [
  { id: '1', file_name: 'contract_maria_garcia.pdf', document_type: 'contract', file_size: 245760, uploaded_at: '2025-01-15T10:30:00Z', description: 'Permanent contract — Signature required', signed: false },
  { id: '2', file_name: 'payslip_february_2025.pdf', document_type: 'payslip', file_size: 102400, uploaded_at: '2025-03-01T09:00:00Z', description: 'Payslip February 2025', signed: true },
  { id: '3', file_name: 'payslip_january_2025.pdf', document_type: 'payslip', file_size: 98304, uploaded_at: '2025-02-01T09:00:00Z', description: 'Payslip January 2025', signed: true },
  { id: '4', file_name: 'tax_certificate_2024.pdf', document_type: 'certificate', file_size: 155648, uploaded_at: '2025-01-20T08:30:00Z', description: 'Income tax certificate 2024', signed: true },
  { id: '5', file_name: 'payslip_december_2024.pdf', document_type: 'payslip', file_size: 101376, uploaded_at: '2025-01-03T09:00:00Z', description: 'Payslip December 2024', signed: true },
];

const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  contract: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  payslip: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  certificate: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
};

export function PreviewEmployeeDocumentsPage() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<MockDocument[]>(MOCK_MY_DOCUMENTS);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<MockDocument | null>(null);

  const showDemoToast = (msg: string) => {
    setDemoMessage(msg);
    setTimeout(() => setDemoMessage(null), 2500);
  };

  const handleSign = (docId: string) => {
    setDocuments(documents.map(d => d.id === docId ? { ...d, signed: true } : d));
    setPreviewDoc(null);
    showDemoToast(t('demo.documentSigned'));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pendingSignature = documents.filter(d => !d.signed);
  const allDocs = documents;

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
                <Link to="/preview/employee-documents" className="px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400">{t('nav.documents')}</Link>
                <Link to="/preview/employee-leave" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">{t('nav.leave')}</Link>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('documents.myTitle')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('documents.mySubtitle')}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{allDocs.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('documents.stats.total')}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-amber-500">{pendingSignature.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('documents.stats.pendingSignature')}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{allDocs.filter(d => d.signed).length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('documents.stats.signed')}</p>
          </div>
        </div>

        {pendingSignature.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              {t('documents.pendingSignatureSection')}
            </h2>
            <div className="space-y-3">
              {pendingSignature.map((doc) => (
                <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-amber-500 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-8 h-8 text-amber-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{doc.file_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{doc.description}</p>
                    </div>
                  </div>
                  <button onClick={() => setPreviewDoc(doc)} className="flex items-center gap-1 px-3 py-1.5 border border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-sm font-medium flex-shrink-0">
                    <Eye className="w-4 h-4" />
                    {t('documents.viewAndSign')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('documents.allDocuments')}</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {[t('documents.columns.document'), t('documents.columns.type'), t('documents.columns.size'), t('documents.columns.date'), t('documents.columns.status'), t('documents.columns.actions')].map((h, i) => (
                    <th key={i} className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {allDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.file_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{doc.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${DOCUMENT_TYPE_COLORS[doc.document_type] || DOCUMENT_TYPE_COLORS.other}`}>
                        {t(`documents.types.${doc.document_type}`, { defaultValue: doc.document_type })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{formatFileSize(doc.file_size)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doc.signed
                        ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">{t('documents.status.signed')}</span>
                        : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">{t('documents.status.pending')}</span>
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setPreviewDoc(doc)} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title={t('common.review')}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => showDemoToast(t('demo.downloading'))} className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors" title={t('common.download')}>
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {demoMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-50 text-sm font-medium">{demoMessage}</div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{previewDoc.file_name}</h3>
              <button onClick={() => setPreviewDoc(null)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg">✕</button>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg h-64 flex items-center justify-center mb-6">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-2" />
                <p className="text-sm">{t('documents.previewTitle')}</p>
                <p className="text-xs mt-1">{previewDoc.description}</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <button onClick={() => showDemoToast(t('demo.downloading'))} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Download className="w-4 h-4" />
                {t('common.download')}
              </button>
              <div className="flex gap-3">
                <button onClick={() => setPreviewDoc(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900">{t('common.cancel')}</button>
                {!previewDoc.signed && (
                  <button onClick={() => handleSign(previewDoc.id)} className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold">
                    ✓ {t('documents.viewAndSign')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
