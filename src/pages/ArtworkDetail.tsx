import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Calendar, Ruler, Palette, ShoppingCart, MessageCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { getArtworkById, getArtworksByArtist } from "@/data/mockData";
import { ArtworkCard } from "@/components/artwork/ArtworkCard";
import { Button } from "@/components/ui/button";
import { TranslateButton } from "@/components/ui/TranslateButton";
export default function ArtworkDetail() {
  const { id } = useParams<{ id: string }>();
  const artwork = getArtworkById(id || "");

  if (!artwork) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Artwork not found
          </h1>
          <Link to="/marketplace" className="mt-4 inline-block text-primary hover:underline">
            Return to Marketplace
          </Link>
        </div>
      </Layout>
    );
  }

  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);

  const otherArtworks = getArtworksByArtist(artwork.artistId).filter(
    (a) => a.id !== artwork.id
  );

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
            Back to Marketplace
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
              <div className="overflow-hidden rounded-2xl shadow-elevated">
                <img
                  src={artwork.image}
                  alt={artwork.title}
                  className="w-full object-cover"
                />
              </div>
            </motion.div>

            {/* Artwork Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex flex-col"
            >
              {artwork.isVerified && (
                <VerificationBadge variant="verified" className="mb-4 w-fit" />
              )}

              <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
                {artwork.title}
              </h1>

              <Link
                to={`/artist/${artwork.artistId}`}
                className="mt-3 text-lg text-muted-foreground transition-colors hover:text-foreground"
              >
                by {artwork.artist}
              </Link>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold text-foreground">
                  ${artwork.price.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">USD</span>
              </div>

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

              {/* Details */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Palette className="h-4 w-4" />
                    <span className="text-sm">Medium</span>
                  </div>
                  <p className="mt-1 font-medium text-foreground">{artwork.medium}</p>
                </div>

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
              {artwork.tools && artwork.tools.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-muted-foreground">Tools Used</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {artwork.tools.map((tool) => (
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
              <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-foreground">
                      Human Verified Artwork
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This artwork has been verified through our process-based verification
                      system, including sketch reviews and work-in-progress documentation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button className="btn-hero-primary flex-1">
                  <ShoppingCart className="h-5 w-5" />
                  Buy Now
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Request Commission
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* More from Artist */}
      {otherArtworks.length > 0 && (
        <section className="border-t border-border bg-secondary/30 py-16">
          <div className="container mx-auto px-4 lg:px-8">
            <h2 className="mb-8 font-serif text-2xl font-bold text-foreground">
              More from {artwork.artist}
            </h2>
            <div className="gallery-grid">
              {otherArtworks.map((art) => (
                <ArtworkCard
                  key={art.id}
                  id={art.id}
                  title={art.title}
                  artist={art.artist}
                  artistId={art.artistId}
                  image={art.image}
                  price={art.price}
                  isVerified={art.isVerified}
                  medium={art.medium}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
