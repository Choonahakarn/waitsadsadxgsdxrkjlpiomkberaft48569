import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, UserCheck } from "lucide-react";

export interface ArtworkCardProps {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  image: string;
  price: number;
  isVerified?: boolean;
  isIdentityVerified?: boolean;
  medium?: string;
}

export function ArtworkCard({
  id,
  title,
  artist,
  artistId,
  image,
  price,
  isVerified = true,
  isIdentityVerified = false,
  medium,
}: ArtworkCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="artwork-card group"
    >
      <Link to={`/artwork/${id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {(isVerified || isIdentityVerified) && (
            <div className="absolute left-3 top-3 flex flex-col gap-1">
              {isVerified && (
                <span className="verified-badge">
                  <Check className="h-3 w-3" />
                  Human Verified
                </span>
              )}
              {isIdentityVerified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                  <UserCheck className="h-3 w-3" />
                  ID Verified
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
      
      <div className="p-4">
        <Link to={`/artwork/${id}`}>
          <h3 className="font-serif text-lg font-medium text-foreground transition-colors group-hover:text-primary">
            {title}
          </h3>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <Link
            to={`/artist/${artistId}`}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            by {artist}
          </Link>
          {medium && (
            <span className="text-xs text-muted-foreground">{medium}</span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="font-medium text-foreground">${price.toLocaleString()}</span>
          <Link
            to={`/artwork/${id}`}
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            View Details
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
