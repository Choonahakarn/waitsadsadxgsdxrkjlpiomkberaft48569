import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, CheckCircle, RefreshCw, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const emailFromParams = searchParams.get('email') || '';
  const [email] = useState(emailFromParams);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifySuccess, setVerifySuccess] = useState(false);

  // Auto verify when OTP is complete
  useEffect(() => {
    if (otpCode.length === 6) {
      handleVerifyOtp();
    }
  }, [otpCode]);

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'กรุณากรอกรหัส OTP ให้ครบ 6 หลัก',
      });
      return;
    }

    if (!email) {
      toast({
        variant: 'destructive',
        title: 'ไม่พบอีเมล กรุณาสมัครสมาชิกใหม่',
      });
      return;
    }

    setIsVerifying(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otpCode,
        type: 'signup',
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'ยืนยันไม่สำเร็จ',
          description: error.message === 'Token has expired or is invalid' 
            ? 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่'
            : error.message,
        });
        setOtpCode('');
      } else if (data.session) {
        setVerifySuccess(true);
        toast({
          title: '🎉 ยืนยันอีเมลสำเร็จ!',
          description: 'บัญชีของคุณพร้อมใช้งานแล้ว',
        });
        
        // Redirect to home after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
      });
      setOtpCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email || !email.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'ไม่พบอีเมล กรุณาสมัครสมาชิกใหม่',
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
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'ส่งรหัสไม่สำเร็จ',
          description: error.message,
        });
      } else {
        toast({
          title: '📧 ส่งรหัส OTP สำเร็จ!',
          description: 'กรุณาตรวจสอบอีเมลของคุณ',
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
                <CardContent className="pt-8 pb-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-950"
                  >
                    <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">ยืนยันอีเมลสำเร็จ!</h2>
                  <p className="text-muted-foreground mb-4">
                    บัญชีของคุณพร้อมใช้งานแล้ว กำลังพาคุณไปหน้าหลัก...
                  </p>
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
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
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">ยืนยันอีเมลของคุณ</CardTitle>
                <CardDescription className="text-base">
                  เราได้ส่งรหัส OTP 6 หลักไปที่
                </CardDescription>
                {email && (
                  <p className="font-medium text-foreground mt-1">{email}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    กรุณาตรวจสอบกล่องจดหมาย (และโฟลเดอร์สแปม) แล้วกรอกรหัส 6 หลักที่ได้รับ
                  </p>
                </div>

                {/* OTP Input */}
                <div className="flex flex-col items-center space-y-4">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(value) => setOtpCode(value)}
                    disabled={isVerifying}
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

                  {isVerifying && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">กำลังตรวจสอบ...</span>
                    </div>
                  )}
                </div>

                {/* Resend OTP */}
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">ไม่ได้รับรหัส?</p>
                  <Button
                    onClick={handleResendOtp}
                    disabled={isResending || resendCooldown > 0}
                    variant="outline"
                    size="sm"
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

                <div className="border-t pt-4 space-y-3">
                  <Button
                    onClick={() => navigate('/auth')}
                    variant="ghost"
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    กลับไปหน้าเข้าสู่ระบบ
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