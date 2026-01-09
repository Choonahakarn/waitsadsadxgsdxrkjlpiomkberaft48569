import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'artist' | 'buyer';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signUp: (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    displayId: string,
    displayName: string,
    roles: AppRole[], 
    artistVerification?: { realName: string; phoneNumber: string; artistName: string }
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  addRole: (role: AppRole) => Promise<{ error: Error | null }>;
  refreshRoles: () => Promise<void>;
  isAdmin: boolean;
  isArtist: boolean;
  isBuyer: boolean;
  checkDisplayIdAvailable: (displayId: string) => Promise<boolean>;
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

  const checkDisplayIdAvailable = async (displayId: string): Promise<boolean> => {
    if (!displayId.trim()) return true;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('display_id', displayId)
      .maybeSingle();
    
    return !data && !error;
  };

  const signUp = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string,
    displayId: string,
    displayName: string,
    selectedRoles: AppRole[],
    artistVerification?: { realName: string; phoneNumber: string; artistName: string }
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    const fullName = `${firstName} ${lastName}`.trim();
    
    // If artist is selected, always include buyer role
    const rolesToAdd = selectedRoles.includes('artist') && !selectedRoles.includes('buyer')
      ? [...selectedRoles, 'buyer']
      : selectedRoles;
    
    // Use artist as primary role if selected, otherwise use the first role
    const primaryRole = rolesToAdd.includes('artist') ? 'artist' : (rolesToAdd[0] || 'buyer');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: primaryRole,
          display_id: displayId || undefined,
          display_name: displayName || displayId || undefined,
          // Include artist verification info in metadata for database trigger
          real_name: artistVerification?.realName || undefined,
          phone_number: artistVerification?.phoneNumber || undefined,
        },
      },
    });

    // Update profile with display_id and display_name if provided
    if (!error && data.user && (displayId || displayName)) {
      await supabase
        .from('profiles')
        .update({ 
          display_id: displayId || undefined,
          display_name: displayName || displayId || undefined
        })
        .eq('id', data.user.id);
    }

    // If signup successful and user has additional roles, add them
    if (!error && data.user && rolesToAdd.length > 1) {
      for (let i = 1; i < rolesToAdd.length; i++) {
        const roleToInsert = rolesToAdd[i];
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: roleToInsert as 'admin' | 'artist' | 'buyer',
        });
        
        // If adding artist role, create artist profile with verification info
        if (roleToInsert === 'artist' && artistVerification) {
          await supabase.from('artist_profiles').insert({
            user_id: data.user.id,
            artist_name: artistVerification.artistName || displayId || fullName || 'Artist',
            real_name: artistVerification.realName,
            phone_number: artistVerification.phoneNumber,
            verification_submitted_at: new Date().toISOString(),
          });
        }
      }
    }
    
    // If primary role is artist and we have verification info, update the profile
    if (!error && data.user && primaryRole === 'artist' && artistVerification) {
      await supabase.from('artist_profiles')
        .update({
          artist_name: artistVerification.artistName || displayId || fullName || 'Artist',
          real_name: artistVerification.realName,
          phone_number: artistVerification.phoneNumber,
          verification_submitted_at: new Date().toISOString(),
        })
        .eq('user_id', data.user.id);
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
    // Redirect to login page and refresh
    window.location.href = '/auth';
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
    checkDisplayIdAvailable,
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
