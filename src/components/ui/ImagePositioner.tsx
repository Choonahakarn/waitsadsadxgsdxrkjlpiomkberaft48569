import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Move, Check, X } from 'lucide-react';

interface ImagePositionerProps {
  imageUrl: string;
  positionY: number;
  positionX?: number;
  onPositionChange: (positionY: number, positionX?: number) => void;
  aspectRatio?: 'cover' | 'avatar';
  className?: string;
}

export function ImagePositioner({
  imageUrl,
  positionY,
  positionX = 50,
  onPositionChange,
  aspectRatio = 'cover',
  className = ''
}: ImagePositionerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempPositionY, setTempPositionY] = useState(positionY);
  const [tempPositionX, setTempPositionX] = useState(positionX);
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const startPositionYRef = useRef(0);
  const startPositionXRef = useRef(0);

  useEffect(() => {
    setTempPositionY(positionY);
    setTempPositionX(positionX);
  }, [positionY, positionX]);

  // Load image dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    setIsDragging(true);
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    startYRef.current = clientY;
    startXRef.current = clientX;
    startPositionYRef.current = tempPositionY;
    startPositionXRef.current = tempPositionX;
  }, [isEditing, tempPositionY, tempPositionX]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !isEditing) return;
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    // Use fixed sensitivity for smoother dragging
    const sensitivity = 0.5;
    
    const deltaY = clientY - startYRef.current;
    const deltaX = clientX - startXRef.current;
    
    // Invert for natural feel - drag down = show top of image (lower Y%)
    const newPositionY = Math.max(0, Math.min(100, startPositionYRef.current + (deltaY * sensitivity)));
    setTempPositionY(newPositionY);
    
    if (aspectRatio === 'avatar') {
      const newPositionX = Math.max(0, Math.min(100, startPositionXRef.current + (deltaX * sensitivity)));
      setTempPositionX(newPositionX);
    }
  }, [isDragging, isEditing, aspectRatio]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse/touch handlers for better drag experience
  useEffect(() => {
    if (!isEditing) return;

    const handleGlobalMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      
      const sensitivity = 0.5;
      const deltaY = clientY - startYRef.current;
      const deltaX = clientX - startXRef.current;
      
      const newPositionY = Math.max(0, Math.min(100, startPositionYRef.current + (deltaY * sensitivity)));
      setTempPositionY(newPositionY);
      
      if (aspectRatio === 'avatar') {
        const newPositionX = Math.max(0, Math.min(100, startPositionXRef.current + (deltaX * sensitivity)));
        setTempPositionX(newPositionX);
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalMouseMove);
      window.addEventListener('touchend', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalMouseMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging, isEditing, aspectRatio]);

  const handleSave = () => {
    onPositionChange(Math.round(tempPositionY), aspectRatio === 'avatar' ? Math.round(tempPositionX) : undefined);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempPositionY(positionY);
    setTempPositionX(positionX);
    setIsEditing(false);
  };

  const objectPosition = aspectRatio === 'avatar' 
    ? `${tempPositionX}% ${tempPositionY}%`
    : `center ${tempPositionY}%`;

  return (
    <div className={`relative ${className}`}>
      {/* Main preview container */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden w-full h-full ${
          isEditing 
            ? 'cursor-grab ring-2 ring-primary active:cursor-grabbing' 
            : ''
        } ${aspectRatio === 'avatar' ? 'rounded-full' : 'rounded-lg'}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Positionable image"
          className="w-full h-full object-cover transition-[object-position] duration-75 select-none"
          style={{ objectPosition }}
          draggable={false}
        />
        
        {isEditing && (
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
            {/* Grid overlay for better positioning reference */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/20" />
              ))}
            </div>
            
            {/* Center crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/60" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/60" />
            </div>
          </div>
        )}
      </div>

      {/* Edit mode floating action buttons */}
      {isEditing && (
        <div className={`absolute bottom-3 right-3 flex gap-2 transition-opacity duration-200 ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCancel}
            className="h-8 px-3 rounded-full shadow-lg"
          >
            <X className="h-4 w-4 mr-1" />
            ยกเลิก
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="h-8 px-3 rounded-full shadow-lg"
          >
            <Check className="h-4 w-4 mr-1" />
            บันทึก
          </Button>
        </div>
      )}

      {/* Edit button - only show when not editing */}
      {!isEditing && (
        <div className="absolute bottom-3 right-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsEditing(true)}
            className="h-8 px-3 rounded-full shadow-lg"
          >
            <Move className="h-4 w-4 mr-1" />
            ปรับตำแหน่ง
          </Button>
        </div>
      )}
      
      {/* Image info badge */}
      {imageLoaded && !isEditing && (
        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {imageDimensions.width} × {imageDimensions.height}
        </div>
      )}
    </div>
  );
}
