import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================
// ZOOMABLE IMAGE COMPONENT - PIXIV STYLE
// Progressive loading: VIEW_IMAGE → ORIGINAL
// =============================================

interface ZoomableImageProps {
  viewImageUrl: string;  // VIEW_IMAGE (2400px) - loads first
  originalImageUrl?: string;  // ORIGINAL - only loads on zoom
  blurUrl?: string;
  mediumUrl?: string;
  alt: string;
  className?: string;
  onClose?: () => void;
}

export const ZoomableImage: React.FC<ZoomableImageProps> = ({
  viewImageUrl,
  originalImageUrl,
  blurUrl,
  mediumUrl,
  alt,
  className,
  onClose,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loadedOriginal, setLoadedOriginal] = useState(false);
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load original image when zooming
  useEffect(() => {
    if (zoom > 1 && originalImageUrl && !loadedOriginal && !isLoadingOriginal) {
      setIsLoadingOriginal(true);
      const img = new Image();
      img.onload = () => {
        setLoadedOriginal(true);
        setIsLoadingOriginal(false);
      };
      img.onerror = () => {
        setIsLoadingOriginal(false);
      };
      img.src = originalImageUrl;
    }
  }, [zoom, originalImageUrl, loadedOriginal, isLoadingOriginal]);

  // Reset position when zoom changes
  useEffect(() => {
    if (zoom === 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [zoom]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 1));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoom((prev) => Math.max(1, Math.min(prev + delta, 4)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Determine which image to show
  const displayUrl = loadedOriginal && originalImageUrl
    ? originalImageUrl
    : viewImageUrl;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full flex items-center justify-center overflow-hidden",
        zoom > 1 && "cursor-move",
        className
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Blur placeholder */}
      {blurUrl && !isLoaded && (
        <img
          src={blurUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain scale-110 blur-xl opacity-30"
        />
      )}

      {/* Main Image */}
      <img
        ref={imageRef}
        src={displayUrl}
        alt={alt}
        className={cn(
          "max-w-full max-h-full object-contain transition-opacity duration-500 select-none",
          isLoaded ? "opacity-100" : "opacity-0",
          zoom > 1 && "transition-transform duration-200"
        )}
        style={{
          transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
          transformOrigin: "center center",
        }}
        onLoad={() => setIsLoaded(true)}
        draggable={false}
      />

      {/* Zoom Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-full px-3 py-2 flex items-center gap-2 z-50">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 1}
          className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-white"
          title="ซูมออก"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        
        <span className="text-white text-sm font-medium min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 4}
          className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-white"
          title="ซูมเข้า"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        {zoom > 1 && (
          <button
            onClick={handleResetZoom}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white ml-1"
            title="รีเซ็ตซูม"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Loading Indicator for Original */}
      {isLoadingOriginal && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm z-50">
          กำลังโหลดความละเอียดสูง...
        </div>
      )}

      {/* Zoom Hint */}
      {zoom === 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white/80 text-xs z-40 pointer-events-none animate-fade-in">
          ใช้ลูกกลิ้งเมาส์ หรือปุ่มซูมเพื่อดูรายละเอียด
        </div>
      )}
    </div>
  );
};
