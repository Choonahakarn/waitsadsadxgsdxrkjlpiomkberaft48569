import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, CheckCircle, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const emailFromParams = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailFromParams);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleResendEmail = async () => {
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
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'ส่งอีเมลไม่สำเร็จ',
          description: error.message,
        });
      } else {
        setResendSuccess(true);
        toast({
          title: '📧 ส่งอีเมลยืนยันสำเร็จ!',
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
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">ยืนยันอีเมลของคุณ</CardTitle>
                <CardDescription className="text-base">
                  เราได้ส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    กรุณาตรวจสอบกล่องจดหมาย (และโฟลเดอร์สแปม) แล้วคลิกลิงก์ยืนยันเพื่อเปิดใช้งานบัญชีของคุณ
                  </p>
                </div>

                {resendSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-950 dark:text-green-300"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm">ส่งอีเมลยืนยันใหม่เรียบร้อยแล้ว!</span>
                  </motion.div>
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
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleResendEmail}
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
                        ส่งอีเมลยืนยันอีกครั้ง
                      </>
                    )}
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <p className="mb-3 text-center text-sm text-muted-foreground">
                    ยืนยันอีเมลแล้ว?
                  </p>
                  <Button
                    onClick={() => navigate('/auth')}
                    variant="default"
                    className="w-full"
                  >
                    เข้าสู่ระบบ
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  กลับหน้าหลัก
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default VerifyEmail;
