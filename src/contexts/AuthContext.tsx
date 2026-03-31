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
  const companySetupInFlightRef = useRef<Map<string, Promise<void>>>(new Map());

  const runCompanySetupOnce = (currentUser: User) => {
    const existingTask = companySetupInFlightRef.current.get(currentUser.id);
    if (existingTask) {
      return existingTask;
    }

    const task = (async () => {
      try {
        await ensureCompanySetup(currentUser);
      } finally {
        companySetupInFlightRef.current.delete(currentUser.id);
      }
    })();

    companySetupInFlightRef.current.set(currentUser.id, task);
    return task;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        runCompanySetupOnce(session.user).catch((error) => {
          console.error(
            "Failed to complete company setup from existing session:",
            error,
          );
        });
      }

      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (
          (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
          session?.user
        ) {
          try {
            await runCompanySetupOnce(session.user);
          } catch (error) {
            console.error(
              "Failed to complete company setup after auth state change:",
              error,
            );
          }
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

    if (error) throw error;

    if (!data.user) {
      throw new Error("Failed to create user");
    }

    if (companyName) {
      if (!data.session) {
        return { requiresEmailConfirmation: true };
      }

      await runCompanySetupOnce(data.user);
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
