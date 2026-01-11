import { useState, useEffect } from 'react';
import { X, ZoomIn, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PixivImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageLargeUrl?: string;
  title?: string;
}

export function PixivImageViewer({
  isOpen,
  onClose,
  imageUrl,
  imageLargeUrl,
  title,
}: PixivImageViewerProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState(1);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setIsZoomed(false);
      setScale(1);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoom = () => {
    setIsZoomed(true);
    setScale(1.5);
  };

  const handleZoomOut = () => {
    setIsZoomed(false);
    setScale(1);
  };

  if (!isOpen) return null;

  const displayUrl = imageLargeUrl || imageUrl;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95"
      onClick={onClose}
    >
      {/* Header Controls - Pixiv Style */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        {title && (
          <h2 className="text-white font-medium text-lg max-w-2xl truncate">
            {title}
          </h2>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {!isZoomed ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleZoom();
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-2"
              title="Zoom"
            >
              <ZoomIn className="h-5 w-5" />
              <span className="text-sm hidden sm:inline">Zoom</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleZoomOut();
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-2"
              title="Fit to Screen"
            >
              <Maximize2 className="h-5 w-5" />
              <span className="text-sm hidden sm:inline">Fit</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close (ESC)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Image Container - Pixiv Style */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center pt-16 pb-4 px-4",
          !isZoomed && "overflow-auto"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {!isZoomed ? (
          // FIT MODE: Fit to viewport, scrollable
          <div className="w-full h-full flex items-center justify-center overflow-auto">
            <img
              src={displayUrl}
              alt={title || 'Artwork'}
              className="block cursor-zoom-in"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
              }}
              onClick={handleZoom}
            />
          </div>
        ) : (
          // ZOOM MODE: Scrollable, larger
          <div className="w-full h-full overflow-auto">
            <img
              src={displayUrl}
              alt={title || 'Artwork'}
              className="block mx-auto cursor-zoom-out"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease-out',
                maxWidth: 'none',
                width: 'auto',
              }}
              onClick={handleZoomOut}
            />
          </div>
        )}
      </div>

      {/* Bottom Hint - Pixiv Style */}
      {!isZoomed && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm pointer-events-none">
          Click image to zoom
        </div>
      )}
    </div>
  );
}
