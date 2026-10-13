import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Building2, Image, Mail, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import { TopNav } from "../components/common/TopNav";
import { getErrorMessage } from "../utils/errorUtils";
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_PLACEHOLDERS,
  EMAIL_TEMPLATE_TYPES,
  EmailTemplateType,
} from "../constants/emailTemplates";

interface CompanyRow {
  id: string;
  name: string;
  logo_path: string | null;
}

interface TemplateContent {
  subject: string;
  body: string;
}

type SaveMessage = { type: "success" | "error"; text: string } | null;

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg"];

export function CompanySettingsPage() {
  const { t } = useTranslation();
  const { companyId, signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyRow | null>(null);

  // Profile (name)
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<SaveMessage>(null);

  // Profile (logo)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Email templates
  const [templates, setTemplates] =
    useState<Record<EmailTemplateType, TemplateContent>>(DEFAULT_EMAIL_TEMPLATES);
  const [savingTemplate, setSavingTemplate] = useState<EmailTemplateType | null>(null);
  const [templateMessages, setTemplateMessages] = useState<
    Record<EmailTemplateType, SaveMessage>
  >({ invitation: null, payslip: null, contract: null });

  // Danger zone
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    (async () => {
      const [{ data: companyRow }, { data: templateRows }] = await Promise.all([
        supabase
          .from("companies")
          .select("id, name, logo_path")
          .eq("id", companyId)
          .maybeSingle(),
        supabase
          .from("email_templates")
          .select("template_type, subject, body")
          .eq("company_id", companyId),
      ]);

      if (cancelled) return;

      setCompany(companyRow ?? null);
      if (companyRow) setName(companyRow.name);

      const nextTemplates: Record<EmailTemplateType, TemplateContent> = {
        ...DEFAULT_EMAIL_TEMPLATES,
      };
      const typedRows = (templateRows ?? []) as {
        template_type: EmailTemplateType;
        subject: string;
        body: string;
      }[];
      for (const row of typedRows) {
        nextTemplates[row.template_type] = {
          subject: row.subject,
          body: row.body,
        };
      }
      setTemplates(nextTemplates);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const currentLogoUrl = company?.logo_path
    ? supabase.storage.from("company-logos").getPublicUrl(company.logo_path).data
        .publicUrl
    : null;

  const notifyTopNav = () => {
    window.dispatchEvent(new Event("company-updated"));
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === company?.name) return;

    setSavingName(true);
    setNameMessage(null);

    const { error } = await supabase
      .from("companies")
      .update({ name: trimmed })
      .eq("id", companyId);

    setSavingName(false);
    if (error) {
      setNameMessage({
        type: "error",
        text: getErrorMessage(
          error,
          t,
          "common.errors.networkError",
          "settings.profile.errors.saveFailed",
        ),
      });
      return;
    }

    setCompany((prev) => (prev ? { ...prev, name: trimmed } : prev));
    setNameMessage({ type: "success", text: t("settings.profile.saved") });
    notifyTopNav();
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setLogoError("");
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!LOGO_EXTENSIONS.includes(extension)) {
      setLogoError(t("settings.profile.errors.logoType"));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError(t("settings.profile.errors.logoSize"));
      return;
    }

    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!companyId || !logoFile) return;

    setUploadingLogo(true);
    setLogoError("");

    try {
      // Remove any previous logo files so only one file exists per company.
      const { data: existingFiles } = await supabase.storage
        .from("company-logos")
        .list(companyId, { limit: 100 });
      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from("company-logos")
          .remove(existingFiles.map((f) => `${companyId}/${f.name}`));
      }

      const extension = logoFile.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${companyId}/logo.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(path, logoFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_path: path })
        .eq("id", companyId);
      if (updateError) throw updateError;

      setCompany((prev) => (prev ? { ...prev, logo_path: path } : prev));
      setLogoFile(null);
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
        setLogoPreviewUrl(null);
      }
      notifyTopNav();
    } catch (err) {
      setLogoError(
        getErrorMessage(
          err,
          t,
          "common.errors.networkError",
          "settings.profile.errors.logoUploadFailed",
        ),
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleTemplateChange = (
    templateType: EmailTemplateType,
    field: "subject" | "body",
    value: string,
  ) => {
    setTemplates((prev) => ({
      ...prev,
      [templateType]: { ...prev[templateType], [field]: value },
    }));
  };

  const handleSaveTemplate = async (templateType: EmailTemplateType) => {
    if (!companyId) return;

    setSavingTemplate(templateType);
    setTemplateMessages((prev) => ({ ...prev, [templateType]: null }));

    const { subject, body } = templates[templateType];
    const { error } = await supabase.from("email_templates").upsert(
      {
        company_id: companyId,
        template_type: templateType,
        subject: subject.trim(),
        body,
      },
      { onConflict: "company_id,template_type" },
    );

    setSavingTemplate(null);
    setTemplateMessages((prev) => ({
      ...prev,
      [templateType]: error
        ? {
            type: "error",
            text: getErrorMessage(
              error,
              t,
              "common.errors.networkError",
              "settings.templates.errors.saveFailed",
            ),
          }
        : { type: "success", text: t("settings.templates.saved") },
    }));
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || deleteConfirmName.trim() !== company.name) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const { error } = await supabase.functions.invoke("delete-company-account");
      if (error) throw error;
    } catch (err) {
      setDeleteError(
        getErrorMessage(
          err,
          t,
          "common.errors.networkError",
          "settings.danger.errors.deleteFailed",
        ),
      );
      setDeleting(false);
      return;
    }

    try {
      await signOut();
    } catch {
      // The auth user may already be gone server-side; continue anyway.
    }
    navigate("/", { replace: true });
  };

  if (loading || !company) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <TopNav role="admin" active="settings" />
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopNav role="admin" active="settings" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          {t("settings.title")}
        </h1>

        {/* Company profile */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("settings.profile.title")}
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 mb-6">
            <div className="flex-shrink-0">
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("settings.profile.logo")}
              </p>
              <div className="w-24 h-24 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : currentLogoUrl ? (
                  <img
                    src={currentLogoUrl}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image className="w-8 h-8 text-gray-400" />
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("settings.profile.logoHint")}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoFileChange}
                  className="block text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-teal-900/30 dark:file:text-teal-300"
                />
                {logoFile && (
                  <button
                    onClick={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold disabled:opacity-50"
                  >
                    {uploadingLogo ? t("common.loading") : t("settings.profile.uploadLogo")}
                  </button>
                )}
              </div>
              {logoError && (
                <p className="text-sm text-red-600 dark:text-red-400">{logoError}</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row gap-3 items-start">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("settings.profile.companyName")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={savingName || !name.trim() || name.trim() === company.name}
              className="mt-6 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingName ? t("common.loading") : t("common.save")}
            </button>
          </form>
          {nameMessage && (
            <p
              className={
                nameMessage.type === "error"
                  ? "mt-3 text-sm text-red-600 dark:text-red-400"
                  : "mt-3 text-sm text-green-600 dark:text-green-400"
              }
            >
              {nameMessage.text}
            </p>
          )}
        </section>

        {/* Email templates */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("settings.templates.title")}
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t("settings.templates.subtitle")}
          </p>

          <div className="space-y-8">
            {EMAIL_TEMPLATE_TYPES.map((templateType) => (
              <div
                key={templateType}
                className="border-t border-gray-100 dark:border-gray-700 pt-6 first:border-t-0 first:pt-0"
              >
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  {t(`settings.templates.types.${templateType}.title`)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {t(`settings.templates.types.${templateType}.description`)}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {EMAIL_TEMPLATE_PLACEHOLDERS[templateType].map((placeholder) => (
                    <code
                      key={placeholder}
                      className="px-1.5 py-0.5 text-xs rounded bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                    >
                      {placeholder}
                    </code>
                  ))}
                </div>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("settings.templates.subject")}
                </label>
                <input
                  type="text"
                  value={templates[templateType].subject}
                  onChange={(e) =>
                    handleTemplateChange(templateType, "subject", e.target.value)
                  }
                  className="w-full px-4 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                />

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("settings.templates.body")}
                </label>
                <textarea
                  value={templates[templateType].body}
                  onChange={(e) =>
                    handleTemplateChange(templateType, "body", e.target.value)
                  }
                  rows={8}
                  className="w-full px-4 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm font-mono"
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSaveTemplate(templateType)}
                    disabled={savingTemplate === templateType}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold disabled:opacity-50"
                  >
                    {savingTemplate === templateType
                      ? t("common.loading")
                      : t("common.save")}
                  </button>
                  {templateMessages[templateType] && (
                    <span
                      className={
                        templateMessages[templateType]!.type === "error"
                          ? "text-sm text-red-600 dark:text-red-400"
                          : "text-sm text-green-600 dark:text-green-400"
                      }
                    >
                      {templateMessages[templateType]!.text}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/50 p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("settings.danger.title")}
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t("settings.danger.description")}
          </p>

          {deleteError && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {deleteError}
            </div>
          )}

          <form onSubmit={handleDeleteAccount} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("settings.danger.confirmLabel", { name: company.name })}
              </label>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={company.name}
                className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={deleting || deleteConfirmName.trim() !== company.name}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? t("common.loading") : t("settings.danger.deleteButton")}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
