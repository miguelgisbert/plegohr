import {
  createContext,
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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    companyName?: string,
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  signInWithLinkedIn: () => Promise<void>;
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
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile:', error);
        setRole(null);
        setCompanyId(null);
        return;
      }

      if (profile) {
        setRole(profile.role as 'admin' | 'employee');
        setCompanyId(profile.company_id);
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
    } = supabase.auth.onAuthStateChange((event, session) => {
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error("Profile creation failed. Please try logging in.");
    }

    if (profile.company_id) {
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
      .from("profiles")
      .update({
        company_id: companyId,
        role: "admin",
      })
      .eq("id", currentUser.id);

    if (updateError) {
      throw new Error(
        `Failed to link profile to company: ${updateError.message}`,
      );
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    if (data.user) {
      await runCompanySetupOnce(data.user);
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

    if (companyName) {
      await new Promise(resolve => setTimeout(resolve, 500));

      let retries = 0;
      const maxRetries = 5;
      let profileExists = false;

      while (retries < maxRetries && !profileExists) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile) {
          profileExists = true;
          console.log('Profile found:', profile);
        } else {
          console.log(`Profile not found, retry ${retries + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 500));
          retries++;
        }
      }

      if (!profileExists) {
        console.error('Profile creation failed after retries');
        throw new Error('Profile creation failed. Please try logging in.');
      }

      const { error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          owner_id: data.user.id,
        });

      if (companyError) {
        console.error('Company creation error:', companyError);
        throw new Error(`Failed to create company: ${companyError.message}`);
      }

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', data.user.id)
        .maybeSingle();

      if (company) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            company_id: company.id,
            role: 'admin',
          })
          .eq('id', data.user.id);

        if (updateError) {
          throw new Error(`Failed to link profile to company: ${updateError.message}`);
        }
      }
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
