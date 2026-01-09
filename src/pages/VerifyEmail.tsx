import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Mail, CheckCircle, RefreshCw, ArrowLeft, Loader2, Palette } from 'lucide-react';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const emailFromParams = searchParams.get('email') || '';
  const isArtist = searchParams.get('artist') === 'true';
  
  const [email, setEmail] = useState(emailFromParams);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Start cooldown timer on mount for artists
  useEffect(() => {
    if (isArtist && emailFromParams) {
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isArtist, emailFromParams]);

  const handleVerifyOtp = async () => {
    if (!email || !otp || otp.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'กรุณากรอกรหัส OTP 6 หลัก',
      });
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'ยืนยันไม่สำเร็จ',
          description: data.error || 'รหัส OTP ไม่ถูกต้อง',
        });
      } else {
        setVerifySuccess(true);
        toast({
          title: '✅ ยืนยันอีเมลสำเร็จ!',
          description: 'กรุณาเข้าสู่ระบบเพื่อเริ่มใช้งาน',
        });
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email || !email.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'กรุณากรอกอีเมลให้ถูกต้อง',
      });
      return;
    }

    if (resendCooldown > 0) {
      toast({
        variant: 'destructive',
        title: `กรุณารอ ${resendCooldown} วินาที ก่อนส่งอีกครั้ง`,
      });
      return;
    }

    setIsResending(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, type: 'resend' }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'ส่ง OTP ไม่สำเร็จ',
          description: data.error || 'เกิดข้อผิดพลาด',
        });
      } else {
        toast({
          title: '📧 ส่งรหัส OTP ใหม่สำเร็จ!',
          description: 'กรุณาตรวจสอบกล่องจดหมายของคุณ',
        });

        // Start cooldown (60 seconds)
        setResendCooldown(60);
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
      });
    } finally {
      setIsResending(false);
    }
  };

  if (verifySuccess) {
    return (
      <Layout>
        <section className="py-16 md:py-24">
          <div className="container max-w-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-foreground">ยืนยันอีเมลสำเร็จ!</h2>
                  <p className="mb-6 text-muted-foreground">
                    กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...
                  </p>
                  <div className="h-4 w-4 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
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
          >
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  {isArtist ? (
                    <Palette className="h-8 w-8 text-primary" />
                  ) : (
                    <Mail className="h-8 w-8 text-primary" />
                  )}
                </div>
                <CardTitle className="text-2xl">
                  {isArtist ? 'ยืนยันอีเมลศิลปิน' : 'ยืนยันอีเมลของคุณ'}
                </CardTitle>
                <CardDescription className="text-base">
                  {isArtist 
                    ? 'เราได้ส่งรหัส OTP 6 หลักไปที่อีเมลของคุณ'
                    : 'กรุณากรอกรหัส OTP ที่ได้รับทางอีเมล'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isArtist && (
                  <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-4 text-center">
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      🎨 ศิลปินต้องยืนยันอีเมลก่อนเริ่มขายผลงาน
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมลที่ใช้สมัคร</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        disabled={!!emailFromParams}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>รหัส OTP (6 หลัก)</Label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(value) => setOtp(value)}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  <Button
                    onClick={handleVerifyOtp}
                    disabled={isVerifying || otp.length !== 6}
                    className="w-full"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังยืนยัน...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        ยืนยันอีเมล
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleResendOtp}
                    disabled={isResending || resendCooldown > 0}
                    className="w-full"
                    variant="outline"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังส่ง...
                      </>
                    ) : resendCooldown > 0 ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        ส่งอีกครั้งใน {resendCooldown} วินาที
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        ส่งรหัส OTP อีกครั้ง
                      </>
                    )}
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <Button
                    onClick={() => navigate('/auth')}
                    variant="ghost"
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    กลับหน้าเข้าสู่ระบบ
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default VerifyEmail;