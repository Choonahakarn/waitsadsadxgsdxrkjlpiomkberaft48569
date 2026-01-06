import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { artists } from "@/data/mockData";
import { Link } from "react-router-dom";
import { VerificationBadge } from "@/components/ui/VerificationBadge";

export default function Artists() {
  const { t } = useTranslation();

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
              {t('artists.title')}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('artists.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Artists Grid */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {artists.map((artist, index) => (
              <motion.article
                key={artist.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-card-hover"
              >
                <Link to={`/artist/${artist.id}`}>
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={artist.avatar}
                      alt={artist.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h2 className="font-serif text-2xl font-bold text-primary-foreground">
                        {artist.name}
                      </h2>
                    </div>
                  </div>
                </Link>
                
                <div className="p-6">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {artist.badges.map((badge) => (
                      <VerificationBadge
                        key={badge}
                        variant={badge.includes("Human") ? "verified" : artist.isTraditional ? "traditional" : "digital"}
                        label={badge}
                      />
                    ))}
                  </div>
                  
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {artist.bio}
                  </p>
                  
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {t('artists.toolsMediums')}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {artist.tools.slice(0, 3).map((tool) => (
                        <span
                          key={tool}
                          className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <Link
                    to={`/artist/${artist.id}`}
                    className="mt-6 block text-center text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    {t('common.viewPortfolio')}
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
