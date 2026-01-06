import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Palette, ShoppingBag, Mail, Lock, User, Check, Phone, Shield } from 'lucide-react';

type AppRole = 'artist' | 'buyer';

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupRoles, setSignupRoles] = useState<AppRole[]>(['buyer']);
  const [signupRealName, setSignupRealName] = useState('');
  const [signupPhoneNumber, setSignupPhoneNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loginSchema = z.object({
    email: z.string().trim().email({ message: t('validation.emailRequired') }),
    password: z.string().min(6, { message: t('validation.passwordMin') }),
  });

  const signupSchema = z.object({
    email: z.string().trim().email({ message: t('validation.emailRequired') }),
    password: z.string().min(6, { message: t('validation.passwordMin') }),
    fullName: z.string().trim().min(2, { message: t('validation.nameRequired') }),
    roles: z.array(z.enum(['artist', 'buyer'])).min(1, { message: t('validation.roleRequired') }),
    realName: z.string().optional(),
    phoneNumber: z.string().optional(),
  }).refine((data) => {
    if (data.roles.includes('artist')) {
      return data.realName && data.realName.trim().length >= 2 && data.phoneNumber && data.phoneNumber.trim().length >= 9;
    }
    return true;
  }, {
    message: t('validation.verificationRequired'),
    path: ['artistVerification'],
  });

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const toggleRole = (role: AppRole) => {
    setSignupRoles(prev => {
      if (prev.includes(role)) {
        if (prev.length === 1) return prev;
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[`login_${err.path[0]}`] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: t('auth.loginFailed'),
        description: error.message === 'Invalid login credentials' 
          ? t('auth.invalidCredentials')
          : error.message,
      });
    } else {
      toast({
        title: t('auth.loginSuccess'),
        description: t('auth.welcomeBack'),
      });
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = signupSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      fullName: signupFullName,
      roles: signupRoles,
      realName: signupRealName,
      phoneNumber: signupPhoneNumber,
    });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[`signup_${err.path[0]}`] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    const artistVerification = signupRoles.includes('artist') 
      ? { realName: signupRealName, phoneNumber: signupPhoneNumber }
      : undefined;
    
    const { error } = await signUp(signupEmail, signupPassword, signupFullName, signupRoles, artistVerification);
    setIsSubmitting(false);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: t('auth.signupFailed'),
        description: error.message.includes('already registered')
          ? t('auth.emailExists')
          : error.message,
      });
    } else {
      toast({
        title: t('auth.signupSuccess'),
        description: signupRoles.includes('artist') 
          ? t('auth.welcomeArtist')
          : t('auth.welcomeNew'),
      });
      navigate('/');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
              {t('auth.joinSoulHuman')}
            </h1>
            <p className="mt-4 text-muted-foreground">
              {t('auth.connectCommunity')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-10"
          >
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t('auth.loginTab')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth.signupTab')}</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.login_email && (
                      <p className="text-sm text-destructive">{errors.login_email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.login_password && (
                      <p className="text-sm text-destructive">{errors.login_password}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? t('auth.signingIn') : t('auth.loginButton')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t('auth.fullName')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder={t('auth.fullName')}
                        value={signupFullName}
                        onChange={(e) => setSignupFullName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.signup_fullName && (
                      <p className="text-sm text-destructive">{errors.signup_fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.signup_email && (
                      <p className="text-sm text-destructive">{errors.signup_email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.signup_password && (
                      <p className="text-sm text-destructive">{errors.signup_password}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>{t('auth.selectRole')}</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        onClick={() => toggleRole('artist')}
                        className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                          signupRoles.includes('artist')
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-muted-foreground/50'
                        }`}
                      >
                        {signupRoles.includes('artist') && (
                          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col items-center">
                          <Palette className="mb-3 h-6 w-6" />
                          <span className="font-medium">{t('auth.artistRole')}</span>
                          <span className="text-xs text-muted-foreground">{t('auth.artistDesc')}</span>
                        </div>
                      </div>
                      <div
                        onClick={() => toggleRole('buyer')}
                        className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                          signupRoles.includes('buyer')
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-muted-foreground/50'
                        }`}
                      >
                        {signupRoles.includes('buyer') && (
                          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col items-center">
                          <ShoppingBag className="mb-3 h-6 w-6" />
                          <span className="font-medium">{t('auth.buyerRole')}</span>
                          <span className="text-xs text-muted-foreground">{t('auth.buyerDesc')}</span>
                        </div>
                      </div>
                    </div>
                    {signupRoles.includes('artist') && (
                      <p className="text-xs text-muted-foreground text-center">
                        ✨ {t('auth.artistAutoBuyer')}
                      </p>
                    )}
                    {errors.signup_roles && (
                      <p className="text-sm text-destructive">{errors.signup_roles}</p>
                    )}
                  </div>

                  {/* Artist Verification Section */}
                  {signupRoles.includes('artist') && (
                    <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <span className="font-medium text-foreground">{t('auth.artistVerification')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('auth.verificationDesc')}
                      </p>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-realname">{t('auth.realName')}</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="signup-realname"
                            type="text"
                            placeholder={t('auth.realName')}
                            value={signupRealName}
                            onChange={(e) => setSignupRealName(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-phone">{t('auth.phoneNumber')}</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="signup-phone"
                            type="tel"
                            placeholder="08X-XXX-XXXX"
                            value={signupPhoneNumber}
                            onChange={(e) => setSignupPhoneNumber(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      {errors.signup_artistVerification && (
                        <p className="text-sm text-destructive">{errors.signup_artistVerification}</p>
                      )}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? t('auth.signingUp') : t('auth.signupButton')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Auth;
