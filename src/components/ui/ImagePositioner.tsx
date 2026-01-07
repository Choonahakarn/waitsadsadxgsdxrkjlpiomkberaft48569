import { useState, useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const startPositionYRef = useRef(0);
  const startPositionXRef = useRef(0);

  useEffect(() => {
    setTempPositionY(positionY);
    setTempPositionX(positionX);
  }, [positionY, positionX]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startXRef.current = e.clientX;
    startPositionYRef.current = tempPositionY;
    startPositionXRef.current = tempPositionX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isEditing) return;
    
    const containerHeight = containerRef.current?.offsetHeight || 100;
    const containerWidth = containerRef.current?.offsetWidth || 100;
    
    // Calculate movement as percentage
    const deltaY = e.clientY - startYRef.current;
    const deltaX = e.clientX - startXRef.current;
    
    // Invert the delta for natural dragging feel
    const newPositionY = Math.max(0, Math.min(100, startPositionYRef.current - (deltaY / containerHeight) * 100));
    
    setTempPositionY(newPositionY);
    
    if (aspectRatio === 'avatar') {
      const newPositionX = Math.max(0, Math.min(100, startPositionXRef.current - (deltaX / containerWidth) * 100));
      setTempPositionX(newPositionX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const handleSave = () => {
    onPositionChange(tempPositionY, aspectRatio === 'avatar' ? tempPositionX : undefined);
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
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${isEditing ? 'cursor-move ring-2 ring-primary' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={imageUrl}
          alt="Positionable image"
          className="w-full h-full object-cover transition-all select-none pointer-events-none"
          style={{ objectPosition }}
          draggable={false}
        />
        
        {isEditing && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2 text-sm shadow-lg">
              <Move className="h-4 w-4" />
              <span>ลากเพื่อปรับตำแหน่ง</span>
            </div>
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div className="absolute bottom-3 right-3 flex gap-2">
        {isEditing ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCancel}
              className="h-8 w-8 p-0 rounded-full shadow-lg"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 w-8 p-0 rounded-full shadow-lg"
            >
              <Check className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsEditing(true)}
            className="h-8 px-3 rounded-full shadow-lg"
          >
            <Move className="h-4 w-4 mr-1" />
            ปรับตำแหน่ง
          </Button>
        )}
      </div>
    </div>
  );
}
