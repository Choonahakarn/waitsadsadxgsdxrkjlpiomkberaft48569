import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Shield, Eye, Users, ArrowRight, Sparkles, Ban, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { ArtworkCard } from "@/components/artwork/ArtworkCard";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { supabase } from "@/integrations/supabase/client";
import heroArtwork from "@/assets/hero-artwork-1.jpg";

interface Artwork {
  id: string;
  title: string;
  image_url: string;
  price: number;
  medium: string | null;
  artist_id: string;
  is_verified: boolean | null;
  artist_profiles?: {
    id: string;
    artist_name: string;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Index() {
  const { t } = useTranslation();
  const [featuredArtworks, setFeaturedArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedArtworks();
  }, []);

  const fetchFeaturedArtworks = async () => {
    try {
      const { data, error } = await supabase
        .from("artworks")
        .select(`
          id, title, image_url, price, medium, artist_id, is_verified,
          artist_profiles (id, artist_name)
        `)
        .eq("is_sold", false)
        .eq("is_verified", true)
        .is("post_id", null) // Exclude portfolio items (only show items for sale)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      setFeaturedArtworks(data || []);
    } catch (error) {
      console.error("Error fetching artworks:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="container mx-auto px-4 py-20 lg:px-8 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2">
                <Ban className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">{t('index.badge')}</span>
              </div>
              
              <h1 className="font-serif text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
                {t('index.heroTitle1')}{" "}
                <span className="text-primary">{t('index.heroTitle2')}</span>
              </h1>
              
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground lg:text-xl">
                {t('index.heroDescription')}
              </p>
              
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <Link to="/sell" className="btn-hero-primary">
                  <Sparkles className="h-5 w-5" />
                  {t('index.sellYourArt')}
                </Link>
                <Link to="/marketplace" className="btn-hero-secondary">
                  {t('index.buyHumanArt')}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <TrustBadge icon={Check} title={t('index.humanVerifiedArtists')} />
                <TrustBadge icon={Shield} title={t('index.processVerification')} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-2xl shadow-elevated">
                <img
                  src={heroArtwork}
                  alt="Featured human-made artwork"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/80 to-transparent p-6">
                  <p className="font-serif text-lg text-primary-foreground">{t('index.featuredArtwork')}</p>
                  <p className="text-sm text-primary-foreground/80">by Elena Vasquez • {t('index.humanVerified')}</p>
                </div>
              </div>
              
              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="absolute -right-4 top-8 rounded-xl border border-border bg-card p-4 shadow-elevated lg:-right-8"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t('index.hundredHuman')}</p>
                    <p className="text-xs text-muted-foreground">{t('index.verifiedCreation')}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Statement Banner */}
      <section className="border-y border-border bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 text-center">
            <p className="font-serif text-xl font-medium text-foreground md:text-2xl">
              {t('index.statementQuote')}
            </p>
            <div className="hidden h-8 w-px bg-border md:block" />
            <p className="text-muted-foreground">
              {t('index.statementSub')}
            </p>
          </div>
        </div>
      </section>

      {/* Featured Artworks */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
              {t('index.featuredArtworks')}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {t('index.featuredArtworksDesc')}
            </p>
          </motion.div>

          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
            </div>
          ) : featuredArtworks.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="gallery-grid"
            >
              {featuredArtworks.map((artwork) => (
                <motion.div key={artwork.id} variants={itemVariants}>
                  <ArtworkCard
                    id={artwork.id}
                    title={artwork.title}
                    artist={artwork.artist_profiles?.artist_name || "Unknown Artist"}
                    artistId={artwork.artist_id}
                    image={artwork.image_url}
                    price={artwork.price}
                    isVerified={artwork.is_verified || false}
                    medium={artwork.medium || ""}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">ยังไม่มีผลงานที่พร้อมแสดง</p>
              <Link
                to="/marketplace"
                className="mt-4 inline-flex items-center gap-2 font-medium text-primary"
              >
                ดูตลาดทั้งหมด
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          <div className="mt-12 text-center">
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary/80"
            >
              {t('common.viewAllArtworks')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why No AI Section */}
      <section className="bg-secondary/50 py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
              {t('index.whyHumanArt')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('index.whyHumanArtDesc')}
            </p>
          </motion.div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-card p-8 shadow-soft"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-foreground">
                {t('index.supportRealArtists')}
              </h3>
              <p className="mt-3 text-muted-foreground">
                {t('index.supportRealArtistsDesc')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-border bg-card p-8 shadow-soft"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-foreground">
                {t('index.authenticExpression')}
              </h3>
              <p className="mt-3 text-muted-foreground">
                {t('index.authenticExpressionDesc')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-border bg-card p-8 shadow-soft"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Eye className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-foreground">
                {t('index.verifiedAuthenticity')}
              </h3>
              <p className="mt-3 text-muted-foreground">
                {t('index.verifiedAuthenticityDesc')}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-primary/5 via-card to-secondary/30 p-12 text-center shadow-elevated lg:p-16"
          >
            <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
              {t('index.readyToJoin')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              {t('index.readyToJoinDesc')}
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/sell" className="btn-hero-primary">
                {t('index.startSellingToday')}
              </Link>
              <Link to="/marketplace" className="btn-hero-secondary">
                {t('index.exploreMarketplace')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
