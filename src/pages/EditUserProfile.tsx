import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, Loader2, ArrowLeft, ImagePlus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImagePositioner } from '@/components/ui/ImagePositioner';
import { ImageCropper } from '@/components/ui/ImageCropper';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  display_name: string | null;
  display_name_changed_at: string | null;
  bio: string | null;
  website: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  cover_position_y: number | null;
  avatar_position_x: number | null;
  avatar_position_y: number | null;
}

const EditUserProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  
  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [cropperType, setCropperType] = useState<'avatar' | 'cover'>('avatar');
  // Pending images to upload (stored as blob URLs for preview)
  const [pendingAvatarBlob, setPendingAvatarBlob] = useState<Blob | null>(null);
  const [pendingCoverBlob, setPendingCoverBlob] = useState<Blob | null>(null);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null);
  const [pendingCoverUrl, setPendingCoverUrl] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [showDisplayNameConfirm, setShowDisplayNameConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else if (data) {
        setProfile(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setWebsite(data.website || '');
      }
      setIsLoading(false);
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl);
      if (pendingCoverUrl) URL.revokeObjectURL(pendingCoverUrl);
    };
  }, [pendingAvatarUrl, pendingCoverUrl]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropperFile(file);
      setCropperType('avatar');
      setCropperOpen(true);
    }
    e.target.value = '';
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropperFile(file);
      setCropperType('cover');
      setCropperOpen(true);
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const isAvatar = cropperType === 'avatar';
    
    // Create preview URL from blob
    const previewUrl = URL.createObjectURL(croppedBlob);
    
    if (isAvatar) {
      setPendingAvatarBlob(croppedBlob);
      setPendingAvatarUrl(previewUrl);
    } else {
      setPendingCoverBlob(croppedBlob);
      setPendingCoverUrl(previewUrl);
    }
    
    // Close cropper dialog
    setCropperOpen(false);
    setCropperFile(null);
    
    toast({
      title: isAvatar ? 'เลือกรูปโปรไฟล์แล้ว' : 'เลือกรูปปกแล้ว',
      description: 'กดปุ่ม "บันทึก" เพื่อบันทึกการเปลี่ยนแปลง',
    });
  };

  const handleCoverPositionChange = async (positionY: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ cover_position_y: positionY })
      .eq('id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, cover_position_y: positionY } : null);
    }
  };

  const handleAvatarPositionChange = async (positionX: number, positionY: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ 
        avatar_position_x: positionX,
        avatar_position_y: positionY 
      })
      .eq('id', user.id);

    if (!error) {
      setProfile(prev => prev ? { 
        ...prev, 
        avatar_position_x: positionX,
        avatar_position_y: positionY 
      } : null);
    }
  };

  // Check if display name can be changed (30 day restriction)
  const canChangeDisplayName = () => {
    if (!profile?.display_name_changed_at) return true;
    const lastChanged = new Date(profile.display_name_changed_at);
    const now = new Date();
    const daysSinceChange = (now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange >= 30;
  };

  const getDaysUntilDisplayNameChange = () => {
    if (!profile?.display_name_changed_at) return 0;
    const lastChanged = new Date(profile.display_name_changed_at);
    const now = new Date();
    const daysSinceChange = (now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(30 - daysSinceChange));
  };

  const handleSaveClick = () => {
    if (!user) return;

    // Validate display name - no spaces or @ allowed
    if (/[\s@]/.test(displayName)) {
      toast({
        variant: 'destructive',
        title: 'ชื่อที่แสดงห้ามมีเว้นวรรคและ @',
        description: 'กรุณาใช้ขีดล่าง (_) หรือตัวเชื่อมอื่นแทน',
      });
      return;
    }

    // Check if display name changed and if it's allowed
    const displayNameChanged = displayName !== (profile?.display_name || '');
    if (displayNameChanged && !canChangeDisplayName()) {
      toast({
        variant: 'destructive',
        title: 'ไม่สามารถเปลี่ยนชื่อที่แสดงได้',
        description: `คุณต้องรออีก ${getDaysUntilDisplayNameChange()} วัน ก่อนเปลี่ยนชื่อที่แสดงอีกครั้ง`,
      });
      return;
    }

    // If display name is being changed, show confirmation dialog
    if (displayNameChanged && canChangeDisplayName()) {
      setShowDisplayNameConfirm(true);
      return;
    }

    // Otherwise, save directly
    performSave(false);
  };

  const performSave = async (isDisplayNameChanged: boolean) => {
    if (!user) return;

    setIsSaving(true);

    try {
      // Upload pending avatar if exists
      if (pendingAvatarBlob) {
        setIsUploading(true);
        try {
          const fileName = `${user.id}/${Date.now()}-avatar.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, pendingAvatarBlob, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', user.id);

          if (updateError) throw updateError;

          setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
          
          // Clean up
          if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl);
          setPendingAvatarBlob(null);
          setPendingAvatarUrl(null);
        } catch (error: any) {
          console.error('Avatar upload error:', error);
          throw error;
        } finally {
          setIsUploading(false);
        }
      }

      // Upload pending cover if exists
      if (pendingCoverBlob) {
        setIsUploadingCover(true);
        try {
          const fileName = `${user.id}/${Date.now()}-cover.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, pendingCoverBlob, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          const { error: updateError } = await supabase
            .from('profiles')
            .update({ cover_url: publicUrl })
            .eq('id', user.id);

          if (updateError) throw updateError;

          setProfile(prev => prev ? { ...prev, cover_url: publicUrl } : null);
          
          // Clean up
          if (pendingCoverUrl) URL.revokeObjectURL(pendingCoverUrl);
          setPendingCoverBlob(null);
          setPendingCoverUrl(null);
        } catch (error: any) {
          console.error('Cover upload error:', error);
          throw error;
        } finally {
          setIsUploadingCover(false);
        }
      }

      const fullName = `${firstName} ${lastName}`.trim();
      
      // Build update object
      const updateData: Record<string, any> = {
        first_name: firstName || null,
        last_name: lastName || null,
        full_name: fullName || null,
        bio: bio || null,
        website: website || null,
      };

      // Only update display_name and timestamp if it actually changed
      if (isDisplayNameChanged) {
        updateData.display_name = displayName || null;
        updateData.display_name_changed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      // Update local profile state
      if (isDisplayNameChanged) {
        setProfile(prev => prev ? {
          ...prev,
          display_name: displayName || null,
          display_name_changed_at: new Date().toISOString()
        } : null);
      }

      toast({
        title: 'บันทึกโปรไฟล์สำเร็จ',
        description: 'บันทึกข้อมูลโปรไฟล์เสร็จสิ้นแล้ว',
      });

      // Navigate to profile page after successful save
      setTimeout(() => {
        navigate(`/profile/${user.id}`);
      }, 1000);
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        title: 'บันทึกไม่สำเร็จ',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDisplayNameChange = () => {
    setShowDisplayNameConfirm(false);
    performSave(true);
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
      <section className="py-8 md:py-12">
        <div className="container max-w-2xl">
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

            <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
              แก้ไขโปรไฟล์
            </h1>
            <p className="mt-2 text-muted-foreground mb-6">
              แก้ไขข้อมูลโปรไฟล์ของคุณ
            </p>

            {/* Cover Image Card */}
            <Card>
              <CardHeader>
                <CardTitle>รูปปก</CardTitle>
                <CardDescription>
                  รูปปกจะแสดงด้านบนโปรไฟล์ของคุณ (แนะนำ 1920x750 pixels)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(pendingCoverUrl || profile?.cover_url) ? (
                  <ImagePositioner
                    imageUrl={pendingCoverUrl || profile.cover_url || ''}
                    positionY={profile.cover_position_y ?? 50}
                    onPositionChange={handleCoverPositionChange}
                    aspectRatio="cover"
                    className="w-full h-40 rounded-lg"
                  />
                ) : (
                  <div className="w-full h-40 rounded-lg bg-gradient-to-br from-primary/20 via-muted to-background flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">ยังไม่มีรูปปก</p>
                  </div>
                )}
                {pendingCoverUrl && (
                  <p className="text-xs text-amber-600 mt-2 text-center">⚠️ รูปปกใหม่ (ยังไม่ได้บันทึก)</p>
                )}
                <div className="mt-4 flex justify-center">
                  <label
                    htmlFor="cover-upload"
                    className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline"
                  >
                    {isUploadingCover ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    {profile?.cover_url ? 'เปลี่ยนรูปปก' : 'อัปโหลดรูปปก'}
                  </label>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverSelect}
                    disabled={isUploadingCover}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Avatar Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>รูปโปรไฟล์</CardTitle>
                <CardDescription>
                  รูปโปรไฟล์จะแสดงในโพสต์และคอมเมนต์ของคุณ
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage 
                      src={pendingAvatarUrl || profile?.avatar_url || ''} 
                      alt="Profile"
                      style={{
                        objectPosition: `${profile?.avatar_position_x ?? 50}% ${profile?.avatar_position_y ?? 50}%`
                      }}
                    />
                    <AvatarFallback className="text-3xl">
                      {firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {pendingAvatarUrl && (
                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                      ใหม่
                    </div>
                  )}
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarSelect}
                    disabled={isUploading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Profile Info Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>ข้อมูลส่วนตัว</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">ชื่อ</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="ชื่อของคุณ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">นามสกุล</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="นามสกุลของคุณ"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">ชื่อที่แสดง (Display Name)</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => {
                      // Remove spaces and @ from display name
                      const valueWithoutInvalid = e.target.value.replace(/[\s@]/g, '');
                      setDisplayName(valueWithoutInvalid);
                    }}
                    placeholder="ชื่อที่จะแสดงในคอมมูนิตี้ (ไม่มีเว้นวรรคและ @)"
                    disabled={!canChangeDisplayName()}
                  />
                  {/[\s@]/.test(displayName) && (
                    <p className="text-xs text-red-500">
                      ⚠️ ชื่อที่แสดงห้ามมีเว้นวรรคและ @
                    </p>
                  )}
                  {!canChangeDisplayName() ? (
                    <p className="text-xs text-orange-600">
                      ⏳ คุณต้องรออีก {getDaysUntilDisplayNameChange()} วัน ก่อนเปลี่ยนชื่อที่แสดงอีกครั้ง
                    </p>
                  ) : displayName !== (profile?.display_name || '') ? (
                    <p className="text-xs text-orange-600">
                      ⚠️ คำเตือน: หลังจากเปลี่ยนชื่อที่แสดง คุณจะต้องรอ 30 วันก่อนเปลี่ยนอีกครั้ง
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      ชื่อนี้จะแสดงแทนชื่อจริงในความคิดเห็นและการแชร์โพสต์ (เปลี่ยนได้ทุก 30 วัน, ไม่มีเว้นวรรค)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">เกี่ยวกับฉัน</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="เล่าเกี่ยวกับตัวคุณ..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">เว็บไซต์</Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="pt-4">
                  <Button onClick={handleSaveClick} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    บันทึก
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Image Cropper Dialog */}
          <ImageCropper
            imageFile={cropperFile}
            open={cropperOpen}
            onClose={() => {
              setCropperOpen(false);
              setCropperFile(null);
            }}
            onCropComplete={handleCropComplete}
            aspectRatio={cropperType === 'avatar' ? 1 : 1920 / 750}
            title={cropperType === 'avatar' ? 'ครอปรูปโปรไฟล์' : 'ครอปรูปปก'}
          />
        </div>
      </section>

      {/* Confirmation Dialog for Display Name Change */}
      <AlertDialog open={showDisplayNameConfirm} onOpenChange={setShowDisplayNameConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              ยืนยันการเปลี่ยนชื่อที่แสดง
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>คุณต้องการเปลี่ยนชื่อที่แสดงเป็น <strong>"{displayName}"</strong> ใช่หรือไม่?</p>
              <p className="text-amber-600 font-medium">
                ⚠️ หลังจากเปลี่ยนแล้ว คุณจะต้องรอ 30 วัน ก่อนเปลี่ยนชื่อที่แสดงอีกครั้ง
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDisplayNameChange}>
              ยืนยันเปลี่ยนชื่อ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default EditUserProfile;
