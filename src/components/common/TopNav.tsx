import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { AlarmClockIcon } from './AlarmClockIcon';

export type TopNavRole = 'admin' | 'employee';
export type TopNavActive =
  | 'dashboard'
  | 'time-tracking'
  | 'time-corrections'
  | 'documents'
  | 'leave'
  | 'settings';

interface TopNavProps {
  role: TopNavRole;
  active: TopNavActive;
}

interface NavItem {
  key: TopNavActive;
  label: string;
  to: string;
}

const ADMIN_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'nav.dashboard', to: '/dashboard' },
  { key: 'time-tracking', label: 'nav.timeTracking', to: '/time-tracking' },
  { key: 'time-corrections', label: 'nav.timeCorrections', to: '/time-corrections' },
  { key: 'documents', label: 'nav.documents', to: '/documents' },
  { key: 'leave', label: 'nav.leave', to: '/leave' },
  { key: 'settings', label: 'nav.settings', to: '/settings' },
];

const EMPLOYEE_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'nav.dashboard', to: '/employee-dashboard' },
  { key: 'documents', label: 'nav.documents', to: '/employee-documents' },
  { key: 'leave', label: 'nav.leave', to: '/employee-leave' },
];

export function TopNav({ role, active }: TopNavProps) {
  const { t } = useTranslation();
  const { signOut, companyId } = useAuth();
  const navigate = useNavigate();
  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    logo_path: string | null;
  } | null>(null);

  // Company brand shown on every authenticated page; refreshed when the
  // settings page saves changes (custom event) as well.
  useEffect(() => {
    if (!companyId) {
      setCompanyInfo(null);
      return;
    }
    let cancelled = false;

    const loadCompany = () => {
      supabase
        .from('companies')
        .select('name, logo_path')
        .eq('id', companyId)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setCompanyInfo(data);
        });
    };

    loadCompany();
    window.addEventListener('company-updated', loadCompany);
    return () => {
      cancelled = true;
      window.removeEventListener('company-updated', loadCompany);
    };
  }, [companyId]);

  const companyLogoUrl = companyInfo?.logo_path
    ? supabase.storage.from('company-logos').getPublicUrl(companyInfo.logo_path).data.publicUrl
    : null;

  const items = role === 'admin' ? ADMIN_ITEMS : EMPLOYEE_ITEMS;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6">
            <Link to={role === 'admin' ? '/dashboard' : '/employee-dashboard'} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt={companyInfo?.name ?? ''}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <AlarmClockIcon className="w-8 h-8 text-teal-600 dark:text-teal-400" />
              )}
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {companyInfo?.name ?? 'PlegoHR'}
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-2">
              {items.map((item) => {
                const isActive = item.key === active;
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.to)}
                    className={
                      isActive
                        ? 'px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400'
                        : 'px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors'
                    }
                  >
                    {t(item.label)}
                  </button>
                );
              })}
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
  );
}
