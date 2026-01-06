import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileImage, Clock, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface VerificationSubmission {
  id: string;
  document_type: string;
  document_url: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface ArtistProfile {
  id: string;
  is_verified: boolean;
  identity_verified: boolean;
}

const VerificationSubmit = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, roles } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [submissions, setSubmissions] = useState<VerificationSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [documentType, setDocumentType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isArtist = roles.includes('artist');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isArtist) {
      navigate('/');
    }
  }, [user, authLoading, isArtist, navigate]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch artist profile
    const { data: profileData } = await supabase
      .from('artist_profiles')
      .select('id, is_verified, identity_verified')
      .eq('user_id', user.id)
      .single();

    if (profileData) {
      setArtistProfile(profileData);

      // Fetch submissions
      const { data: submissionsData } = await supabase
        .from('verification_submissions')
        .select('*')
        .eq('artist_id', profileData.id)
        .order('created_at', { ascending: false });

      setSubmissions(submissionsData || []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (user && isArtist) {
      fetchData();
    }
  }, [user, isArtist]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!user || !artistProfile || !selectedFile || !documentType) {
      toast({
        variant: 'destructive',
        title: t('verification.missingFields', 'กรุณากรอกข้อมูลให้ครบ'),
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload file
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(fileName);

      // Create submission
      const { error: insertError } = await supabase
        .from('verification_submissions')
        .insert({
          artist_id: artistProfile.id,
          document_type: documentType,
          document_url: urlData.publicUrl,
          description: description || null,
        });

      if (insertError) throw insertError;

      // Update artist profile
      await supabase
        .from('artist_profiles')
        .update({ verification_submitted_at: new Date().toISOString() })
        .eq('id', artistProfile.id);

      toast({
        title: t('verification.submitted', 'ส่งเอกสารสำเร็จ'),
        description: t('verification.submittedDesc', 'รอการตรวจสอบจากทีมงาน'),
      });

      // Reset form
      setDocumentType('');
      setDescription('');
      setSelectedFile(null);
      fetchData();
    } catch (error: unknown) {
      console.error('Submit error:', error);
      toast({
        variant: 'destructive',
        title: t('verification.submitError', 'ส่งเอกสารไม่สำเร็จ'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />{t('verification.approved', 'อนุมัติแล้ว')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />{t('verification.rejected', 'ถูกปฏิเสธ')}</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />{t('verification.pending', 'รอตรวจสอบ')}</Badge>;
    }
  };

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sketch: t('verification.docSketch', 'ภาพร่าง'),
      wip: t('verification.docWip', 'งานระหว่างทำ'),
      timelapse: t('verification.docTimelapse', 'ไทม์แลปส์/บันทึกหน้าจอ'),
      photo: t('verification.docPhoto', 'รูปถ่ายกระบวนการทำงาน'),
    };
    return labels[type] || type;
  };

  if (authLoading || isLoading) {
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
        <div className="container max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link to="/artist/my-profile" className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              {t('common.back', 'กลับ')}
            </Link>

            <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
              {t('verification.submitTitle', 'ยืนยันตัวตนศิลปิน')}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t('verification.submitDesc', 'ส่งเอกสารเพื่อยืนยันว่าคุณเป็นศิลปินมนุษย์จริงๆ')}
            </p>

            {/* Status */}
            <div className="mt-4 flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('verification.artistVerified', 'สถานะศิลปิน')}:</span>
                {artistProfile?.is_verified ? (
                  <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />ยืนยันแล้ว</Badge>
                ) : (
                  <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />รอยืนยัน</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('verification.identityVerified', 'สถานะตัวตน')}:</span>
                {artistProfile?.identity_verified ? (
                  <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="mr-1 h-3 w-3" />ยืนยันแล้ว</Badge>
                ) : (
                  <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />รอยืนยัน</Badge>
                )}
              </div>
            </div>
          </motion.div>

          {/* Submit new document */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {t('verification.uploadDoc', 'อัปโหลดเอกสาร')}
                </CardTitle>
                <CardDescription>
                  {t('verification.uploadHint', 'อัปโหลดภาพร่าง งานระหว่างทำ หรือบันทึกการทำงาน')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('verification.docType', 'ประเภทเอกสาร')}</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('verification.selectDocType', 'เลือกประเภท')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sketch">{t('verification.docSketch', 'ภาพร่าง')}</SelectItem>
                      <SelectItem value="wip">{t('verification.docWip', 'งานระหว่างทำ (WIP)')}</SelectItem>
                      <SelectItem value="timelapse">{t('verification.docTimelapse', 'ไทม์แลปส์/บันทึกหน้าจอ')}</SelectItem>
                      <SelectItem value="photo">{t('verification.docPhoto', 'รูปถ่ายกระบวนการทำงาน')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('verification.file', 'ไฟล์')}</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 hover:bg-accent">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      {selectedFile ? (
                        <div className="flex items-center gap-2">
                          <FileImage className="h-5 w-5 text-primary" />
                          <span className="text-sm">{selectedFile.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Upload className="h-8 w-8" />
                          <span>{t('verification.clickToUpload', 'คลิกเพื่ออัปโหลด')}</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('verification.description', 'คำอธิบาย (ไม่บังคับ)')}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('verification.descPlaceholder', 'อธิบายเพิ่มเติมเกี่ยวกับเอกสารนี้...')}
                    rows={3}
                  />
                </div>

                <Button onClick={handleSubmit} disabled={isSubmitting || !selectedFile || !documentType}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {t('verification.submit', 'ส่งเอกสาร')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Previous submissions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('verification.previousSubmissions', 'เอกสารที่ส่งแล้ว')}</CardTitle>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t('verification.noSubmissions', 'ยังไม่มีเอกสารที่ส่ง')}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                          <FileImage className="h-10 w-10 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{getDocTypeLabel(sub.document_type)}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(sub.created_at).toLocaleDateString('th-TH')}
                            </p>
                            {sub.description && (
                              <p className="text-sm text-muted-foreground">{sub.description}</p>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(sub.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default VerificationSubmit;
