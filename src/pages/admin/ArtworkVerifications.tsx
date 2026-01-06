import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Image, Clock, CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";

interface Artwork {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  price: number;
  medium: string | null;
  category: string | null;
  is_verified: boolean | null;
  is_sold: boolean | null;
  created_at: string;
  artist_profiles?: {
    artist_name: string;
    is_verified: boolean | null;
  };
}

const ArtworkVerifications = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { toast } = useToast();

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "verified" | "all">("pending");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/auth");
    }
  }, [user, authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchArtworks();
    }
  }, [isAdmin, filter]);

  const fetchArtworks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("artworks")
        .select(`
          *,
          artist_profiles (artist_name, is_verified)
        `)
        .order("created_at", { ascending: false });

      if (filter === "pending") {
        query = query.eq("is_verified", false);
      } else if (filter === "verified") {
        query = query.eq("is_verified", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setArtworks(data || []);
    } catch (error) {
      console.error("Error fetching artworks:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดรายการผลงานได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedArtwork) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("artworks")
        .update({ is_verified: true })
        .eq("id", selectedArtwork.id);

      if (error) throw error;

      toast({
        title: "อนุมัติสำเร็จ",
        description: `ผลงาน "${selectedArtwork.title}" ถูกยืนยันแล้ว`,
      });

      setSelectedArtwork(null);
      setAdminNotes("");
      fetchArtworks();
    } catch (error) {
      console.error("Error approving artwork:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอนุมัติผลงานได้",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedArtwork) return;

    setProcessing(true);
    try {
      // For rejection, we could delete the artwork or mark it somehow
      // For now, we'll just keep it unverified but you could add a rejected status
      const { error } = await supabase
        .from("artworks")
        .delete()
        .eq("id", selectedArtwork.id);

      if (error) throw error;

      toast({
        title: "ปฏิเสธผลงาน",
        description: `ผลงาน "${selectedArtwork.title}" ถูกลบออกจากระบบ`,
      });

      setSelectedArtwork(null);
      setAdminNotes("");
      fetchArtworks();
    } catch (error) {
      console.error("Error rejecting artwork:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถปฏิเสธผลงานได้",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = artworks.filter((a) => !a.is_verified).length;

  if (authLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Image className="h-8 w-8" />
              ยืนยันผลงานศิลปะ
            </h1>
            {filter === "pending" && pendingCount > 0 && (
              <p className="text-muted-foreground mt-1">
                มี {pendingCount} ผลงานรอตรวจสอบ
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("pending")}
            >
              <Clock className="h-4 w-4 mr-1" />
              รอตรวจสอบ
            </Button>
            <Button
              variant={filter === "verified" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("verified")}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              ยืนยันแล้ว
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              ทั้งหมด
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {filter === "pending" && "ผลงานรอตรวจสอบ"}
              {filter === "verified" && "ผลงานที่ยืนยันแล้ว"}
              {filter === "all" && "ผลงานทั้งหมด"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="mt-2 text-muted-foreground">กำลังโหลด...</p>
              </div>
            ) : artworks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {filter === "pending" ? "ไม่มีผลงานรอตรวจสอบ" : "ไม่มีผลงาน"}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {artworks.map((artwork) => (
                  <div
                    key={artwork.id}
                    className={`border rounded-lg overflow-hidden ${
                      !artwork.is_verified ? "border-yellow-500/50 bg-yellow-500/5" : ""
                    }`}
                  >
                    <div className="relative aspect-square">
                      <img
                        src={artwork.image_url}
                        alt={artwork.title}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setViewImage(artwork.image_url)}
                      />
                      <div className="absolute top-2 right-2">
                        {artwork.is_verified ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            ยืนยันแล้ว
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            รอตรวจสอบ
                          </Badge>
                        )}
                      </div>
                      {artwork.is_sold && (
                        <Badge className="absolute top-2 left-2 bg-red-500">ขายแล้ว</Badge>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold truncate">{artwork.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        โดย {artwork.artist_profiles?.artist_name || "Unknown"}
                        {artwork.artist_profiles?.is_verified && (
                          <CheckCircle className="inline h-3 w-3 ml-1 text-green-500" />
                        )}
                      </p>
                      <p className="text-lg font-bold text-primary mt-1">
                        ฿{artwork.price.toLocaleString()}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setViewImage(artwork.image_url)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          ดูรูป
                        </Button>
                        {!artwork.is_verified && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedArtwork(artwork);
                              setAdminNotes("");
                            }}
                          >
                            ตรวจสอบ
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>ตรวจสอบผลงาน</DialogTitle>
              <DialogDescription>
                ตรวจสอบและอนุมัติหรือปฏิเสธผลงานนี้
              </DialogDescription>
            </DialogHeader>

            {selectedArtwork && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <img
                    src={selectedArtwork.image_url}
                    alt={selectedArtwork.title}
                    className="w-full h-64 object-cover rounded-lg cursor-pointer"
                    onClick={() => setViewImage(selectedArtwork.image_url)}
                  />
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">ชื่อผลงาน</p>
                      <p className="font-semibold">{selectedArtwork.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ศิลปิน</p>
                      <p>{selectedArtwork.artist_profiles?.artist_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ราคา</p>
                      <p className="font-bold text-primary">
                        ฿{selectedArtwork.price.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ประเภท</p>
                      <p>{selectedArtwork.category || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">เทคนิค</p>
                      <p>{selectedArtwork.medium || "-"}</p>
                    </div>
                    {selectedArtwork.description && (
                      <div>
                        <p className="text-sm text-muted-foreground">รายละเอียด</p>
                        <p className="text-sm">{selectedArtwork.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">หมายเหตุ Admin (ถ้ามี)</label>
                  <Textarea
                    placeholder="เพิ่มหมายเหตุ..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                ปฏิเสธ (ลบผลงาน)
              </Button>
              <Button
                onClick={handleApprove}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                อนุมัติ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Image Dialog */}
        <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>ดูรูปภาพ</DialogTitle>
            </DialogHeader>
            {viewImage && (
              <img
                src={viewImage}
                alt="Artwork"
                className="w-full h-auto rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ArtworkVerifications;
