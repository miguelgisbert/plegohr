import {
  createContext,
  useContext,
  useEffect,
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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    companyName?: string,
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  signInWithLinkedIn: () => Promise<void>;
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

  const loadUserProfile = async (userId: string) => {
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
        return;
      }

      if (userRecord) {
        setRole(userRecord.type === 'company' ? 'admin' : 'employee');
        setCompanyId(userRecord.company_id);
      } else {
        setRole(null);
        setCompanyId(null);
      }
    } catch (err) {
      console.error('Unexpected error loading profile:', err);
      setRole(null);
      setCompanyId(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setRole(null);
          setCompanyId(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureCompanySetup = async (currentUser: User) => {
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

    if (freshUser.company_id || freshUser.type === "employee") {
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
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    if (data.user) {
      await ensureCompanySetup(data.user);
    }
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

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
  };

  const signInWithLinkedIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
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
