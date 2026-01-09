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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Palette, ShoppingBag, Mail, Lock, User, Check, Phone, Shield, AtSign, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'artist' | 'buyer';

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, signIn, signUp, loading, checkDisplayIdAvailable } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupDisplayId, setSignupDisplayId] = useState('');
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [displayIdAvailable, setDisplayIdAvailable] = useState<boolean | null>(null);
  const [checkingDisplayId, setCheckingDisplayId] = useState(false);
  const [signupRoles, setSignupRoles] = useState<AppRole[]>(['buyer']);
  const [signupRealName, setSignupRealName] = useState('');
  const [signupPhoneNumber, setSignupPhoneNumber] = useState('');
  const [signupArtistName, setSignupArtistName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Forgot password state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const loginSchema = z.object({
    email: z.string().trim().email({ message: t('validation.emailRequired') }),
    password: z.string().min(6, { message: t('validation.passwordMin') }),
  });

  const signupSchema = z.object({
    email: z.string().trim().email({ message: t('validation.emailRequired') }),
    password: z.string().min(6, { message: t('validation.passwordMin') }),
    firstName: z.string().trim().min(2, { message: 'กรุณากรอกชื่อ' }),
    lastName: z.string().trim().min(2, { message: 'กรุณากรอกนามสกุล' }),
    displayId: z.string().trim()
      .min(3, { message: 'User ID ต้องมีอย่างน้อย 3 ตัวอักษร' })
      .max(20, { message: 'User ID ต้องไม่เกิน 20 ตัวอักษร' })
      .regex(/^[a-zA-Z0-9_]+$/, { message: 'User ID ใช้ได้เฉพาะ a-z, 0-9 และ _ เท่านั้น' }),
    displayName: z.string().trim()
      .min(2, { message: 'ชื่อที่แสดงต้องมีอย่างน้อย 2 ตัวอักษร' })
      .max(30, { message: 'ชื่อที่แสดงต้องไม่เกิน 30 ตัวอักษร' })
      .regex(/^\S+$/, { message: 'ชื่อที่แสดงห้ามมีเว้นวรรค' }),
    roles: z.array(z.enum(['artist', 'buyer'])).min(1, { message: t('validation.roleRequired') }),
    realName: z.string().optional(),
    phoneNumber: z.string().optional(),
    artistName: z.string().optional(),
  }).refine((data) => {
    if (data.roles.includes('artist')) {
      return data.realName && data.realName.trim().length >= 2 && 
             data.phoneNumber && data.phoneNumber.trim().length >= 9 &&
             data.artistName && data.artistName.trim().length >= 2 && !/\s/.test(data.artistName);
    }
    return true;
  }, {
    message: t('validation.verificationRequired'),
    path: ['artistVerification'],
  });

  // Check display ID availability with debounce
  useEffect(() => {
    if (!signupDisplayId || signupDisplayId.length < 3) {
      setDisplayIdAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDisplayId(true);
      const isAvailable = await checkDisplayIdAvailable(signupDisplayId);
      setDisplayIdAvailable(isAvailable);
      setCheckingDisplayId(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [signupDisplayId, checkDisplayIdAvailable]);

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

    // Check display ID availability
    if (displayIdAvailable === false) {
      setErrors({ signup_displayId: 'User ID นี้ถูกใช้ไปแล้ว' });
      return;
    }
    
    const result = signupSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      firstName: signupFirstName,
      lastName: signupLastName,
      displayId: signupDisplayId,
      displayName: signupDisplayName,
      roles: signupRoles,
      realName: signupRealName,
      phoneNumber: signupPhoneNumber,
      artistName: signupArtistName,
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
      ? { realName: signupRealName, phoneNumber: signupPhoneNumber, artistName: signupArtistName }
      : undefined;
    
    const { error } = await signUp(signupEmail, signupPassword, signupFirstName, signupLastName, signupDisplayId, signupDisplayName, signupRoles, artistVerification);
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
        title: '🎉 สมัครสมาชิกสำเร็จ!',
        description: 'กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี',
        duration: 5000,
      });
      // Navigate to verify email page with email param
      navigate(`/verify-email?email=${encodeURIComponent(signupEmail)}`);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail || !forgotPasswordEmail.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'กรุณากรอกอีเมลให้ถูกต้อง',
      });
      return;
    }
    
    setIsSendingReset(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/settings/change-password`,
      });
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'ไม่สามารถส่งอีเมลได้',
          description: error.message,
        });
      } else {
        setResetEmailSent(true);
        toast({
          title: 'ส่งอีเมลสำเร็จ',
          description: 'กรุณาตรวจสอบอีเมลของคุณเพื่อรีเซ็ตรหัสผ่าน',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setForgotPasswordOpen(false);
    setForgotPasswordEmail('');
    setResetEmailSent(false);
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
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  {/* User ID Field */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-displayid">User ID <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-displayid"
                        type="text"
                        placeholder="your_user_id"
                        value={signupDisplayId}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                          setSignupDisplayId(value);
                        }}
                        className={`pl-10 ${displayIdAvailable === false ? 'border-destructive' : displayIdAvailable === true ? 'border-green-500' : ''}`}
                      />
                      {checkingDisplayId && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      )}
                      {!checkingDisplayId && displayIdAvailable === true && signupDisplayId.length >= 3 && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                    </div>
                    {errors.signup_displayId && (
                      <p className="text-sm text-destructive">{errors.signup_displayId}</p>
                    )}
                    {displayIdAvailable === false && !errors.signup_displayId && (
                      <p className="text-sm text-destructive">User ID นี้ถูกใช้ไปแล้ว</p>
                    )}
                    <p className="text-xs text-muted-foreground">ใช้ได้เฉพาะ a-z, 0-9 และ _ (ห้ามเว้นวรรค) - ใช้สำหรับอ้างอิงบัญชี</p>
                  </div>

                  {/* Display Name Field - For Buyers */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-displayname">ชื่อที่แสดง (Display Name) <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-displayname"
                        type="text"
                        placeholder="ชื่อที่จะแสดงในคอมมูนิตี้"
                        value={signupDisplayName}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, '');
                          setSignupDisplayName(value);
                        }}
                        className="pl-10"
                      />
                    </div>
                    {errors.signup_displayName && (
                      <p className="text-sm text-destructive">{errors.signup_displayName}</p>
                    )}
                    <p className="text-xs text-muted-foreground">ชื่อนี้จะแสดงในโปรไฟล์และคอมมูนิตี้ (ห้ามเว้นวรรค, เปลี่ยนได้ทุก 30 วัน)</p>
                  </div>

                  {/* First Name and Last Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname">ชื่อ <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="signup-firstname"
                          type="text"
                          placeholder="ชื่อ"
                          value={signupFirstName}
                          onChange={(e) => setSignupFirstName(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {errors.signup_firstName && (
                        <p className="text-sm text-destructive">{errors.signup_firstName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname">นามสกุล <span className="text-destructive">*</span></Label>
                      <Input
                        id="signup-lastname"
                        type="text"
                        placeholder="นามสกุล"
                        value={signupLastName}
                        onChange={(e) => setSignupLastName(e.target.value)}
                      />
                      {errors.signup_lastName && (
                        <p className="text-sm text-destructive">{errors.signup_lastName}</p>
                      )}
                    </div>
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

                      {/* Artist Name Field */}
                      <div className="space-y-2">
                        <Label htmlFor="signup-artistname">ชื่อศิลปิน <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <Palette className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="signup-artistname"
                            type="text"
                            placeholder="ชื่อที่จะแสดงในโปรไฟล์ศิลปิน"
                            value={signupArtistName}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\s/g, '');
                              setSignupArtistName(value);
                            }}
                            className="pl-10"
                          />
                        </div>
                        {errors.signup_artistName && (
                          <p className="text-sm text-destructive">{errors.signup_artistName}</p>
                        )}
                        <p className="text-xs text-muted-foreground">ห้ามมีเว้นวรรค สามารถใช้ขีดล่าง (_) แทนได้ (เปลี่ยนได้ทุก 30 วัน)</p>
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

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={handleCloseForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ลืมรหัสผ่าน</DialogTitle>
            <DialogDescription>
              กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน
            </DialogDescription>
          </DialogHeader>
          
          {resetEmailSent ? (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 text-center">
                <Mail className="mx-auto h-12 w-12 text-green-500 mb-3" />
                <h3 className="font-medium text-green-800 dark:text-green-200">ส่งอีเมลสำเร็จ!</h3>
                <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                  เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่
                </p>
                <p className="font-medium text-green-800 dark:text-green-200 mt-1">
                  {forgotPasswordEmail}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-3">
                  กรุณาตรวจสอบกล่องจดหมายของคุณ (อาจอยู่ใน Spam/Junk)
                </p>
              </div>
              <Button
                onClick={handleCloseForgotPassword}
                className="w-full"
              >
                กลับไปหน้าเข้าสู่ระบบ
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">อีเมล</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="your@email.com"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForgotPassword}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={isSendingReset}
                  className="flex-1"
                >
                  {isSendingReset ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    'ส่งลิงก์รีเซ็ต'
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Auth;
