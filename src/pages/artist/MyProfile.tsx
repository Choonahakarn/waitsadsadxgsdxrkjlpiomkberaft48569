import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface ArtistProfile {
  id: string;
  user_id: string;
  artist_name: string;
  bio: string | null;
  avatar_url: string | null;
  specialty: string | null;
  portfolio_url: string | null;
  tools_used: string[] | null;
  years_experience: number | null;
}

const MyArtistProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, roles } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [artistName, setArtistName] = useState('');
  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [toolsUsed, setToolsUsed] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');

  const isArtist = roles.includes('artist');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isArtist) {
      navigate('/');
    }
  }, [user, authLoading, isArtist, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else if (data) {
        setProfile(data);
        setArtistName(data.artist_name || '');
        setBio(data.bio || '');
        setSpecialty(data.specialty || '');
        setPortfolioUrl(data.portfolio_url || '');
        setToolsUsed(data.tools_used?.join(', ') || '');
        setYearsExperience(data.years_experience?.toString() || '');
      }

      setIsLoading(false);
    };

    if (user && isArtist) {
      fetchProfile();
    }
  }, [user, isArtist]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('artist_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
      toast({
        title: t('profile.avatarUpdated', 'อัปเดตรูปโปรไฟล์สำเร็จ'),
      });
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: t('profile.uploadError', 'อัปโหลดไม่สำเร็จ'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('artist_profiles')
        .update({
          artist_name: artistName,
          bio,
          specialty,
          portfolio_url: portfolioUrl || null,
          tools_used: toolsUsed.split(',').map(t => t.trim()).filter(Boolean),
          years_experience: yearsExperience ? parseInt(yearsExperience) : null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: t('profile.saved', 'บันทึกโปรไฟล์สำเร็จ'),
      });
    } catch (error: unknown) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        title: t('profile.saveError', 'บันทึกไม่สำเร็จ'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
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
            <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
              {t('profile.myProfile', 'โปรไฟล์ของฉัน')}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t('profile.editDescription', 'แก้ไขข้อมูลโปรไฟล์ศิลปินของคุณ')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.profilePicture', 'รูปโปรไฟล์')}</CardTitle>
                <CardDescription>
                  {t('profile.pictureHint', 'คลิกที่รูปเพื่อเปลี่ยนรูปโปรไฟล์')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="text-2xl">
                      {artistName?.[0]?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={isUploading}
                  />
                </div>
                <div>
                  <p className="font-medium">{artistName || t('profile.noName', 'ยังไม่ได้ตั้งชื่อ')}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{t('profile.basicInfo', 'ข้อมูลพื้นฐาน')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="artist-name">{t('profile.artistName', 'ชื่อศิลปิน')}</Label>
                  <Input
                    id="artist-name"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder={t('profile.artistNamePlaceholder', 'ชื่อที่จะแสดงในโปรไฟล์')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">{t('profile.bio', 'เกี่ยวกับฉัน')}</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t('profile.bioPlaceholder', 'เล่าเรื่องราวของคุณ...')}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialty">{t('profile.specialty', 'ความเชี่ยวชาญ')}</Label>
                  <Input
                    id="specialty"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder={t('profile.specialtyPlaceholder', 'เช่น Portrait, Landscape, Abstract')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tools">{t('profile.tools', 'เครื่องมือที่ใช้')}</Label>
                  <Input
                    id="tools"
                    value={toolsUsed}
                    onChange={(e) => setToolsUsed(e.target.value)}
                    placeholder={t('profile.toolsPlaceholder', 'คั่นด้วยเครื่องหมายจุลภาค เช่น Photoshop, Procreate, Oil Paint')}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="portfolio">{t('profile.portfolio', 'Portfolio URL')}</Label>
                    <Input
                      id="portfolio"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience">{t('profile.experience', 'ประสบการณ์ (ปี)')}</Label>
                    <Input
                      id="experience"
                      type="number"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {t('common.save', 'บันทึก')}
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

export default MyArtistProfile;
