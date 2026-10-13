import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../utils/errorUtils";

// Where users who registered without a company (social login) pick a company
// name. Self-registration on the web always creates a company; employees only
// join through the invitation flow.
export function CompanyOnboardingPage() {
  const { t } = useTranslation();
  const { session, role, loading, completeCompanySetup } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate("/login", { replace: true });
    } else if (role === "admin") {
      navigate("/dashboard", { replace: true });
    } else if (role === "employee") {
      navigate("/employee-dashboard", { replace: true });
    }
  }, [loading, session, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await completeCompanySetup(companyName);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t,
          "common.errors.networkError",
          "auth.onboarding.errors.createFailed",
        ),
      );
      setSubmitting(false);
    }
  };

  if (loading || !session || role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 dark:from-gray-800 dark:via-slate-800 dark:to-gray-850 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t("auth.onboarding.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t("auth.onboarding.subtitle")}
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
                {t("auth.signup.companyName")}
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t("common.loading") : t("auth.onboarding.button")}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            {t("auth.onboarding.invitedHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
