import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'artist' | 'buyer';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, roles: AppRole[]) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  addRole: (role: AppRole) => Promise<{ error: Error | null }>;
  refreshRoles: () => Promise<void>;
  isAdmin: boolean;
  isArtist: boolean;
  isBuyer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserRoles = async (userId: string) => {
    const { data, error } = await supabase.rpc('get_user_roles', { _user_id: userId });
    if (!error && data) {
      setRoles(data as AppRole[]);
    }
  };

  const refreshRoles = async () => {
    if (user) {
      await fetchUserRoles(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetching with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setRoles([]);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoles(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, selectedRoles: AppRole[]) => {
    const redirectUrl = `${window.location.origin}/`;
    
    // Use the first role for the trigger, we'll add additional roles after
    const primaryRole = selectedRoles[0] || 'buyer';
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: primaryRole,
        },
      },
    });

    // If signup successful and user has multiple roles, add the additional roles
    if (!error && data.user && selectedRoles.length > 1) {
      for (let i = 1; i < selectedRoles.length; i++) {
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: selectedRoles[i],
        });
        
        // If adding artist role, create artist profile
        if (selectedRoles[i] === 'artist') {
          await supabase.from('artist_profiles').insert({
            user_id: data.user.id,
            artist_name: fullName || 'Artist',
          });
        }
      }
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const addRole = async (role: AppRole) => {
    if (!user) {
      return { error: new Error('User not logged in') };
    }

    // Check if role already exists
    if (roles.includes(role)) {
      return { error: new Error('Role already assigned') };
    }

    const { error } = await supabase.from('user_roles').insert({
      user_id: user.id,
      role: role,
    });

    if (error) {
      return { error: error as Error };
    }

    // If adding artist role, create artist profile
    if (role === 'artist') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      await supabase.from('artist_profiles').insert({
        user_id: user.id,
        artist_name: profile?.full_name || 'Artist',
      });
    }

    // Refresh roles
    await fetchUserRoles(user.id);

    return { error: null };
  };

  const value = {
    user,
    session,
    roles,
    loading,
    signUp,
    signIn,
    signOut,
    addRole,
    refreshRoles,
    isAdmin: roles.includes('admin'),
    isArtist: roles.includes('artist'),
    isBuyer: roles.includes('buyer'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
