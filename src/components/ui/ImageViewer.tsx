import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// =============================================
// PIXIV-STYLE IMAGE VIEWER
// =============================================
// Full-screen viewer with:
// - Scrollable container for tall images
// - object-fit: contain (no cropping)
// - Letterbox padding for aspect ratio
// - Original image via signed URL
// - Smooth fade-in/zoom-in animation
// =============================================

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  variants?: {
    blur?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
  alt: string;
  imageAssetId?: string;
  title?: string;
  artist?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  isOpen,
  onClose,
  imageUrl,
  variants,
  alt,
  imageAssetId,
  title,
  artist,
}) => {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get the best available image URL (prefer large/original)
  const getDisplayUrl = useCallback(() => {
    if (originalUrl) return originalUrl;
    return variants?.large || imageUrl;
  }, [originalUrl, variants, imageUrl]);

  // Fetch signed URL for original image
  const fetchOriginalImage = useCallback(async () => {
    if (!imageAssetId || originalUrl) return;

    setIsLoadingOriginal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Fall back to large variant if not logged in
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-signed-url`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageAssetId }),
        }
      );

      const data = await response.json();
      
      if (data.success && data.signedUrl) {
        setOriginalUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Failed to fetch original:', error);
    } finally {
      setIsLoadingOriginal(false);
    }
  }, [imageAssetId, originalUrl]);

  // Auto-fetch original when opened
  useEffect(() => {
    if (isOpen && imageAssetId && !originalUrl) {
      fetchOriginalImage();
    }
  }, [isOpen, imageAssetId, originalUrl, fetchOriginalImage]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setOriginalUrl(null);
      setImageLoaded(false);
    }
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black"
        >
          {/* Close button - top left */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            onClick={onClose}
            className="fixed top-4 left-4 z-50 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </motion.button>

          {/* Title and artist info */}
          {(title || artist) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="fixed top-4 left-16 right-4 z-40 pointer-events-none"
            >
              <div className="text-white drop-shadow-lg">
                {title && <h2 className="text-lg font-semibold truncate">{title}</h2>}
                {artist && <p className="text-sm text-white/70 truncate">{artist}</p>}
              </div>
            </motion.div>
          )}

          {/* Loading indicator for original image */}
          {isLoadingOriginal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-black/50 text-white text-sm"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading original...</span>
            </motion.div>
          )}

          {/* Scrollable image container */}
          <div
            className="absolute inset-0 overflow-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            {/* Centered content wrapper with padding */}
            <div className="min-h-full flex items-center justify-center p-4 sm:p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ 
                  opacity: imageLoaded ? 1 : 0.5, 
                  scale: 1 
                }}
                transition={{ 
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1]
                }}
                className="relative max-w-full"
              >
                {/* Blur placeholder while loading */}
                {!imageLoaded && variants?.blur && (
                  <img
                    src={variants.blur}
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain blur-xl scale-105 opacity-60"
                    aria-hidden="true"
                  />
                )}
                
                {/* Main image - preserves aspect ratio, no cropping */}
                <img
                  src={getDisplayUrl()}
                  alt={alt}
                  className={cn(
                    "relative max-w-full w-auto h-auto object-contain transition-opacity duration-300",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'none', // Allow full height, scrollable
                  }}
                  draggable={false}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
              </motion.div>
            </div>
          </div>

          {/* Click anywhere hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            <span className="text-white/50 text-sm">Click outside or press ESC to close</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageViewer;
