import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  buyer_id: string;
}

interface ArtworkReviewsProps {
  artworkId: string;
}

export function ArtworkReviews({ artworkId }: ArtworkReviewsProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
    if (user) {
      checkCanReview();
    }
  }, [artworkId, user]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, buyer_id")
        .eq("artwork_id", artworkId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkCanReview = async () => {
    if (!user) return;

    try {
      // Check if user has purchased this artwork
      const { data: order } = await supabase
        .from("orders")
        .select("id")
        .eq("artwork_id", artworkId)
        .eq("buyer_id", user.id)
        .maybeSingle();

      if (!order) return;

      // Check if user already reviewed this order
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("order_id", order.id)
        .maybeSingle();

      if (!existingReview) {
        setCanReview(true);
        setOrderId(order.id);
      }
    } catch (error) {
      console.error("Error checking review eligibility:", error);
    }
  };

  const handleSubmit = async () => {
    if (!user || !orderId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        artwork_id: artworkId,
        buyer_id: user.id,
        order_id: orderId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "ขอบคุณสำหรับรีวิว!",
        description: "รีวิวของคุณถูกบันทึกแล้ว",
      });

      setShowForm(false);
      setCanReview(false);
      setComment("");
      fetchReviews();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const renderStars = (rating: number, interactive = false, size = "h-4 w-4") => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            } ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
            onClick={interactive ? () => setRating(star) : undefined}
          />
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            รีวิวจากผู้ซื้อ
            {reviews.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({reviews.length})
              </span>
            )}
          </CardTitle>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              {renderStars(Math.round(averageRating))}
              <span className="text-lg font-semibold">
                {averageRating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Write Review Form */}
        {canReview && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            {showForm ? (
              <div className="space-y-4">
                <p className="font-medium">ให้คะแนนผลงานนี้</p>
                <div className="flex items-center gap-2">
                  {renderStars(rating, true, "h-6 w-6")}
                  <span className="text-sm text-muted-foreground">
                    {rating} ดาว
                  </span>
                </div>
                <Textarea
                  placeholder="เขียนความคิดเห็น (ไม่บังคับ)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    ส่งรีวิว
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    ยกเลิก
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm">คุณได้ซื้อผลงานนี้ ต้องการเขียนรีวิวไหม?</p>
                <Button size="sm" onClick={() => setShowForm(true)}>
                  เขียนรีวิว
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Reviews List */}
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            ยังไม่มีรีวิว
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="flex gap-4 border-b pb-4 last:border-0">
                <Avatar>
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">ผู้ซื้อ</p>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(review.created_at), "d MMM yyyy", {
                        locale: th,
                      })}
                    </span>
                  </div>
                  {renderStars(review.rating)}
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
