import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import {
  Clock,
  FileText,
  BarChart3,
  Users,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Send,
} from "lucide-react";
import { LanguageSwitcher } from "../components/common/LanguageSwitcher";
import { ThemeToggle } from "../components/common/ThemeToggle";
import { AlarmClockIcon } from "../components/common/AlarmClockIcon";
import { Toast } from "../components/common/Toast";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../config/supabase";

interface Company {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
  position: string;
  department: string | null;
  status: string;
}

interface ToastMessage {
  message: string;
  type: "success" | "error" | "info";
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [inviteData, setInviteData] = useState({
    email: "",
    fullName: "",
    position: "",
    department: "",
  });
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (user) {
      loadCompanyData();
    }
  }, [user]);

  const loadCompanyData = async () => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error loading profile:", profileError);
        return;
      }

      if (!profile?.company_id) {
        console.log("No company_id found in profile");
        return;
      }

      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", profile.company_id)
        .maybeSingle();

      if (companyError) {
        console.error("Error loading company:", companyError);
        return;
      }

      setCompany(companyData);

      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (employeesError) {
        console.error("Error loading employees:", employeesError);
      } else {
        setEmployees(employeesData || []);
      }
    } catch (err) {
      console.error("Unexpected error loading company data:", err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
  };

  const sendInvitationEmail = async (employeeId: string, email: string) => {
    if (!company) {
      throw new Error("Missing company");
    }

    const { error } = await supabase.functions.invoke(
      "send-employee-invitation",
      {
        body: {
          employeeId,
          email,
          companyName: company.name,
          appUrl: import.meta.env.VITE_APP_URL || window.location.origin,
        },
      },
    );

    if (error) {
      throw error;
    }
  };

  const handleInviteEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company) {
      showToast(t("employees.toast.noCompany"), "error");
      return;
    }

    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .insert({
          company_id: company.id,
          full_name: inviteData.fullName,
          email: inviteData.email,
          position: inviteData.position,
          department: inviteData.department || null,
          status: "active",
        })
        .select()
        .single();

      if (employeeError) {
        console.error("Error creating employee:", employeeError);
        showToast(
          t("employees.toast.addFailed", { error: employeeError.message }),
          "error",
        );
        return;
      }

      try {
        await sendInvitationEmail(employeeData.id, inviteData.email);
        showToast(t("employees.toast.added"), "success");
      } catch (invitationError) {
        console.error("Error sending invitation email:", invitationError);
        showToast(t("employees.toast.invitationFailed"), "error");
      }

      setShowInviteModal(false);
      setInviteData({ email: "", fullName: "", position: "", department: "" });
      await loadCompanyData();
    } catch (err) {
      console.error("Unexpected error:", err);
      showToast(t("employees.toast.unexpected"), "error");
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setInviteData({
      email: employee.email,
      fullName: employee.full_name,
      position: employee.position,
      department: employee.department || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingEmployee) return;

    try {
      const { error } = await supabase
        .from("employees")
        .update({
          full_name: inviteData.fullName,
          email: inviteData.email,
          position: inviteData.position,
          department: inviteData.department || null,
        })
        .eq("id", editingEmployee.id);

      if (error) {
        showToast(
          t("employees.toast.updateFailed", { error: error.message }),
          "error",
        );
        return;
      }

      showToast(t("employees.toast.updated"), "success");
      setShowEditModal(false);
      setEditingEmployee(null);
      setInviteData({ email: "", fullName: "", position: "", department: "" });
      await loadCompanyData();
    } catch (err) {
      console.error("Unexpected error:", err);
      showToast(t("employees.toast.unexpected"), "error");
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm(t("employees.confirmDelete"))) {
      return;
    }

    try {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", employeeId);

      if (error) {
        showToast(
          t("employees.toast.deleteFailed", { error: error.message }),
          "error",
        );
        return;
      }

      showToast(t("employees.toast.deleted"), "success");
      await loadCompanyData();
    } catch (err) {
      console.error("Unexpected error:", err);
      showToast(t("employees.toast.unexpected"), "error");
    }
  };

  const handleResendInvitation = async (employee: Employee) => {
    if (!company) {
      showToast(t("employees.toast.noCompany"), "error");
      return;
    }

    try {
      await sendInvitationEmail(employee.id, employee.email);
      showToast(t("employees.toast.invitationSent"), "success");
    } catch (err) {
      console.error("Error resending invitation email:", err);
      showToast(t("employees.toast.sendFailed"), "error");
    }
  };

  const stats = [
    {
      icon: Clock,
      label: t("dashboard.stats.hoursToday"),
      value: "0h 0m",
      color: "bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400",
    },
    {
      icon: BarChart3,
      label: t("dashboard.stats.hoursWeek"),
      value: "0h 0m",
      color:
        "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    },
    {
      icon: FileText,
      label: t("dashboard.stats.pendingDocuments"),
      value: "0",
      color:
        "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
    },
    {
      icon: Users,
      label: t("dashboard.stats.teamMembers"),
      value: employees.length.toString(),
      color: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    },
  ];

  const formFields = [
    {
      label: t("employees.form.fullName"),
      field: "fullName" as const,
      type: "text",
      required: true,
    },
    {
      label: t("employees.form.email"),
      field: "email" as const,
      type: "email",
      required: true,
    },
    {
      label: t("employees.form.position"),
      field: "position" as const,
      type: "text",
      required: true,
    },
    {
      label: t("employees.form.department"),
      field: "department" as const,
      type: "text",
      required: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <AlarmClockIcon className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  PlegoHR
                </span>
              </Link>
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-semibold border-b-2 border-teal-600 dark:border-teal-400"
                >
                  {t("nav.dashboard")}
                </button>
                <button
                  onClick={() => navigate("/documents")}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  {t("nav.documents")}
                </button>
                <button
                  onClick={() => navigate("/leave")}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  {t("nav.leave")}
                </button>
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
                <span className="hidden md:inline">{t("common.logout")}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t("dashboard.welcome", {
              name: user?.user_metadata?.full_name || "User",
            })}
          </h1>
          {company && (
            <p className="text-gray-600 dark:text-gray-400">{company.name}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("employees.title")}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {t("employees.subtitle")}
              </p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t("employees.add")}
            </button>
          </div>

          {employees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t("employees.empty.title")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t("employees.empty.description")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {[
                      t("employees.columns.name"),
                      t("employees.columns.email"),
                      t("employees.columns.position"),
                      t("employees.columns.department"),
                      t("employees.columns.status"),
                      t("employees.columns.actions"),
                    ].map((h, i) => (
                      <th
                        key={i}
                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${i === 5 ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {employee.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {employee.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {employee.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {employee.department || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            employee.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                          }`}
                        >
                          {t(`common.status.${employee.status}`, {
                            defaultValue: employee.status,
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResendInvitation(employee)}
                            className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                            title={t("employees.resendInvitation")}
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditEmployee(employee)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title={t("common.edit")}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title={t("common.delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t("employees.add")}
            </h3>
            <form onSubmit={handleInviteEmployee} className="space-y-4">
              {formFields.map(({ label, field, type, required }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={inviteData[field]}
                    onChange={(e) =>
                      setInviteData({ ...inviteData, [field]: e.target.value })
                    }
                    required={required}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  {t("employees.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t("employees.editTitle")}
            </h3>
            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              {formFields.map(({ label, field, type, required }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={inviteData[field]}
                    onChange={(e) =>
                      setInviteData({ ...inviteData, [field]: e.target.value })
                    }
                    required={required}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEmployee(null);
                    setInviteData({
                      email: "",
                      fullName: "",
                      position: "",
                      department: "",
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  {t("common.update")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
