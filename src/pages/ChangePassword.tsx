import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff, Check, X, ArrowLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  // Password requirements
  const passwordRequirements = [
    { label: 'อย่างน้อย 8 ตัวอักษร', test: (p: string) => p.length >= 8 },
    { label: 'มีตัวอักษรพิมพ์เล็ก (a-z)', test: (p: string) => /[a-z]/.test(p) },
    { label: 'มีตัวอักษรพิมพ์ใหญ่ (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'มีตัวเลข (0-9)', test: (p: string) => /[0-9]/.test(p) },
    { label: 'มีอักขระพิเศษ (!@#$%^&*)', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  const getPasswordStrength = (password: string) => {
    const passedRequirements = passwordRequirements.filter(req => req.test(password)).length;
    return (passedRequirements / passwordRequirements.length) * 100;
  };

  const getPasswordStrengthLabel = (strength: number) => {
    if (strength === 0) return { label: '', color: '' };
    if (strength <= 20) return { label: 'อ่อนมาก', color: 'text-destructive' };
    if (strength <= 40) return { label: 'อ่อน', color: 'text-orange-500' };
    if (strength <= 60) return { label: 'ปานกลาง', color: 'text-yellow-500' };
    if (strength <= 80) return { label: 'แข็งแรง', color: 'text-lime-500' };
    return { label: 'แข็งแรงมาก', color: 'text-green-500' };
  };

  const passwordSchema = z.object({
    newPassword: z.string()
      .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      .regex(/[a-z]/, 'ต้องมีตัวอักษรพิมพ์เล็ก')
      .regex(/[A-Z]/, 'ต้องมีตัวอักษรพิมพ์ใหญ่')
      .regex(/[0-9]/, 'ต้องมีตัวเลข')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'ต้องมีอักขระพิเศษ'),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = passwordSchema.safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[String(err.path[0])] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    
    setIsSubmitting(true);
    setSubmitResult(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        // Translate common error messages to Thai
        let errorMessage = error.message;
        if (error.message.includes('same password')) {
          errorMessage = 'รหัสผ่านใหม่ต้องไม่เหมือนกับรหัสผ่านเดิม กรุณาใช้รหัสผ่านที่ต่างจากเดิม';
        } else if (error.message.includes('weak')) {
          errorMessage = 'รหัสผ่านไม่ปลอดภัยเพียงพอ กรุณาใช้รหัสผ่านที่แข็งแรงกว่านี้';
        } else if (error.message.includes('session')) {
          errorMessage = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง';
        }
        
        setSubmitResult({ success: false, message: errorMessage });
        toast({
          variant: 'destructive',
          title: '❌ เปลี่ยนรหัสผ่านไม่สำเร็จ',
          description: errorMessage,
        });
      } else {
        setSubmitResult({ 
          success: true, 
          message: 'รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว คุณสามารถใช้รหัสผ่านใหม่ในการเข้าสู่ระบบครั้งต่อไป' 
        });
        toast({
          title: '✅ เปลี่ยนรหัสผ่านสำเร็จ',
          description: 'รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว',
        });
        // Clear form
        setNewPassword('');
        setConfirmPassword('');
        // Navigate back after a delay
        setTimeout(() => navigate(-1), 3000);
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      const errorMessage = error.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง';
      setSubmitResult({ success: false, message: errorMessage });
      toast({
        variant: 'destructive',
        title: '❌ เกิดข้อผิดพลาด',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthInfo = getPasswordStrengthLabel(passwordStrength);

  if (!user) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">กรุณาเข้าสู่ระบบ</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              ย้อนกลับ
            </Button>

            <Card>
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">เปลี่ยนรหัสผ่าน</CardTitle>
                    <CardDescription>
                      ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Success/Error Result Banner */}
                <AnimatePresence>
                  {submitResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4"
                    >
                      <Alert variant={submitResult.success ? "default" : "destructive"} className={submitResult.success ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}>
                        {submitResult.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                        <AlertTitle className={submitResult.success ? "text-green-800 dark:text-green-200" : ""}>
                          {submitResult.success ? '✅ เปลี่ยนรหัสผ่านสำเร็จ!' : '❌ เปลี่ยนรหัสผ่านไม่สำเร็จ'}
                        </AlertTitle>
                        <AlertDescription className={submitResult.success ? "text-green-700 dark:text-green-300" : ""}>
                          {submitResult.message}
                          {submitResult.success && (
                            <span className="block mt-1 text-sm">กำลังนำคุณกลับไปหน้าก่อนหน้า...</span>
                          )}
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Info about Reset Link Login */}
                <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                    หากคุณมาจากลิงก์ "รีเซ็ตรหัสผ่าน" ในอีเมล ระบบจะ login ให้อัตโนมัติเพื่อให้คุณเปลี่ยนรหัสผ่านได้ทันที
                  </AlertDescription>
                </Alert>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="text-sm text-destructive">{errors.newPassword}</p>
                    )}
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">ความแข็งแรงของรหัสผ่าน</span>
                        <span className={`text-sm font-medium ${strengthInfo.color}`}>
                          {strengthInfo.label}
                        </span>
                      </div>
                      <Progress value={passwordStrength} className="h-2" />
                      
                      {/* Requirements checklist */}
                      <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                        {passwordRequirements.map((req, index) => {
                          const passed = req.test(newPassword);
                          return (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              {passed ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className={passed ? 'text-foreground' : 'text-muted-foreground'}>
                                {req.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                    {confirmPassword && newPassword && confirmPassword === newPassword && (
                      <p className="text-sm text-green-500 flex items-center gap-1">
                        <Check className="h-3 w-3" /> รหัสผ่านตรงกัน
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting || passwordStrength < 100}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        กำลังเปลี่ยนรหัสผ่าน...
                      </span>
                    ) : (
                      'เปลี่ยนรหัสผ่าน'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default ChangePassword;
