import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../config/supabase";
import { AlarmClockIcon } from "../components/common/AlarmClockIcon";
import { CheckCircle, XCircle, Eye, EyeOff, Mail } from "lucide-react";

interface InvitationData {
  email: string;
  employee_name: string;
  company_name: string;
  status: string;
  expires_at: string;
}

const PENDING_TOKEN_KEY = "plegohr.pendingInvitationToken";

export function AcceptInvitationPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [token] = useState(
    () => searchParams.get("token") ?? localStorage.getItem(PENDING_TOKEN_KEY),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailPending, setEmailPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const mapAcceptError = useCallback(
    (message: string): string => {
      if (message.includes("invitation_expired")) {
        return t("invitation.error.expired");
      }
      if (message.includes("invitation_email_mismatch")) {
        return t("invitation.error.emailMismatch");
      }
      if (
        message.includes("invitation_invalid") ||
        message.includes("invitation_already_used")
      ) {
        return t("invitation.error.notFound");
      }
      return t("invitation.error.unexpected");
    },
    [t],
  );

  const acceptInvitation = useCallback(
    async (activeToken: string) => {
      const { error: rpcError } = await supabase.rpc("accept_invitation", {
        p_token: activeToken,
      });

      if (rpcError) {
        console.error("accept_invitation failed:", rpcError);
        setError(mapAcceptError(rpcError.message));
        setLoading(false);
        setProcessing(false);
        return;
      }

      localStorage.removeItem(PENDING_TOKEN_KEY);
      setSuccess(true);
      setProcessing(false);
      setLoading(false);
      setTimeout(() => navigate("/employee-dashboard"), 2000);
    },
    [mapAcceptError, navigate],
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const activeToken = token;
      if (!activeToken) {
        setError(t("invitation.error.invalidLink"));
        setLoading(false);
        return;
      }

      // Already signed in (fresh signUp or confirmation-link return):
      // finish the acceptance directly.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!cancelled && sessionData.session) {
        await acceptInvitation(activeToken);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc(
        "get_invitation_by_token",
        { p_token: activeToken },
      );

      if (cancelled) return;

      const row = (Array.isArray(data) ? data[0] : data) as unknown as
        | InvitationData
        | undefined;

      if (rpcError || !row) {
        setError(t("invitation.error.notFound"));
        setLoading(false);
        return;
      }
      if (row.status !== "pending") {
        setError(t("invitation.error.notFound"));
        setLoading(false);
        return;
      }
      if (new Date(row.expires_at) < new Date()) {
        setError(t("invitation.error.expired"));
        setLoading(false);
        return;
      }

      setInvitation(row);
      setLoading(false);
    };

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!token || !invitation) return;

    if (password !== confirmPassword) {
      setFormError(t("invitation.error.passwordMismatch"));
      return;
    }
    if (password.length < 6) {
      setFormError(t("invitation.error.passwordTooShort"));
      return;
    }

    setProcessing(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: { full_name: invitation.employee_name },
          emailRedirectTo: `${window.location.origin}/accept-invitation?token=${token}`,
        },
      });

      if (signUpError) {
        const message = signUpError.message.toLowerCase();
        if (
          message.includes("already registered") ||
          message.includes("already been registered") ||
          signUpError.status === 422
        ) {
          // Account already exists: try to sign in with the provided password.
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: invitation.email,
            password,
          });
          if (signInError) {
            setFormError(t("invitation.error.accountExists"));
            setProcessing(false);
            return;
          }
          await acceptInvitation(token);
          return;
        }
        setFormError(
          t("invitation.error.createFailed", { message: signUpError.message }),
        );
        setProcessing(false);
        return;
      }

      if (!authData.session) {
        // Email confirmation is enabled: remember the token and wait for
        // the confirmation link that returns to this page.
        localStorage.setItem(PENDING_TOKEN_KEY, token);
        setEmailPending(true);
        setProcessing(false);
        return;
      }

      await acceptInvitation(token);
    } catch (err) {
      console.error("Unexpected error:", err);
      setFormError(t("invitation.error.unexpected"));
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {t("invitation.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t("invitation.invalidTitle")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t("invitation.signIn")}
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-teal-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t("common.success")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t("invitation.successAccepted")}
          </p>
          <button
            onClick={() => navigate("/employee-dashboard")}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t("invitation.goToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  if (emailPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Mail className="w-16 h-16 text-teal-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t("invitation.emailPendingTitle")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t("invitation.emailPendingText", { email: invitation?.email })}
          </p>
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t("invitation.signIn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <AlarmClockIcon className="w-16 h-16 text-teal-600 dark:text-teal-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t("invitation.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t("invitation.subtitleWithCompany", {
              company: invitation?.company_name,
            })}
          </p>
        </div>

        <div className="mb-6 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t("invitation.emailLabel")}
          </p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {invitation?.email}
          </p>
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          </div>
        )}

        <form onSubmit={handleAcceptInvitation} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("invitation.passwordLabel")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder={t("invitation.passwordPlaceholder")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("invitation.confirmLabel")}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder={t("invitation.confirmPlaceholder")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? t("invitation.submitting") : t("invitation.submit")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("invitation.alreadyAccount")}{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-teal-600 dark:text-teal-400 hover:underline font-semibold"
            >
              {t("invitation.signIn")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
