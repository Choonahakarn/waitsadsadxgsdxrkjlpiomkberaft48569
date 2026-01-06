import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Palette, ShoppingBag, Mail, Lock, User, Check } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'กรุณากรอกอีเมลที่ถูกต้อง' }),
  password: z.string().min(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }),
});

const signupSchema = z.object({
  email: z.string().trim().email({ message: 'กรุณากรอกอีเมลที่ถูกต้อง' }),
  password: z.string().min(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }),
  fullName: z.string().trim().min(2, { message: 'กรุณากรอกชื่อ' }),
  roles: z.array(z.enum(['artist', 'buyer'])).min(1, { message: 'กรุณาเลือกอย่างน้อย 1 บทบาท' }),
});

type AppRole = 'artist' | 'buyer';

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupRoles, setSignupRoles] = useState<AppRole[]>(['buyer']);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const toggleRole = (role: AppRole) => {
    setSignupRoles(prev => {
      if (prev.includes(role)) {
        // Don't allow removing if it's the only role
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
        title: 'เข้าสู่ระบบไม่สำเร็จ',
        description: error.message === 'Invalid login credentials' 
          ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' 
          : error.message,
      });
    } else {
      toast({
        title: 'เข้าสู่ระบบสำเร็จ',
        description: 'ยินดีต้อนรับกลับมา!',
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
    const { error } = await signUp(signupEmail, signupPassword, signupFullName, signupRoles);
    setIsSubmitting(false);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'สมัครสมาชิกไม่สำเร็จ',
        description: error.message.includes('already registered')
          ? 'อีเมลนี้ถูกใช้งานแล้ว'
          : error.message,
      });
    } else {
      toast({
        title: 'สมัครสมาชิกสำเร็จ',
        description: 'ยินดีต้อนรับสู่ SoulHuman!',
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
              เข้าร่วม SoulHuman
            </h1>
            <p className="mt-4 text-muted-foreground">
              เชื่อมต่อกับชุมชนศิลปินและนักสะสมงานศิลปะ
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
                <TabsTrigger value="login">เข้าสู่ระบบ</TabsTrigger>
                <TabsTrigger value="signup">สมัครสมาชิก</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">อีเมล</Label>
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
                    <Label htmlFor="login-password">รหัสผ่าน</Label>
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
                    {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">ชื่อ-นามสกุล</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="ชื่อของคุณ"
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
                    <Label htmlFor="signup-email">อีเมล</Label>
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
                    <Label htmlFor="signup-password">รหัสผ่าน</Label>
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
                    <Label>คุณต้องการเข้าร่วมในฐานะ (เลือกได้หลายบทบาท)</Label>
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
                          <span className="font-medium">ศิลปิน</span>
                          <span className="text-xs text-muted-foreground">ขายงานศิลปะ</span>
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
                          <span className="font-medium">ผู้ซื้อ</span>
                          <span className="text-xs text-muted-foreground">ซื้องานศิลปะ</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      💡 คุณสามารถเป็นทั้งศิลปินและผู้ซื้อได้ในเวลาเดียวกัน
                    </p>
                    {errors.signup_roles && (
                      <p className="text-sm text-destructive">{errors.signup_roles}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
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
