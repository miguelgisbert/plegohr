import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: 'admin' | 'employee' | null;
  companyId: string | null;
  signIn: (
    email: string,
    password: string,
  ) => Promise<'admin' | 'employee' | null>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    companyName?: string,
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  signInWithLinkedIn: () => Promise<void>;
  completeCompanySetup: (companyName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'employee' | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Returns the effective role, or null when the user is not linked to a
  // company yet (fresh signup before onboarding / not-yet-accepted invite).
  const loadUserProfile = useCallback(async (userId: string): Promise<'admin' | 'employee' | null> => {
    try {
      const { data: userRecord, error } = await supabase
        .from('users')
        .select('type, company_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile:', error);
        setRole(null);
        setCompanyId(null);
        return null;
      }

      if (userRecord?.company_id) {
        const loadedRole = userRecord.type === 'company' ? 'admin' : 'employee';
        setRole(loadedRole);
        setCompanyId(userRecord.company_id);
        return loadedRole;
      }

      setRole(null);
      setCompanyId(null);
      return null;
    } catch (err) {
      console.error('Unexpected error loading profile:', err);
      setRole(null);
      setCompanyId(null);
      return null;
    }
  }, []);

  const onboardingAttempted = useRef(false);

  const ensureCompanySetup = useCallback(async (currentUser: User) => {
    const companyName = currentUser.user_metadata?.company_name;

    if (!companyName || typeof companyName !== "string") {
      return;
    }

    const { data: userRecord, error: profileError } = await supabase
      .from("users")
      .select("company_id, type")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Failed to fetch user record: ${profileError.message}`);
    }

    if (!userRecord) {
      const { error: rpcError } = await supabase.rpc('create_user_profile', {
        user_id: currentUser.id,
        user_full_name: currentUser.user_metadata?.full_name || 'User',
      });
      if (rpcError) {
        throw new Error(
          `Failed to create user record: ${rpcError.message}. Please try logging in.`,
        );
      }
    }

    // Refetch after potential RPC creation
    const { data: freshUser, error: refetchError } = await supabase
      .from("users")
      .select("company_id, type")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (refetchError || !freshUser) {
      throw new Error("User record creation failed. Please try logging in.");
    }

    // Only skip when the user already belongs to a company. Employees invited
    // by a company get company_id from accept_invitation, so they never reach
    // company creation here. The old `type === "employee"` guard broke fresh
    // signups because the DB trigger defaults new users to 'employee'.
    if (freshUser.company_id) {
      return;
    }

    const { data: existingCompany, error: existingCompanyError } =
      await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", currentUser.id)
        .maybeSingle();

    if (existingCompanyError) {
      throw new Error(
        `Failed to verify company: ${existingCompanyError.message}`,
      );
    }

    let companyId = existingCompany?.id;

    if (!companyId) {
      const { data: insertedCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: companyName,
          owner_id: currentUser.id,
        })
        .select("id")
        .single();

      if (companyError) {
        if (companyError.code === "23505") {
          const { data: ownerCompany, error: ownerCompanyError } =
            await supabase
              .from("companies")
              .select("id")
              .eq("owner_id", currentUser.id)
              .maybeSingle();

          if (ownerCompanyError) {
            throw new Error(
              `Failed to resolve duplicated company: ${ownerCompanyError.message}`,
            );
          }

          if (ownerCompany?.id) {
            companyId = ownerCompany.id;
          } else {
            throw new Error(
              "Company name already exists. Please use a different company name.",
            );
          }
        } else {
          throw new Error(`Failed to create company: ${companyError.message}`);
        }
      } else {
        companyId = insertedCompany.id;
      }
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        company_id: companyId,
        type: "company",
      })
      .eq("id", currentUser.id);

    if (updateError) {
      throw new Error(
        `Failed to link user to company: ${updateError.message}`,
      );
    }

    await loadUserProfile(currentUser.id);
  }, [loadUserProfile]);


  // Loads the profile and, when the user signed up with a company name but is
  // not linked yet (e.g. email confirmation flow), finishes company setup.
  const refreshProfile = useCallback(async (currentUser: User): Promise<'admin' | 'employee' | null> => {
    let loadedRole = await loadUserProfile(currentUser.id);

    if (!loadedRole) {
      const companyName = currentUser.user_metadata?.company_name;
      if (companyName && typeof companyName === 'string' && !onboardingAttempted.current) {
        onboardingAttempted.current = true;
        try {
          await ensureCompanySetup(currentUser);
        } catch (err) {
          console.error('Company onboarding failed:', err);
        }
        loadedRole = await loadUserProfile(currentUser.id);
      }
    }

    return loadedRole;
  }, [loadUserProfile, ensureCompanySetup]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await refreshProfile(session.user);
      }
      if (!cancelled) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await refreshProfile(session.user);
        } else {
          setRole(null);
          setCompanyId(null);
        }
      })();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signIn = async (
    email: string,
    password: string,
  ): Promise<'admin' | 'employee' | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    if (data.user) {
      onboardingAttempted.current = false;
      await ensureCompanySetup(data.user);
      return await refreshProfile(data.user);
    }
    return null;
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    companyName?: string,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
          // Self-registration on the web is always a company account; the
          // handle_new_user() trigger reads this to set users.type directly.
          type: companyName ? "company" : "employee",
        },
      },
    });

    if (error) {
      console.error('Signup error:', error);
      throw error;
    }

    if (!data.user) {
      throw new Error("Failed to create user");
    }

    if (data.session && companyName) {
      // Ensure user record exists in public.users (trigger fallback)
      const { error: rpcError } = await supabase.rpc('create_user_profile', {
        user_id: data.user.id,
        user_full_name: fullName,
      });
      if (rpcError) {
        console.error('Failed to create user record via RPC:', rpcError);
      }

      await ensureCompanySetup(data.user);
    }

    return { requiresEmailConfirmation: !data.session };
  };

  // Finishes onboarding for users who registered without a company (e.g.
  // social login): stores the company name in the auth metadata and runs the
  // same company-creation flow as email/password signup.
  const completeCompanySetup = async (companyName: string) => {
    const name = companyName.trim();
    if (!name) {
      throw new Error("Company name is required");
    }

    const { data, error } = await supabase.auth.updateUser({
      data: { company_name: name, type: "company" },
    });
    if (error) throw error;
    if (!data.user) {
      throw new Error("Failed to update user metadata");
    }

    onboardingAttempted.current = false;
    await ensureCompanySetup(data.user);
  };

  // Opens the provider consent screen in a popup so the current page stays
  // open. The popup lands on /auth/callback, which stores the session (shared
  // via localStorage) and closes itself; this tab picks the session up through
  // onAuthStateChange. Falls back to a full-page redirect if the popup is
  // blocked by the browser.
  const signInWithOAuthPopup = async (provider: "google" | "linkedin_oidc") => {
    // Note: do NOT pass "noopener" here — with noopener, window.open returns
    // null and we could no longer navigate the popup ourselves. Center the
    // popup on the screen that contains the current window.
    const popupWidth = 520;
    const popupHeight = 680;
    const left = Math.round(
      window.screenX + (window.outerWidth - popupWidth) / 2,
    );
    const top = Math.round(
      window.screenY + (window.outerHeight - popupHeight) / 2,
    );
    const popup = window.open(
      "",
      "plego-oauth-login",
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`,
    );

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      popup?.close();
      throw error;
    }

    if (!data.url) {
      popup?.close();
      throw new Error("OAuth provider did not return an authorization URL");
    }

    if (popup) {
      popup.location.href = data.url;
    } else {
      window.location.href = data.url;
    }
  };

  const signInWithGoogle = async () => {
    await signInWithOAuthPopup("google");
  };

  const signInWithLinkedIn = async () => {
    await signInWithOAuthPopup("linkedin_oidc");
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        role,
        companyId,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithLinkedIn,
        completeCompanySetup,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
