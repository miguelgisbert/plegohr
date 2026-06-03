import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AlarmClockIcon } from "../components/common/AlarmClockIcon";
import { FileText, BarChart3, Globe, Check } from "lucide-react";
import { Navigation } from "../components/landing/Navigation";

export function LandingPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [authFeedback, setAuthFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const hashTarget = location.hash.slice(1);

    if (!/^[A-Za-z][\w-]*$/.test(hashTarget)) {
      return;
    }

    const element = document.getElementById(hashTarget);

    if (element) {
      setTimeout(() => {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [location]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const hashParams = location.hash.startsWith("#")
      ? new URLSearchParams(location.hash.slice(1))
      : new URLSearchParams();

    const errorCode =
      hashParams.get("error_code") || queryParams.get("error_code");
    const authType = hashParams.get("type");
    const hasAccessToken = hashParams.has("access_token");

    if (errorCode === "otp_expired") {
      setAuthFeedback({
        type: "error",
        message: t("auth.confirmation.linkExpired"),
      });
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
      return;
    }

    if (authType === "signup" && hasAccessToken) {
      setAuthFeedback({
        type: "success",
        message: t("auth.confirmation.success"),
      });
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, [location.hash, location.search, t]);

  const features = [
    {
      icon: AlarmClockIcon,
      title: t("landing.features.timeTracking.title"),
      description: t("landing.features.timeTracking.description"),
    },
    {
      icon: FileText,
      title: t("landing.features.documents.title"),
      description: t("landing.features.documents.description"),
    },
    {
      icon: BarChart3,
      title: t("landing.features.reports.title"),
      description: t("landing.features.reports.description"),
    },
    {
      icon: Globe,
      title: t("landing.features.multilingual.title"),
      description: t("landing.features.multilingual.description"),
    },
  ];

  const pricingPlans = [
    {
      name: t("landing.pricing.free.name"),
      price: t("landing.pricing.free.price"),
      period: t("landing.pricing.free.period"),
      features: t("landing.pricing.free.features", {
        returnObjects: true,
      }) as string[],
      cta: t("landing.pricing.free.cta"),
      highlighted: false,
    },
    {
      name: t("landing.pricing.professional.name"),
      price: t("landing.pricing.professional.price"),
      period: t("landing.pricing.professional.period"),
      features: t("landing.pricing.professional.features", {
        returnObjects: true,
      }) as string[],
      cta: t("landing.pricing.professional.cta"),
      highlighted: true,
    },
    {
      name: t("landing.pricing.enterprise.name"),
      price: t("landing.pricing.enterprise.price"),
      period: t("landing.pricing.enterprise.period"),
      features: t("landing.pricing.enterprise.features", {
        returnObjects: true,
      }) as string[],
      cta: t("landing.pricing.enterprise.cta"),
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navigation />

      <section className="relative pt-40 pb-32 px-4 overflow-hidden bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-gray-800 dark:via-gray-850 dark:to-slate-800">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-teal-400 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10 animate-blob"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000"></div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          {authFeedback && (
            <div
              className={`mb-6 mx-auto max-w-3xl p-4 rounded-lg border text-left ${
                authFeedback.type === "success"
                  ? "bg-green-100 dark:bg-green-900/20 border-green-400 dark:border-green-800 text-green-800 dark:text-green-300"
                  : "bg-red-100 dark:bg-red-900/20 border-red-400 dark:border-red-800 text-red-800 dark:text-red-300"
              }`}
            >
              <p className="text-sm md:text-base">{authFeedback.message}</p>
            </div>
          )}

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            {t('landing.hero.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            {t("landing.hero.subtitle")}
          </p>
          <div className="flex gap-4 justify-center flex-wrap mb-12">
            <Link
              to="/signup"
              className="px-8 py-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              {t("landing.hero.cta")}
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-semibold text-lg border-2 border-gray-200 dark:border-gray-600 shadow-md hover:shadow-lg transform hover:-translate-y-1"
            >
              {t("landing.hero.learnMore")}
            </a>
          </div>
          <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              {t("landing.preview.title")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Link
                to="/preview/company-dashboard"
                className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-lg hover:shadow-lg transition-all duration-200 border-2 border-teal-200 dark:border-teal-800 hover:border-teal-400 dark:hover:border-teal-600 text-center"
              >
                <div className="text-sm font-semibold text-teal-900 dark:text-teal-100 mb-1">
                  {t("landing.preview.company")}
                </div>
                <div className="text-xs text-teal-700 dark:text-teal-300">
                  {t("landing.preview.dashboard")}
                </div>
              </Link>
              <Link
                to="/preview/company-documents"
                className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-lg hover:shadow-lg transition-all duration-200 border-2 border-teal-200 dark:border-teal-800 hover:border-teal-400 dark:hover:border-teal-600 text-center"
              >
                <div className="text-sm font-semibold text-teal-900 dark:text-teal-100 mb-1">
                  {t("landing.preview.company")}
                </div>
                <div className="text-xs text-teal-700 dark:text-teal-300">
                  {t("landing.preview.documents")}
                </div>
              </Link>
              <Link
                to="/preview/company-leave"
                className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-lg hover:shadow-lg transition-all duration-200 border-2 border-teal-200 dark:border-teal-800 hover:border-teal-400 dark:hover:border-teal-600 text-center"
              >
                <div className="text-sm font-semibold text-teal-900 dark:text-teal-100 mb-1">
                  {t("landing.preview.company")}
                </div>
                <div className="text-xs text-teal-700 dark:text-teal-300">
                  {t("landing.preview.leave")}
                </div>
              </Link>
              <Link
                to="/preview/employee-dashboard"
                className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg hover:shadow-lg transition-all duration-200 border-2 border-cyan-200 dark:border-cyan-800 hover:border-cyan-400 dark:hover:border-cyan-600 text-center"
              >
                <div className="text-sm font-semibold text-cyan-900 dark:text-cyan-100 mb-1">
                  {t("landing.preview.employee")}
                </div>
                <div className="text-xs text-cyan-700 dark:text-cyan-300">
                  {t("landing.preview.dashboard")}
                </div>
              </Link>
              <Link
                to="/preview/employee-documents"
                className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg hover:shadow-lg transition-all duration-200 border-2 border-cyan-200 dark:border-cyan-800 hover:border-cyan-400 dark:hover:border-cyan-600 text-center"
              >
                <div className="text-sm font-semibold text-cyan-900 dark:text-cyan-100 mb-1">
                  {t("landing.preview.employee")}
                </div>
                <div className="text-xs text-cyan-700 dark:text-cyan-300">
                  {t("landing.preview.documents")}
                </div>
              </Link>
              <Link
                to="/preview/employee-leave"
                className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg hover:shadow-lg transition-all duration-200 border-2 border-cyan-200 dark:border-cyan-800 hover:border-cyan-400 dark:hover:border-cyan-600 text-center"
              >
                <div className="text-sm font-semibold text-cyan-900 dark:text-cyan-100 mb-1">
                  {t("landing.preview.employee")}
                </div>
                <div className="text-xs text-cyan-700 dark:text-cyan-300">
                  {t("landing.preview.leave")}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="py-28 px-4 bg-gray-50 dark:bg-gray-800/50"
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
            {t("landing.features.title")}
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            {t('landing.features.subtitle')}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:-translate-y-1"
              >
                <div className="w-14 h-14 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-28 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
            {t("landing.pricing.title")}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 text-center mb-12">
            {t("landing.pricing.subtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`p-8 rounded-xl ${
                  plan.highlighted
                    ? "bg-teal-600 text-white shadow-2xl scale-105"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                }`}
              >
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span
                    className={`ml-1 ${plan.highlighted ? "text-blue-100" : "text-gray-600 dark:text-gray-400"}`}
                  >
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-2">
                      <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`block w-full py-3 px-6 rounded-lg text-center font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-white text-teal-600 hover:bg-gray-100"
                      : "bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 px-4 bg-gradient-to-r from-teal-600 to-emerald-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            {t("landing.cta.title")}
          </h2>
          <p className="text-xl text-teal-100 mb-8">
            {t("landing.cta.subtitle")}
          </p>
          <Link
            to="/signup"
            className="inline-block px-8 py-4 bg-white text-teal-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg"
          >
            {t("landing.cta.button")}
          </Link>
        </div>
      </section>

      <footer className="py-12 px-4 bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <AlarmClockIcon className="w-6 h-6 text-teal-400" />
            <span className="text-xl font-bold text-white">PlegoHR</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} PlegoHR. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
