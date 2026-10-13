import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { AlarmClockIcon } from '../components/common/AlarmClockIcon';
import { Navigation } from '../components/landing/Navigation';
import { Eye, EyeOff } from 'lucide-react';
import { getErrorMessage } from '../utils/errorUtils';

export function LoginPage() {
  const { t } = useTranslation();
  const { signIn, signInWithGoogle, signInWithLinkedIn, session, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // After a social login the session arrives via onAuthStateChange (popup
  // flow), so navigate here instead of in the button handlers.
  useEffect(() => {
    if (role === 'admin') {
      navigate('/dashboard', { replace: true });
    } else if (role === 'employee') {
      navigate('/employee-dashboard', { replace: true });
    }
  }, [role, navigate]);

  // Signed in but not linked to any company yet (fresh signup): self
  // registration always creates a company, so continue at the onboarding step.
  // Small delay so the role can resolve first and we don't flash this for
  // users who already belong to a company.
  useEffect(() => {
    if (authLoading || !session || role) return;
    const timer = setTimeout(
      () => navigate('/company-onboarding', { replace: true }),
      800,
    );
    return () => clearTimeout(timer);
  }, [authLoading, session, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const signedInRole = await signIn(email, password);
      if (signedInRole === 'admin') {
        navigate('/dashboard');
      } else if (signedInRole === 'employee') {
        navigate('/employee-dashboard');
      }
      // role null (no company yet): stay on login, ProtectedRoute guards the rest
      setLoading(false);
    } catch (err) {
      setError(getErrorMessage(err, t, 'common.errors.networkError', 'auth.login.errors.signInFailed'));
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(getErrorMessage(err, t, 'common.errors.networkError', 'auth.login.errors.googleSignInFailed'));
    }
  };

  const handleLinkedInSignIn = async () => {
    try {
      await signInWithLinkedIn();
    } catch (err) {
      setError(getErrorMessage(err, t, 'common.errors.networkError', 'auth.login.errors.linkedinSignInFailed'));
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
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('auth.login.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">{t('auth.login.subtitle')}</p>
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.login.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Link
                to="/forgot-password"
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline mt-1 inline-block"
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('common.loading') : t('auth.login.button')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {t('auth.login.orContinueWith')}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
              >
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-sm font-medium">{t('auth.login.google')}</span>
              </button>

              <button
                onClick={handleLinkedInSignIn}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
              >
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <span className="text-sm font-medium">{t('auth.login.linkedin')}</span>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('auth.login.noAccount')}{' '}
            <Link to="/signup" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
              {t('auth.login.signUpLink')}
            </Link>
          </p>
          </div>
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
