import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

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
  variant?: 'thumbnail' | 'feed' | 'fullscreen' | 'zoom';
  className?: string;
  containerClassName?: string;
  onClick?: () => void;
  priority?: boolean; // Disable lazy loading for above-fold images
  aspectRatio?: 'auto' | 'square' | '4/3' | '3/4' | '16/9' | '4/5';
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  variants,
  alt,
  variant = 'feed',
  className,
  containerClassName,
  onClick,
  priority = false,
  aspectRatio = 'auto',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Select appropriate URL based on variant
  const getImageUrl = (): string => {
    if (!variants) return src;

    switch (variant) {
      case 'thumbnail':
        return variants.small || variants.medium || src;
      case 'feed':
        return variants.medium || variants.large || src;
      case 'fullscreen':
        return variants.large || variants.medium || src;
      case 'zoom':
        return variants.large || src;
      default:
        return variants.medium || src;
    }
  };

  // Generate srcSet for responsive images
  const getSrcSet = (): string | undefined => {
    if (!variants) return undefined;

    const srcSetParts: string[] = [];
    
    if (variants.small) {
      srcSetParts.push(`${variants.small} 400w`);
    }
    if (variants.medium) {
      srcSetParts.push(`${variants.medium} 1200w`);
    }
    if (variants.large) {
      srcSetParts.push(`${variants.large} 2400w`);
    }

    return srcSetParts.length > 0 ? srcSetParts.join(', ') : undefined;
  };

  // Get sizes attribute based on variant
  const getSizes = (): string | undefined => {
    switch (variant) {
      case 'thumbnail':
        return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px';
      case 'feed':
        return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px';
      case 'fullscreen':
      case 'zoom':
        return '100vw';
      default:
        return undefined;
    }
  };

  const blurUrl = variants?.blur;
  const mainUrl = getImageUrl();
  const srcSet = getSrcSet();
  const sizes = getSizes();

  // Handle intersection observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              if (img.dataset.srcset) {
                img.srcset = img.dataset.srcset;
              }
            }
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: '50px 0px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  const aspectRatioClass = {
    auto: '',
    square: 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '3/4': 'aspect-[3/4]',
    '16/9': 'aspect-video',
    '4/5': 'aspect-[4/5]',
  }[aspectRatio];

  return (
    <div 
      className={cn(
        'relative overflow-hidden',
        aspectRatioClass,
        containerClassName
      )}
    >
      {/* Blur placeholder */}
      {blurUrl && !isLoaded && (
        <img
          src={blurUrl}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 w-full h-full object-cover scale-110 blur-xl',
            'transition-opacity duration-300',
            isLoaded ? 'opacity-0' : 'opacity-100'
          )}
        />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={priority ? mainUrl : undefined}
        data-src={!priority ? mainUrl : undefined}
        srcSet={priority ? srcSet : undefined}
        data-srcset={!priority ? srcSet : undefined}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        onClick={onClick}
        className={cn(
          'w-full h-full object-cover',
          'transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-0',
          onClick && 'cursor-pointer',
          className
        )}
      />

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-muted-foreground text-sm">Failed to load image</span>
        </div>
      )}

      {/* Loading skeleton */}
      {!isLoaded && !hasError && !blurUrl && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
};

export default OptimizedImage;
