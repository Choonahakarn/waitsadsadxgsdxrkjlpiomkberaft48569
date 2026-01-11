import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, Download, Loader2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import OptimizedImage from './OptimizedImage';

// =============================================
// PROFESSIONAL IMAGE VIEWER WITH ZOOM
// =============================================
// Full-screen viewer with:
// - VIEW_IMAGE (2400px) on open
// - ORIGINAL via signed URL on zoom
// - Pan and zoom controls
// - Smooth transitions
// - Keyboard shortcuts
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

type ZoomLevel = 'fit' | 'zoom' | 'original';

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
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('fit');
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Get current image URL based on zoom level
  const getCurrentImageUrl = useCallback(() => {
    switch (zoomLevel) {
      case 'original':
        return originalUrl || variants?.large || imageUrl;
      case 'zoom':
        return variants?.large || imageUrl;
      case 'fit':
      default:
        return variants?.large || variants?.medium || imageUrl;
    }
  }, [zoomLevel, originalUrl, variants, imageUrl]);

  // Fetch signed URL for original image
  const fetchOriginalImage = useCallback(async () => {
    if (!imageAssetId || originalUrl) return;

    setIsLoadingOriginal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login to view original image');
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
        setZoomLevel('original');
        setScale(1.5);
        toast.success('Loading original quality image');
      } else {
        throw new Error(data.error || 'Failed to get original image');
      }
    } catch (error) {
      console.error('Failed to fetch original:', error);
      toast.error('Failed to load original image');
    } finally {
      setIsLoadingOriginal(false);
    }
  }, [imageAssetId, originalUrl]);

  // Handle zoom controls
  const handleZoomIn = useCallback(() => {
    if (zoomLevel === 'fit') {
      setZoomLevel('zoom');
      setScale(1.5);
    } else if (zoomLevel === 'zoom' && imageAssetId) {
      fetchOriginalImage();
    } else {
      setScale(prev => Math.min(prev * 1.5, 4));
    }
  }, [zoomLevel, imageAssetId, fetchOriginalImage]);

  const handleZoomOut = useCallback(() => {
    if (scale > 1) {
      const newScale = scale / 1.5;
      if (newScale <= 1) {
        setScale(1);
        setZoomLevel('fit');
        setPosition({ x: 0, y: 0 });
      } else {
        setScale(newScale);
      }
    }
  }, [scale]);

  const handleFitToScreen = useCallback(() => {
    setZoomLevel('fit');
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Handle mouse drag for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.5), 4);
    
    if (newScale < 1) {
      setScale(1);
      setZoomLevel('fit');
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(newScale);
      if (newScale > 1 && zoomLevel === 'fit') {
        setZoomLevel('zoom');
      }
    }
  }, [scale, zoomLevel]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleFitToScreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleZoomIn, handleZoomOut, handleFitToScreen]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setZoomLevel('fit');
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setOriginalUrl(null);
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
          className="fixed inset-0 z-50 bg-black/95"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent"
          >
            <div className="text-white">
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {artist && <p className="text-sm text-white/70">{artist}</p>}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </Button>
          </motion.div>

          {/* Image Container */}
          <div
            ref={containerRef}
            className={cn(
              "absolute inset-0 flex items-center justify-center overflow-hidden",
              scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onClick={(e) => {
              if (!isDragging && scale === 1) {
                handleZoomIn();
              }
            }}
          >
            <motion.div
              animate={{
                scale,
                x: position.x,
                y: position.y,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              className="relative max-w-full max-h-full"
            >
              {/* Blur placeholder */}
              {variants?.blur && (
                <img
                  src={variants.blur}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain blur-xl scale-110 opacity-50"
                />
              )}
              
              {/* Main image */}
              <img
                ref={imageRef}
                src={getCurrentImageUrl()}
                alt={alt}
                className="relative max-w-[90vw] max-h-[85vh] object-contain"
                draggable={false}
              />
            </motion.div>
          </div>

          {/* Controls */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-2 p-4 bg-gradient-to-t from-black/60 to-transparent"
          >
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={handleZoomOut}
              disabled={scale <= 1}
            >
              <ZoomOut className="h-5 w-5" />
            </Button>

            <div className="px-3 py-1 rounded-full bg-white/10 text-white text-sm min-w-[80px] text-center">
              {Math.round(scale * 100)}%
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={handleZoomIn}
              disabled={isLoadingOriginal}
            >
              {isLoadingOriginal ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ZoomIn className="h-5 w-5" />
              )}
            </Button>

            <div className="w-px h-6 bg-white/20 mx-2" />

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={handleFitToScreen}
            >
              <Maximize2 className="h-5 w-5" />
            </Button>

            {imageAssetId && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "text-white hover:bg-white/10 gap-2",
                  zoomLevel === 'original' && "bg-primary/20"
                )}
                onClick={fetchOriginalImage}
                disabled={isLoadingOriginal || !!originalUrl}
              >
                {isLoadingOriginal ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : zoomLevel === 'original' ? (
                  'Original Quality'
                ) : (
                  'View Original'
                )}
              </Button>
            )}
          </motion.div>

          {/* Zoom level indicator */}
          <AnimatePresence>
            {zoomLevel !== 'fit' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 text-white text-sm"
              >
                {zoomLevel === 'original' ? 'Original Quality • Scroll to zoom' : 'Press - to zoom out'}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageViewer;
