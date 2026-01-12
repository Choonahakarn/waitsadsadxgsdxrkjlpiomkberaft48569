import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import OptimizedImage from './OptimizedImage';

// =============================================
// JUSTIFIED GRID COMPONENT
// =============================================
// Google Photos/Flickr-style justified layout:
// - All images in same row have same height
// - Width stretches/shrinks based on real aspect ratio
// - Images fit perfectly with no gaps
// - No cropping, no quality loss
// - Rows fill screen width perfectly
// =============================================

interface JustifiedItem {
  id: string;
  imageUrl: string;
  variants?: {
    blur?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: number; // width / height
}

interface JustifiedGridProps<T extends JustifiedItem> {
  items: T[];
  onItemClick?: (item: T) => void;
  renderOverlay?: (item: T) => React.ReactNode;
  className?: string;
  targetRowHeight?: number; // Target height for each row (default: 250px) - DEPRECATED: use fixedSize instead
  gap?: number; // Gap between images (default: 8px)
  maxRowHeight?: number; // Maximum row height (default: 400px) - DEPRECATED
  minRowHeight?: number; // Minimum row height (default: 150px) - DEPRECATED
  fixedSize?: {
    desktop?: number; // Fixed size for desktop (≥1024px)
    tablet?: number; // Fixed size for tablet (640-1023px)
    mobile?: number; // Fixed size for mobile (<640px)
  };
}

interface Row<T extends JustifiedItem> {
  items: (T & { calculatedWidth: number; calculatedHeight: number })[];
  height: number;
}

function JustifiedGrid<T extends JustifiedItem>({
  items,
  onItemClick,
  renderOverlay,
  className,
  targetRowHeight = 250,
  gap = 8,
  maxRowHeight = 400,
  minRowHeight = 150,
  fixedSize = {
    desktop: 300,
    tablet: 260,
    mobile: 200,
  },
}: JustifiedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [imageAspectRatios, setImageAspectRatios] = useState<Map<string, number>>(new Map());
  const [rows, setRows] = useState<Row<T>[]>([]);

  // Observe container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate fixed size based on screen width
  const getFixedSize = () => {
    if (containerWidth >= 1024) {
      return fixedSize.desktop || 300;
    } else if (containerWidth >= 640) {
      return fixedSize.tablet || 260;
    } else {
      return fixedSize.mobile || 200;
    }
  };

  // Calculate rows with fixed-size grid layout
  const calculateRows = useMemo(() => {
    if (!containerWidth || items.length === 0) {
      return [];
    }

    const availableWidth = containerWidth;
    const itemSize = getFixedSize();
    const calculatedRows: Row<T>[] = [];
    let currentRow: (T & { calculatedWidth: number; calculatedHeight: number })[] = [];

    // Calculate how many items can fit in a row
    const itemsPerRow = Math.floor((availableWidth + gap) / (itemSize + gap));
    const actualItemsPerRow = Math.max(1, itemsPerRow); // At least 1 item per row

    // Distribute items into rows
    for (let i = 0; i < items.length; i += actualItemsPerRow) {
      const rowItems = items.slice(i, i + actualItemsPerRow);
      
      const row: (T & { calculatedWidth: number; calculatedHeight: number })[] = rowItems.map(item => ({
        ...item,
        calculatedWidth: itemSize,
        calculatedHeight: itemSize,
      }));

      calculatedRows.push({
        items: row,
        height: itemSize,
      });
    }

    return calculatedRows;
  }, [containerWidth, items, gap, fixedSize.desktop, fixedSize.tablet, fixedSize.mobile]);

  // Update rows when calculation changes
  useEffect(() => {
    setRows(calculateRows);
  }, [calculateRows]);

  const handleImageLoad = (itemId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      setImageAspectRatios(prev => {
        const next = new Map(prev);
        next.set(itemId, aspectRatio);
        return next;
      });
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={cn('w-full', className)}
      style={{ margin: 0, padding: 0, lineHeight: 0 }}
    >
      <div className="flex flex-col justify-center items-center" style={{ gap: `${gap}px`, margin: 0, padding: 0, lineHeight: 0 }}>
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex justify-center items-start"
            style={{ gap: `${gap}px`, margin: 0, padding: 0, lineHeight: 0 }}
          >
            {row.items.map((item, itemIndex) => (
              <JustifiedItem
                key={item.id}
                item={item}
                onClick={() => onItemClick?.(item)}
                renderOverlay={renderOverlay}
                onImageLoad={(e) => handleImageLoad(item.id, e)}
                rowIndex={rowIndex}
                itemIndex={itemIndex}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Individual justified item component
interface JustifiedItemProps<T extends JustifiedItem> {
  item: T & { calculatedWidth: number; calculatedHeight: number };
  onClick?: () => void;
  renderOverlay?: (item: T) => React.ReactNode;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  rowIndex: number;
  itemIndex: number;
}

function JustifiedItem<T extends JustifiedItem>({
  item,
  onClick,
  renderOverlay,
  onImageLoad,
  rowIndex,
  itemIndex,
}: JustifiedItemProps<T>) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        delay: (rowIndex * 0.05) + (itemIndex * 0.02),
        duration: 0.3,
        ease: 'easeOut'
      }}
      className="relative overflow-hidden cursor-pointer group flex-shrink-0 flex items-center justify-center"
      style={{
        width: `${item.calculatedWidth}px`,
        height: `${item.calculatedHeight}px`,
        minWidth: `${item.calculatedWidth}px`,
        minHeight: `${item.calculatedHeight}px`,
        maxWidth: `${item.calculatedWidth}px`,
        maxHeight: `${item.calculatedHeight}px`,
        margin: 0,
        padding: 0,
        flexShrink: 0,
        lineHeight: 0,
        verticalAlign: 'top',
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image - use object-cover to fill fixed-size frame */}
      <OptimizedImage
        src={item.imageUrl}
        variants={item.variants}
        alt={item.alt}
        variant="feed"
        className="w-full h-full transition-transform duration-300 group-hover:scale-[1.02]"
        aspectRatio="auto"
        objectFit="cover"
        containerClassName="w-full h-full"
        onLoad={onImageLoad}
      />

      {/* Hover overlay */}
      <motion.div
        initial={false}
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"
      />

      {/* Custom overlay content */}
      {renderOverlay && (
        <motion.div
          initial={false}
          animate={{
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 10,
          }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-end p-3"
        >
          {renderOverlay(item)}
        </motion.div>
      )}

      {/* Subtle border highlight on hover */}
      <motion.div
        initial={false}
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 ring-1 ring-white/30 pointer-events-none"
      />
    </motion.div>
  );
}

export default JustifiedGrid;
export type { JustifiedItem, JustifiedGridProps };
