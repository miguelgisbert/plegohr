import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle } from "lucide-react";
import { supabase } from "../config/supabase";

type Status = "processing" | "success" | "error";

// Landing page for the OAuth popup: supabase-js (detectSessionInUrl) stores
// the session in localStorage on load, the parent tab picks it up via
// onAuthStateChange, and this popup closes itself.
export function AuthCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let settled = false;

    const params = new URLSearchParams(window.location.search);
    const providerError =
      params.get("error_description") || params.get("error") || "";

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (settled) return;
      settled = true;
      if (session) {
        setStatus("success");
        setTimeout(() => {
          window.close();
          // Full-page fallback (popup blocked): send to /login, which
          // redirects to the right dashboard once the role resolves.
          setTimeout(() => {
            if (!window.closed) {
              navigate("/login", { replace: true });
            }
          }, 300);
        }, 1500);
      } else {
        setErrorMessage(providerError);
        setStatus("error");
      }
    });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setErrorMessage("");
        setStatus("error");
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center px-4">
        {status === "processing" && (
          <>
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              {t("common.loading")}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-teal-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {t("auth.oauth.callback.success")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("auth.oauth.callback.closing")}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              {t("auth.oauth.callback.manualClose")}
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {t("auth.oauth.callback.error")}
            </p>
            {errorMessage && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {errorMessage}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
