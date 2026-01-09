import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { 
  Upload, Shield, DollarSign, Users, ArrowRight, Check, 
  Image, Plus, Loader2, Trash2, Edit2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ImageUploader from "@/components/ui/ImageUploader";
import OptimizedImage from "@/components/ui/OptimizedImage";

interface ArtistProfile {
  id: string;
  artist_name: string;
  is_verified: boolean | null;
}

interface Artwork {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  price: number;
  medium: string | null;
  dimensions: string | null;
  year: number | null;
  category: string | null;
  tools_used: string[] | null;
  is_verified: boolean | null;
  is_sold: boolean | null;
  created_at: string;
  // Cloudinary optimized image variants
  image_blur_url?: string | null;
  image_small_url?: string | null;
  image_medium_url?: string | null;
  image_large_url?: string | null;
  image_asset_id?: string | null;
}

export default function Sell() {
  const { t } = useTranslation();
  const { user, isArtist } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    medium: "",
    dimensions: "",
    year: new Date().getFullYear().toString(),
    category: "digital",
    tools_used: "",
  });
  const [artworkImage, setArtworkImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageData, setUploadedImageData] = useState<{
    image_url: string;
    image_blur_url?: string;
    image_small_url?: string;
    image_medium_url?: string;
    image_large_url?: string;
    image_asset_id?: string;
  } | null>(null);

  useEffect(() => {
    if (user && isArtist) {
      fetchArtistData();
    } else {
      setLoading(false);
    }
  }, [user, isArtist]);

  const fetchArtistData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get artist profile
      const { data: profile, error: profileError } = await supabase
        .from("artist_profiles")
        .select("id, artist_name, is_verified")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setArtistProfile(profile);

      // Get artist's artworks
      if (profile) {
        const { data: artworksData, error: artworksError } = await supabase
          .from("artworks")
          .select("*")
          .eq("artist_id", profile.id)
          .order("created_at", { ascending: false });

        if (artworksError) throw artworksError;
        setArtworks(artworksData || []);
      }
    } catch (error) {
      console.error("Error fetching artist data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArtworkImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUploadComplete = (result: {
    success: boolean;
    imageAsset?: {
      id: string;
      url_blur: string;
      url_small: string;
      url_medium: string;
      url_large: string;
    };
    variants?: {
      url_blur: string;
      url_small: string;
      url_medium: string;
      url_large: string;
    };
    image_url?: string;
    error?: string;
  }) => {
    if (result.success && result.image_url) {
      setUploadedImageData({
        image_url: result.image_url,
        image_blur_url: result.variants?.url_blur || result.imageAsset?.url_blur,
        image_small_url: result.variants?.url_small || result.imageAsset?.url_small,
        image_medium_url: result.variants?.url_medium || result.imageAsset?.url_medium,
        image_large_url: result.variants?.url_large || result.imageAsset?.url_large,
        image_asset_id: result.imageAsset?.id,
      });
      setImagePreview(result.image_url);
    }
  };

  const handleSubmit = async () => {
    // Check if we have either Cloudinary upload or legacy file
    const hasCloudinaryImage = !!uploadedImageData;
    const hasLegacyImage = !!artworkImage;

    if (!user || !artistProfile || (!hasCloudinaryImage && !hasLegacyImage)) {
      toast({
        title: "ข้อมูลไม่ครบ",
        description: "กรุณากรอกข้อมูลและอัพโหลดรูปภาพ",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "ราคาไม่ถูกต้อง",
        description: "กรุณากรอกราคาที่ถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    let uploadedPath: string | null = null;

    try {
      let imageUrl = uploadedImageData?.image_url || '';
      let imageBlurUrl = uploadedImageData?.image_blur_url || null;
      let imageSmallUrl = uploadedImageData?.image_small_url || null;
      let imageMediumUrl = uploadedImageData?.image_medium_url || null;
      let imageLargeUrl = uploadedImageData?.image_large_url || null;
      let imageAssetId = uploadedImageData?.image_asset_id || null;

      // Fallback to legacy Supabase Storage upload if no Cloudinary data
      if (!hasCloudinaryImage && hasLegacyImage) {
        const fileExt = artworkImage!.name.split(".").pop();
        const fileName = `${artistProfile.id}/${Date.now()}.${fileExt}`;
        uploadedPath = fileName;

        const { error: uploadError } = await supabase.storage
          .from("artworks")
          .upload(fileName, artworkImage!);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("artworks").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      // Create artwork record
      const { error: insertError } = await supabase.from("artworks").insert({
        artist_id: artistProfile.id,
        title: formData.title,
        description: formData.description || null,
        image_url: imageUrl,
        image_blur_url: imageBlurUrl,
        image_small_url: imageSmallUrl,
        image_medium_url: imageMediumUrl,
        image_large_url: imageLargeUrl,
        image_asset_id: imageAssetId,
        price,
        medium: formData.medium || null,
        dimensions: formData.dimensions || null,
        year: formData.year ? parseInt(formData.year) : null,
        category: formData.category || null,
        type: "original",
        tools_used: formData.tools_used
          ? formData.tools_used
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : null,
        is_verified: false,
        is_sold: false,
      });

      if (insertError) {
        // Best-effort cleanup of uploaded file to avoid orphans (legacy only)
        if (uploadedPath) {
          await supabase.storage.from("artworks").remove([uploadedPath]);
        }
        throw insertError;
      }

      toast({
        title: "อัพโหลดสำเร็จ!",
        description: "ผลงานของคุณถูกเพิ่มเรียบร้อยแล้ว",
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        price: "",
        medium: "",
        dimensions: "",
        year: new Date().getFullYear().toString(),
        category: "digital",
        tools_used: "",
      });
      setArtworkImage(null);
      setImagePreview(null);
      setUploadedImageData(null);
      setShowUploadDialog(false);
      fetchArtistData();
    } catch (error: any) {
      console.error("Error uploading artwork:", error);

      const code = error?.code as string | undefined;
      const msg = (error?.message as string | undefined) || "";

      let title = "อัพโหลดไม่สำเร็จ";
      let description = "กรุณาลองใหม่อีกครั้ง";

      // Friendly, actionable messages
      if (code === "23514" && msg.includes("artworks_category_check")) {
        title = "ประเภทงานไม่ถูกต้อง";
        description = "ระบบรองรับเฉพาะ: ดิจิทัล (digital) หรือ วาดมือ (traditional) เท่านั้น";
      } else if (code === "23514" && msg.includes("artworks_type_check")) {
        title = "ประเภทการขายไม่ถูกต้อง";
        description = "กรุณาเลือกประเภทการขายให้ถูกต้อง (original/commission)";
      } else if (msg.toLowerCase().includes("row-level security")) {
        title = "สิทธิ์ไม่เพียงพอ";
        description = "บัญชีนี้ยังไม่มีสิทธิ์อัพโหลด (ลองออก/เข้าใหม่ หรือเช็คว่าเป็นบทบาทศิลปินจริง)";
      } else if (code) {
        // Show DB error code in a readable way
        description = `${msg || description} (รหัส: ${code})`;
      } else if (msg) {
        description = msg;
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteArtwork = async (artworkId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบผลงานนี้?")) return;

    try {
      const { error } = await supabase
        .from("artworks")
        .delete()
        .eq("id", artworkId);

      if (error) throw error;

      toast({
        title: "ลบสำเร็จ",
        description: "ผลงานถูกลบเรียบร้อยแล้ว",
      });
      fetchArtistData();
    } catch (error) {
      console.error("Error deleting artwork:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบผลงานได้",
        variant: "destructive",
      });
    }
  };

  const benefits = [
    {
      icon: Shield,
      titleKey: "sell.benefitBadgeTitle",
      descKey: "sell.benefitBadgeDesc",
    },
    {
      icon: Users,
      titleKey: "sell.benefitCollectorsTitle",
      descKey: "sell.benefitCollectorsDesc",
    },
    {
      icon: DollarSign,
      titleKey: "sell.benefitCommissionTitle",
      descKey: "sell.benefitCommissionDesc",
    },
  ];

  const steps = [
    "sell.step1",
    "sell.step2",
    "sell.step3",
    "sell.step4",
    "sell.step5",
  ];

  const mediums = [
    "sell.medium1",
    "sell.medium2",
    "sell.medium3",
    "sell.medium4",
    "sell.medium5",
    "sell.medium6",
    "sell.medium7",
    "sell.medium8",
  ];

  const categories = [
    { value: "digital", label: "ดิจิทัล (Digital)" },
    { value: "traditional", label: "วาดมือ (Traditional)" },
  ];

  const mediumOptions = [
    "Digital Painting",
    "Oil Painting",
    "Watercolor",
    "Acrylic",
    "Pencil",
    "Ink",
    "Mixed Media",
    "Other",
  ];

  // Show artist dashboard if user is an artist
  if (user && isArtist && !loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Image className="h-8 w-8" />
                  ผลงานของฉัน
                </h1>
                {artistProfile && (
                  <p className="text-muted-foreground mt-1">
                    ศิลปิน: {artistProfile.artist_name}
                    {artistProfile.is_verified && (
                      <Badge className="ml-2 bg-green-500">ยืนยันแล้ว</Badge>
                    )}
                  </p>
                )}
              </div>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มผลงานใหม่
              </Button>
            </div>

            {/* Artworks Grid */}
            {artworks.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Image className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-xl font-semibold mb-2">ยังไม่มีผลงาน</h2>
                  <p className="text-muted-foreground mb-6">
                    เริ่มขายผลงานของคุณโดยการเพิ่มผลงานใหม่
                  </p>
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มผลงานแรก
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {artworks.map((artwork) => (
                  <Card key={artwork.id} className="overflow-hidden">
                    <div className="relative aspect-square">
                      <OptimizedImage
                        src={artwork.image_url}
                        variants={{
                          blur: artwork.image_blur_url || undefined,
                          small: artwork.image_small_url || undefined,
                          medium: artwork.image_medium_url || undefined,
                          large: artwork.image_large_url || undefined,
                        }}
                        alt={artwork.title}
                        variant="feed"
                        className="w-full h-full"
                        aspectRatio="square"
                      />
                      {artwork.is_sold && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                          <Badge className="text-lg py-2 px-4 bg-red-500">ขายแล้ว</Badge>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1 z-10">
                        {artwork.is_verified && (
                          <Badge className="bg-green-500">ยืนยันแล้ว</Badge>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold truncate">{artwork.title}</h3>
                      <p className="text-lg font-bold text-primary mt-1">
                        ฿{artwork.price.toLocaleString()}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/artwork/${artwork.id}`)}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          ดู
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteArtwork(artwork.id)}
                          disabled={artwork.is_sold || false}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>เพิ่มผลงานใหม่</DialogTitle>
              <DialogDescription>
                กรอกข้อมูลและอัพโหลดรูปภาพผลงานของคุณ
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Image Upload */}
              <div>
                <Label>รูปภาพผลงาน *</Label>
                <div className="mt-2">
                  <ImageUploader
                    folder="artworks"
                    onUploadComplete={handleImageUploadComplete}
                    onUploadError={(error) => {
                      toast({
                        title: "อัพโหลดรูปไม่สำเร็จ",
                        description: error,
                        variant: "destructive",
                      });
                    }}
                    onRemove={() => {
                      setUploadedImageData(null);
                      setImagePreview(null);
                      setArtworkImage(null);
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="title">ชื่อผลงาน *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="ชื่อผลงานของคุณ"
                  />
                </div>

                <div>
                  <Label htmlFor="price">ราคา (บาท) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="อธิบายเกี่ยวกับผลงานของคุณ..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="category">ประเภทงาน</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภทงาน" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="medium">สื่อ/เทคนิค</Label>
                  <Select
                    value={formData.medium}
                    onValueChange={(value) => setFormData({ ...formData, medium: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสื่อ/เทคนิค" />
                    </SelectTrigger>
                    <SelectContent>
                      {mediumOptions.map((med) => (
                        <SelectItem key={med} value={med}>{med}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="dimensions">ขนาด</Label>
                  <Input
                    id="dimensions"
                    value={formData.dimensions}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    placeholder="เช่น 30x40 cm"
                  />
                </div>

                <div>
                  <Label htmlFor="year">ปีที่สร้าง</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tools">เครื่องมือที่ใช้ (คั่นด้วยเครื่องหมาย ,)</Label>
                <Input
                  id="tools"
                  value={formData.tools_used}
                  onChange={(e) => setFormData({ ...formData, tools_used: e.target.value })}
                  placeholder="เช่น Photoshop, Wacom Tablet, Procreate"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                ยกเลิก
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={uploading || !formData.title || !formData.price || !artworkImage}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังอัพโหลด...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    อัพโหลดผลงาน
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }

  // Show landing page for non-artists
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h1 className="font-serif text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              {t('sell.heroTitle1')}{" "}
              <span className="text-primary">{t('sell.heroTitle2')}</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground lg:text-xl">
              {t('sell.heroDesc')}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              {user ? (
                isArtist ? (
                  <Button className="btn-hero-primary" onClick={() => setShowUploadDialog(true)}>
                    <Upload className="h-5 w-5" />
                    {t('sell.startSelling')}
                  </Button>
                ) : (
                  <Link to="/artist/my-profile">
                    <Button className="btn-hero-primary">
                      <Upload className="h-5 w-5" />
                      สมัครเป็นศิลปิน
                    </Button>
                  </Link>
                )
              ) : (
                <Link to="/auth">
                  <Button className="btn-hero-primary">
                    <Upload className="h-5 w-5" />
                    เข้าสู่ระบบเพื่อเริ่มขาย
                  </Button>
                </Link>
              )}
              <Link to="/verification" className="btn-hero-secondary">
                {t('sell.learnVerification')}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
              {t('sell.whyChoose')}
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft"
              >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <benefit.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground">
                  {t(benefit.titleKey)}
                </h3>
                <p className="mt-3 text-muted-foreground">{t(benefit.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-secondary/50 py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
                {t('sell.getStarted')}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {t('sell.getStartedDesc')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {steps.map((stepKey, index) => (
                <div
                  key={stepKey}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-soft"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-foreground">{t(stepKey)}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* What We Accept */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl"
          >
            <h2 className="text-center font-serif text-3xl font-bold text-foreground md:text-4xl">
              {t('sell.whatWeAccept')}
            </h2>
            <p className="mt-4 text-center text-muted-foreground">
              {t('sell.whatWeAcceptDesc')}
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {mediums.map((mediumKey) => (
                <div
                  key={mediumKey}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
                >
                  <Check className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground">{t(mediumKey)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-card py-20">
        <div className="container mx-auto px-4 text-center lg:px-8">
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            {t('sell.ctaTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {t('sell.ctaDesc')}
          </p>
          <div className="mt-8">
            {user ? (
              isArtist ? (
                <Button className="btn-hero-primary" onClick={() => setShowUploadDialog(true)}>
                  <Upload className="h-5 w-5" />
                  {t('sell.applyNow')}
                </Button>
              ) : (
                <Link to="/artist/my-profile">
                  <Button className="btn-hero-primary">
                    <Upload className="h-5 w-5" />
                    สมัครเป็นศิลปิน
                  </Button>
                </Link>
              )
            ) : (
              <Link to="/auth">
                <Button className="btn-hero-primary">
                  <Upload className="h-5 w-5" />
                  เข้าสู่ระบบเพื่อเริ่มขาย
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
