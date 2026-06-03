import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../config/supabase";
import { AlarmClockIcon } from "../components/common/AlarmClockIcon";
import { CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

interface InvitationData {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  employee_id: string;
}

export function AcceptInvitationPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (token) {
      loadInvitation();
    } else {
      setError(t("invitation.error.invalidLink"));
      setLoading(false);
    }
  }, [token]);

  const loadInvitation = async () => {
    try {
      const { data, error: invitationError } = await supabase
        .from("employee_invitations")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .maybeSingle();

      if (invitationError || !data) {
        setError(t("invitation.error.notFound"));
        setLoading(false);
        return;
      }

      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        setError(t("invitation.error.expired"));
        setLoading(false);
        return;
      }

      setInvitation(data);
      setLoading(false);
    } catch (err) {
      console.error("Error loading invitation:", err);
      setError(t("invitation.error.notFound"));
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password !== confirmPassword) {
      setFormError(t("invitation.error.passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      setFormError(t("invitation.error.passwordTooShort"));
      return;
    }

    if (!invitation) return;

    setProcessing(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        {
          email: invitation.email,
          password: password,
        },
      );

      if (signUpError) {
        setFormError(
          t("invitation.error.createFailed", { message: signUpError.message }),
        );
        setProcessing(false);
        return;
      }

      if (!authData.user) {
        setFormError(t("invitation.error.createAccountFailed"));
        setProcessing(false);
        return;
      }

      // Wait a bit for the profile to be created by the trigger
      await new Promise(resolve => setTimeout(resolve, 500));

      const { error: updateInvitationError } = await supabase
        .from("employee_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      if (updateInvitationError) {
        console.error("Error updating invitation:", updateInvitationError);
      }

      const { error: updateEmployeeError } = await supabase
        .from("employees")
        .update({ user_id: authData.user.id })
        .eq("id", invitation.employee_id);

      if (updateEmployeeError) {
        console.error("Error linking employee:", updateEmployeeError);
      }

      // Get the employee's company_id to set in profile
      const { data: employeeData } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', invitation.employee_id)
        .maybeSingle();

      if (employeeData) {
        const { error: updateUserError } = await supabase
          .from('users')
          .update({
            type: 'employee',
            company_id: employeeData.company_id,
          })
          .eq('id', authData.user.id);

        if (updateUserError) {
          console.error('Error updating user record:', updateUserError);
        }
      }

      setSuccess(true);
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
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t("invitation.goHome")}
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
          <p className="text-gray-600 dark:text-gray-400">
            {t("invitation.success")}
          </p>
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
            {t("invitation.subtitle")}
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
