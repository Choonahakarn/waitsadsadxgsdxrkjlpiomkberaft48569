import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// =============================================
// PROFESSIONAL OPTIMIZED IMAGE COMPONENT
// PIXIV-STYLE: No cropping, full artwork preservation
// =============================================
// Supports the image system variants:
// - blur: Tiny placeholder for progressive loading
// - small (FEED_PREVIEW): 600px for feed/grid
// - medium: 1200px for intermediate viewing
// - large (VIEW_IMAGE): 2400px for full-screen
// =============================================

interface ImageVariants {
  blur?: string;
  small?: string;
  medium?: string;
  large?: string;
}

interface OptimizedImageProps {
  src: string; // Fallback/legacy URL
  variants?: ImageVariants;
  alt: string;
  variant?: "thumbnail" | "feed" | "fullscreen" | "zoom";
  className?: string;
  containerClassName?: string;
  onClick?: () => void;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  priority?: boolean; // Disable lazy loading for above-fold images
  aspectRatio?: "auto" | "square" | "4/3" | "3/4" | "16/9" | "4/5" | "original";
  objectFit?: "cover" | "contain";
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  variants,
  alt,
  variant = "feed",
  className,
  containerClassName,
  onClick,
  onLoad,
  priority = false,
  aspectRatio = "auto",
  objectFit = "contain", // ✅ Changed default from 'cover' to 'contain'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Select appropriate URL based on variant
  const getImageUrl = (): string => {
    if (!variants) return src;

    switch (variant) {
      case "thumbnail":
        // FEED_PREVIEW: 600px for thumbnails and grid items
        return variants.small || variants.medium || src;
      case "feed":
        // FEED_PREVIEW: 600px optimized for feed scrolling
        return variants.small || variants.medium || src;
      case "fullscreen":
        // VIEW_IMAGE: 2400px for full-screen viewing
        return variants.large || variants.medium || src;
      case "zoom":
        // Largest available (original via signed URL handled separately)
        return variants.large || src;
      default:
        return variants.small || variants.medium || src;
    }
  };

  // Generate srcSet for responsive images
  const getSrcSet = (): string | undefined => {
    if (!variants) return undefined;

    const srcSetParts: string[] = [];

    if (variants.small) {
      srcSetParts.push(`${variants.small} 600w`);
    }
    if (variants.medium) {
      srcSetParts.push(`${variants.medium} 1200w`);
    }
    if (variants.large) {
      srcSetParts.push(`${variants.large} 2400w`);
    }

    return srcSetParts.length > 0 ? srcSetParts.join(", ") : undefined;
  };

  // Get sizes attribute based on variant for optimal loading
  const getSizes = (): string | undefined => {
    switch (variant) {
      case "thumbnail":
        return "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px";
      case "feed":
        return "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 600px";
      case "fullscreen":
      case "zoom":
        return "100vw";
      default:
        return undefined;
    }
  };

  const blurUrl = variants?.blur;
  const mainUrl = getImageUrl();
  const srcSet = getSrcSet();
  const sizes = getSizes();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !containerRef.current) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "100px 0px", // Load 100px before entering viewport
        threshold: 0.01,
      },
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [priority]);

  const aspectRatioClass = {
    auto: "",
    square: "aspect-square",
    "4/3": "aspect-[4/3]",
    "3/4": "aspect-[3/4]",
    "16/9": "aspect-video",
    "4/5": "aspect-[4/5]",
    original: "",
  }[aspectRatio];

  const objectFitClass = objectFit === "contain" ? "object-contain" : "object-cover";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        // ✅ Enhanced background for contain mode (Pixiv-style) - use transparent to avoid white gaps
        objectFit === "contain" ? "bg-transparent flex items-center justify-center" : "bg-transparent",
        aspectRatioClass,
        containerClassName,
      )}
    >
      {/* Blur placeholder - always visible until loaded */}
      {blurUrl && (
        <img
          src={blurUrl}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute inset-0 w-full h-full scale-110 blur-xl",
            // ✅ Use object-cover for blur, object-contain for main image
            objectFit === "contain" ? "object-cover opacity-20" : "object-cover",
            "transition-opacity duration-500",
            isLoaded ? "opacity-0" : "opacity-100",
          )}
        />
      )}

      {/* Loading skeleton when no blur placeholder */}
      {!blurUrl && !isLoaded && !hasError && <div className="absolute inset-0 bg-muted animate-pulse" />}

      {/* Main image - only load when in view */}
      {isInView && (
        <img
          ref={imgRef}
          src={mainUrl}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={(e) => {
            setIsLoaded(true);
            onLoad?.(e);
          }}
          onError={() => setHasError(true)}
          onClick={onClick}
          className={cn(
            objectFit === "contain" ? "max-w-full max-h-full" : "w-full h-full",
            objectFitClass,
            "transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0",
            onClick && "cursor-pointer hover:opacity-95",
            className,
          )}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-muted-foreground text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
