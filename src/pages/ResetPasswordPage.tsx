import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { AlarmClockIcon } from '../components/common/AlarmClockIcon';
import { Navigation } from '../components/landing/Navigation';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [validToken, setValidToken] = useState(true);

  useEffect(() => {
    // Verify that we have a hash token (Supabase puts recovery token in hash)
    const hash = window.location.hash;
    if (!hash || !hash.includes('type=recovery')) {
      setValidToken(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.resetPassword.passwordMismatch') || 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError(t('auth.resetPassword.passwordTooShort') || 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Supabase automatically extracts token from URL hash
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || 'Failed to update password');
        setLoading(false);
      } else {
        setSubmitted(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
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
          {!validToken ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('auth.resetPassword.invalidLink') || 'Invalid Reset Link'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('auth.resetPassword.invalidLinkMessage') || 'This password reset link is invalid or has expired.'}
              </p>
              <button
                onClick={() => navigate('/forgot-password')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold"
              >
                {t('auth.resetPassword.requestNewLink') || 'Request New Link'}
              </button>
            </div>
          ) : !submitted ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('auth.resetPassword.title') || 'Reset Password'}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {t('auth.resetPassword.subtitle') || 'Enter your new password below'}
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
                      {t('auth.signup.password') || 'Password'}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="At least 6 characters"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('auth.signup.confirmPassword') || 'Confirm Password'}
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Confirm your password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Lock className="w-5 h-5" />
                    {loading ? t('common.loading') || 'Loading...' : t('auth.resetPassword.button') || 'Reset Password'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('auth.resetPassword.success') || 'Password Reset Successful'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('auth.resetPassword.successMessage') || 'Your password has been reset successfully. You will be redirected to the login page shortly.'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('auth.resetPassword.redirecting') || 'Redirecting in 2 seconds...'}
              </p>
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
