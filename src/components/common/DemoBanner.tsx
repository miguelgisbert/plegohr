import { Link } from 'react-router-dom';
import { Eye, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DemoBanner() {
  const { t } = useTranslation();

  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">{t('demo.banner')}</span>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('demo.back')}
        </Link>
      </div>
    </div>
  );
}
