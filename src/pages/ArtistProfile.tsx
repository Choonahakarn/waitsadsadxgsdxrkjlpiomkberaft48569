import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { getArtistById, getArtworksByArtist } from "@/data/mockData";
import { ArtworkCard } from "@/components/artwork/ArtworkCard";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import OptimizedImage from "@/components/ui/OptimizedImage";

export default function ArtistProfile() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const artist = getArtistById(id || "");
  const artworks = artist ? getArtworksByArtist(artist.id) : [];

  if (!artist) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Artist not found
          </h1>
          <Link to="/marketplace" className="mt-4 inline-block text-primary hover:underline">
            Return to Marketplace
          </Link>
        </div>
      </Layout>
    );
  }

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

      {/* Artist Header */}
      <section className="border-b border-border bg-secondary/30 py-12 lg:py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-8"
          >
            {/* Avatar */}
            <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-background shadow-elevated">
              <OptimizedImage
                src={artist.avatar}
                alt={artist.name}
                variant="thumbnail"
                className="h-full w-full"
                aspectRatio="square"
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="mb-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                {artist.badges.map((badge) => (
                  <VerificationBadge
                    key={badge}
                    variant={badge.includes("Human") ? "verified" : artist.isTraditional ? "traditional" : "digital"}
                    label={badge}
                  />
                ))}
                {/* Identity verified badge - shown for verified artists */}
                {artist.badges.includes("Human Verified") && (
                  <VerificationBadge
                    variant="identity"
                    label={t('artistProfile.identityVerified', 'Identity Verified')}
                  />
                )}
              </div>

              <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
                {artist.name}
              </h1>

              <p className="mt-4 max-w-2xl text-muted-foreground">{artist.bio}</p>

              {/* Tools */}
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Tools & Mediums
                </h3>
                <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                  {artist.tools.map((tool) => (
                    <span
                      key={tool}
                      className="rounded-full bg-card px-3 py-1 text-sm text-foreground shadow-soft"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8">
                <Link to={`/commission?artist=${artist.id}`}>
                  <Button className="btn-hero-primary">
                    <MessageCircle className="h-5 w-5" />
                    Request a Commission
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Portfolio */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="mb-8 font-serif text-2xl font-bold text-foreground">
            Portfolio ({artworks.length} {artworks.length === 1 ? "piece" : "pieces"})
          </h2>

          {artworks.length > 0 ? (
            <div className="gallery-grid">
              {artworks.map((artwork) => (
                <ArtworkCard
                  key={artwork.id}
                  id={artwork.id}
                  title={artwork.title}
                  artist={artwork.artist}
                  artistId={artwork.artistId}
                  image={artwork.image}
                  price={artwork.price}
                  isVerified={artwork.isVerified}
                  medium={artwork.medium}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              No artworks available yet.
            </p>
          )}
        </div>
      </section>
    </Layout>
  );
}
