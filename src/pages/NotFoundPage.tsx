import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center px-4">
        <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-700 select-none">
          404
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mt-4 mb-8">
          {t('common.pageNotFound')}
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          {t('common.goHome')}
        </Link>
      </div>
    </div>
  );
}
