import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Calendar, Ruler, Palette, ShoppingCart, MessageCircle, Wallet, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { ArtworkCard } from "@/components/artwork/ArtworkCard";
import { Button } from "@/components/ui/button";
import { TranslateButton } from "@/components/ui/TranslateButton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Artwork {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  price: number;
  medium: string | null;
  dimensions: string | null;
  year: number | null;
  tools_used: string[] | null;
  is_verified: boolean | null;
  is_sold: boolean | null;
  artist_id: string;
  artist_profiles?: {
    id: string;
    artist_name: string;
    is_verified: boolean | null;
  };
}

export default function ArtworkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [otherArtworks, setOtherArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [purchasing, setPurchasing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchArtwork();
    }
  }, [id]);

  useEffect(() => {
    if (user) {
      fetchWalletBalance();
    }
  }, [user]);

  const fetchArtwork = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("artworks")
        .select(`
          *,
          artist_profiles (id, artist_name, is_verified)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      setArtwork(data);

      // Fetch other artworks by the same artist
      if (data?.artist_id) {
        const { data: others } = await supabase
          .from("artworks")
          .select(`
            *,
            artist_profiles (id, artist_name, is_verified)
          `)
          .eq("artist_id", data.artist_id)
          .neq("id", id)
          .limit(4);
        
        setOtherArtworks(others || []);
      }
    } catch (error) {
      console.error("Error fetching artwork:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    
    setWalletBalance(data?.balance || 0);
  };

  const handlePurchase = async () => {
    if (!user || !artwork) return;

    setPurchasing(true);
    try {
      const { data, error } = await supabase.rpc("purchase_artwork", {
        p_artwork_id: artwork.id,
        p_buyer_id: user.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (result.success) {
        toast({
          title: "🎉 ซื้อสำเร็จ!",
          description: result.message,
        });
        setShowConfirmDialog(false);
        fetchArtwork();
        fetchWalletBalance();
      } else {
        toast({
          title: "ไม่สามารถซื้อได้",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error purchasing:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถทำรายการได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleBuyClick = () => {
    if (!user) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        description: "คุณต้องเข้าสู่ระบบก่อนซื้อผลงาน",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setShowConfirmDialog(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
        </div>
      </Layout>
    );
  }

  if (!artwork) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-serif text-3xl font-bold text-foreground">
            ไม่พบผลงาน
          </h1>
          <Link to="/marketplace" className="mt-4 inline-block text-primary hover:underline">
            กลับไปหน้า Marketplace
          </Link>
        </div>
      </Layout>
    );
  }

  const canAfford = walletBalance >= artwork.price;

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="border-b border-border bg-secondary/30 py-4">
        <div className="container mx-auto px-4 lg:px-8">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไปหน้า Marketplace
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Artwork Image */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="overflow-hidden rounded-2xl shadow-elevated relative">
                <img
                  src={artwork.image_url}
                  alt={artwork.title}
                  className="w-full object-cover"
                />
                {artwork.is_sold && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Badge className="text-2xl py-3 px-6 bg-red-500">ขายแล้ว</Badge>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Artwork Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex flex-col"
            >
              {artwork.is_verified && (
                <VerificationBadge variant="verified" className="mb-4 w-fit" />
              )}

              <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
                {artwork.title}
              </h1>

              <Link
                to={`/artist/${artwork.artist_id}`}
                className="mt-3 text-lg text-muted-foreground transition-colors hover:text-foreground"
              >
                by {artwork.artist_profiles?.artist_name || "Unknown Artist"}
              </Link>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold text-foreground">
                  ฿{artwork.price.toLocaleString()}
                </span>
              </div>

              {artwork.description && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <TranslateButton 
                      text={artwork.description} 
                      onTranslated={(text) => setTranslatedDescription(text)} 
                    />
                    {translatedDescription && (
                      <button 
                        onClick={() => setTranslatedDescription(null)}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="leading-relaxed text-muted-foreground">
                    {translatedDescription || artwork.description}
                  </p>
                </div>
              )}

              {/* Details */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                {artwork.medium && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Palette className="h-4 w-4" />
                      <span className="text-sm">Medium</span>
                    </div>
                    <p className="mt-1 font-medium text-foreground">{artwork.medium}</p>
                  </div>
                )}

                {artwork.dimensions && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Ruler className="h-4 w-4" />
                      <span className="text-sm">Dimensions</span>
                    </div>
                    <p className="mt-1 font-medium text-foreground">{artwork.dimensions}</p>
                  </div>
                )}

                {artwork.year && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Year</span>
                    </div>
                    <p className="mt-1 font-medium text-foreground">{artwork.year}</p>
                  </div>
                )}
              </div>

              {/* Tools Used */}
              {artwork.tools_used && artwork.tools_used.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-muted-foreground">Tools Used</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {artwork.tools_used.map((tool) => (
                      <span
                        key={tool}
                        className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification Section */}
              {artwork.is_verified && (
                <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-foreground">
                        ผลงานผ่านการยืนยัน
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        ผลงานนี้ผ่านการยืนยันว่าเป็นผลงานที่วาดโดยมนุษย์จริง ผ่านระบบตรวจสอบภาพร่างและกระบวนการทำงาน
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                {artwork.is_sold ? (
                  <Button disabled className="flex-1">
                    ขายแล้ว
                  </Button>
                ) : (
                  <Button 
                    onClick={handleBuyClick}
                    className="btn-hero-primary flex-1"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    ซื้อเลย
                  </Button>
                )}
                <Button variant="outline" className="flex-1 gap-2">
                  <MessageCircle className="h-5 w-5" />
                  สอบถาม/จ้างงาน
                </Button>
              </div>

              {/* Wallet Balance Info */}
              {user && !artwork.is_sold && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  <span>ยอดเงินในกระเป๋า: ฿{walletBalance.toLocaleString()}</span>
                  {!canAfford && (
                    <Link to="/wallet" className="text-primary hover:underline ml-2">
                      เติมเงิน
                    </Link>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* More from Artist */}
      {otherArtworks.length > 0 && (
        <section className="border-t border-border bg-secondary/30 py-16">
          <div className="container mx-auto px-4 lg:px-8">
            <h2 className="mb-8 font-serif text-2xl font-bold text-foreground">
              ผลงานอื่นๆ จาก {artwork.artist_profiles?.artist_name}
            </h2>
            <div className="gallery-grid">
              {otherArtworks.map((art) => (
                <ArtworkCard
                  key={art.id}
                  id={art.id}
                  title={art.title}
                  artist={art.artist_profiles?.artist_name || "Unknown"}
                  artistId={art.artist_id}
                  image={art.image_url}
                  price={art.price}
                  isVerified={art.is_verified || false}
                  medium={art.medium || ""}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Purchase Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการซื้อ</DialogTitle>
            <DialogDescription>
              คุณต้องการซื้อผลงาน "{artwork.title}" ใช่หรือไม่?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ราคา:</span>
              <span className="font-semibold">฿{artwork.price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ยอดเงินในกระเป๋า:</span>
              <span className={`font-semibold ${canAfford ? "text-green-500" : "text-red-500"}`}>
                ฿{walletBalance.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between border-t pt-4">
              <span className="text-muted-foreground">ยอดคงเหลือหลังซื้อ:</span>
              <span className={`font-semibold ${canAfford ? "" : "text-red-500"}`}>
                ฿{(walletBalance - artwork.price).toLocaleString()}
              </span>
            </div>

            {!canAfford && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                ยอดเงินไม่เพียงพอ กรุณาเติมเงินก่อน
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              ยกเลิก
            </Button>
            {canAfford ? (
              <Button onClick={handlePurchase} disabled={purchasing}>
                {purchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังดำเนินการ...
                  </>
                ) : (
                  "ยืนยันซื้อ"
                )}
              </Button>
            ) : (
              <Button onClick={() => navigate("/wallet")}>
                <Wallet className="h-4 w-4 mr-2" />
                ไปเติมเงิน
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
