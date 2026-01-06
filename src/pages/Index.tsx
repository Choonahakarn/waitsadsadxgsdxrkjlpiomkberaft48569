import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Shield, Eye, Users, ArrowRight, Sparkles, Ban } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ArtworkCard } from "@/components/artwork/ArtworkCard";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { artworks } from "@/data/mockData";
import heroArtwork from "@/assets/hero-artwork-1.jpg";

const featuredArtworks = artworks.slice(0, 6);

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
                <span className="text-sm font-medium text-primary">No AI. Zero Generative Models.</span>
              </div>
              
              <h1 className="font-serif text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
                Human-Made Art Only.{" "}
                <span className="text-primary">Zero AI.</span>
              </h1>
              
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground lg:text-xl">
                The marketplace for 100% human-created artwork. Every piece is verified to be made by real artists—no algorithms, no generative models.
              </p>
              
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <Link to="/sell" className="btn-hero-primary">
                  <Sparkles className="h-5 w-5" />
                  Sell Your Art
                </Link>
                <Link to="/marketplace" className="btn-hero-secondary">
                  Buy Human-Made Art
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <TrustBadge icon={Check} title="Human Verified Artists" />
                <TrustBadge icon={Shield} title="Process-Based Verification" />
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
                  <p className="font-serif text-lg text-primary-foreground">Featured Artwork</p>
                  <p className="text-sm text-primary-foreground/80">by Elena Vasquez • Human Verified</p>
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
                    <p className="text-sm font-semibold text-foreground">100% Human</p>
                    <p className="text-xs text-muted-foreground">Verified Creation</p>
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
              "Art made by humans, not algorithms."
            </p>
            <div className="hidden h-8 w-px bg-border md:block" />
            <p className="text-muted-foreground">
              No AI. No Generative Models. Only Real Artists.
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
              Featured Artworks
            </h2>
            <p className="mt-4 text-muted-foreground">
              Discover exceptional pieces from verified human artists
            </p>
          </motion.div>

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
                  artist={artwork.artist}
                  artistId={artwork.artistId}
                  image={artwork.image}
                  price={artwork.price}
                  isVerified={artwork.isVerified}
                  medium={artwork.medium}
                />
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-12 text-center">
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary/80"
            >
              View All Artworks
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
              Why Human Art Matters
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              In an age of artificial creativity, authentic human expression has never been more valuable.
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
                Support Real Artists
              </h3>
              <p className="mt-3 text-muted-foreground">
                Every purchase directly supports human creators who dedicate their time, skill, and passion to their craft.
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
                Authentic Expression
              </h3>
              <p className="mt-3 text-muted-foreground">
                Human art carries emotion, intention, and story that algorithms simply cannot replicate or understand.
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
                Verified Authenticity
              </h3>
              <p className="mt-3 text-muted-foreground">
                Our rigorous verification process ensures every artwork is genuinely created by human hands and minds.
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
              Ready to Join the Movement?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Whether you're an artist looking to sell your work or a collector seeking authentic human creativity, OnlyHumanArt is your home.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/sell" className="btn-hero-primary">
                Start Selling Today
              </Link>
              <Link to="/marketplace" className="btn-hero-secondary">
                Explore the Marketplace
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
