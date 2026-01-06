import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { ArtworkCard } from "@/components/artwork/ArtworkCard";
import { artworks, Artwork } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type CategoryFilter = "all" | "traditional" | "digital";
type TypeFilter = "all" | "original" | "commission";

export default function Marketplace() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(true);

  const filteredArtworks = artworks.filter((artwork: Artwork) => {
    const matchesSearch =
      artwork.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artwork.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || artwork.category === categoryFilter;
    const matchesType = typeFilter === "all" || artwork.type === typeFilter;
    const matchesVerified = !verifiedOnly || artwork.isVerified;

    return matchesSearch && matchesCategory && matchesType && matchesVerified;
  });

  return (
    <Layout>
      {/* Header */}
      <section className="border-b border-border bg-secondary/30 py-12 lg:py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
              {t('marketplace.title')}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('marketplace.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-20 z-40 border-b border-border bg-background/95 py-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('marketplace.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('marketplace.filters')}:</span>
              </div>

              {/* Category filters */}
              <button
                onClick={() => setCategoryFilter("all")}
                className={`filter-chip ${categoryFilter === "all" ? "active" : ""}`}
              >
                {t('marketplace.all')}
              </button>
              <button
                onClick={() => setCategoryFilter("traditional")}
                className={`filter-chip ${categoryFilter === "traditional" ? "active" : ""}`}
              >
                {t('marketplace.traditional')}
              </button>
              <button
                onClick={() => setCategoryFilter("digital")}
                className={`filter-chip ${categoryFilter === "digital" ? "active" : ""}`}
              >
                {t('marketplace.digital')}
              </button>

              <div className="h-6 w-px bg-border" />

              {/* Type filters */}
              <button
                onClick={() => setTypeFilter("all")}
                className={`filter-chip ${typeFilter === "all" ? "active" : ""}`}
              >
                {t('marketplace.allTypes')}
              </button>
              <button
                onClick={() => setTypeFilter("original")}
                className={`filter-chip ${typeFilter === "original" ? "active" : ""}`}
              >
                {t('marketplace.original')}
              </button>
              <button
                onClick={() => setTypeFilter("commission")}
                className={`filter-chip ${typeFilter === "commission" ? "active" : ""}`}
              >
                {t('marketplace.commission')}
              </button>

              <div className="h-6 w-px bg-border" />

              {/* Verified toggle */}
              <label className="flex cursor-pointer items-center gap-2">
                <Switch
                  checked={verifiedOnly}
                  onCheckedChange={setVerifiedOnly}
                />
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  {t('marketplace.verifiedOnly')}
                </span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <p className="text-muted-foreground">
              {t('common.showing')}{" "}
              <span className="font-medium text-foreground">
                {filteredArtworks.length}
              </span>{" "}
              {filteredArtworks.length !== 1 ? t('common.artworks') : t('common.artwork')}
            </p>
          </div>

          {filteredArtworks.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="gallery-grid"
            >
              {filteredArtworks.map((artwork) => (
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
            </motion.div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">
                {t('marketplace.noResults')}
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setTypeFilter("all");
                }}
                className="mt-4 text-primary hover:underline"
              >
                {t('common.clearFilters')}
              </button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
