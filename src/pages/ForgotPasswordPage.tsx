import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { AlarmClockIcon } from '../components/common/AlarmClockIcon';
import { Navigation } from '../components/landing/Navigation';
import { Mail, ArrowLeft } from 'lucide-react';
import { getErrorMessage } from '../utils/errorUtils';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(getErrorMessage(resetError, t, 'common.errors.networkError', 'auth.forgotPassword.errors.sendFailed'));
        setLoading(false);
      } else {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(getErrorMessage(err, t, 'common.errors.networkError', 'auth.forgotPassword.errors.unexpected'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 dark:from-gray-800 dark:via-slate-800 dark:to-gray-850 flex flex-col overflow-hidden">
      <div className="absolute top-20 right-10 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10 animate-blob"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000"></div>
      <Navigation />

      <div className="flex-1 flex items-center justify-center p-4 pt-24 relative z-10">
        <div className="w-full max-w-md">
          {!submitted ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('auth.forgotPassword.title')}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {t('auth.forgotPassword.subtitle')}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                {error && (
                  <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('auth.login.email')}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder={t('auth.forgotPassword.emailPlaceholder')}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Mail className="w-5 h-5" />
                    {loading ? t('common.loading') : t('auth.forgotPassword.button')}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                  <Link to="/login" className="text-teal-600 dark:text-teal-400 font-medium hover:underline flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
{t('auth.forgotPassword.backToLogin')}
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('auth.forgotPassword.checkEmail')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('auth.forgotPassword.emailSent')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t('auth.forgotPassword.linkExpires')}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('auth.forgotPassword.backToLogin')}
              </Link>
            </div>
          )}
        </div>
      </div>

      <footer className="py-6 px-4 bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlarmClockIcon className="w-5 h-5 text-teal-400" />
            <span className="text-lg font-bold text-white">PlegoHR</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} PlegoHR. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
