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
  targetRowHeight?: number; // Target height for each row (default: 250px)
  gap?: number; // Gap between images (default: 2px)
  maxRowHeight?: number; // Maximum row height (default: 400px)
  minRowHeight?: number; // Minimum row height (default: 150px)
}

interface Row {
  items: (T & { calculatedWidth: number; calculatedHeight: number })[];
  height: number;
}

function JustifiedGrid<T extends JustifiedItem>({
  items,
  onItemClick,
  renderOverlay,
  className,
  targetRowHeight = 250,
  gap = 2,
  maxRowHeight = 400,
  minRowHeight = 150,
}: JustifiedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [imageAspectRatios, setImageAspectRatios] = useState<Map<string, number>>(new Map());
  const [rows, setRows] = useState<Row[]>([]);

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

  // Calculate rows with justified layout
  const calculateRows = useMemo(() => {
    if (!containerWidth || items.length === 0) {
      return [];
    }

    const availableWidth = containerWidth;
    const calculatedRows: Row[] = [];
    let currentRow: (T & { calculatedWidth: number; calculatedHeight: number })[] = [];
    let currentRowAspectRatioSum = 0;

    items.forEach((item, index) => {
      // Get aspect ratio (width / height)
      const aspectRatio = imageAspectRatios.get(item.id) || 
                         item.aspectRatio || 
                         (item.width && item.height ? item.width / item.height : 1);

      // Add to current row
      currentRow.push({
        ...item,
        calculatedWidth: 0, // Will be calculated later
        calculatedHeight: 0, // Will be calculated later
      });
      currentRowAspectRatioSum += aspectRatio;

      // Check if we should finalize this row
      // Calculate what the row height would be with current items
      const rowWidth = availableWidth - (currentRow.length - 1) * gap;
      const rowHeight = rowWidth / currentRowAspectRatioSum;
      
      // Calculate how close this row height is to target
      const distanceFromTarget = Math.abs(rowHeight - targetRowHeight);
      
      // Finalize row if:
      // 1. Row height is within acceptable range AND close to target, OR
      // 2. This is the last item, OR
      // 3. Adding next item would make row worse (further from target or out of range)
      const isLastItem = index === items.length - 1;
      const isRowHeightAcceptable = rowHeight >= minRowHeight && rowHeight <= maxRowHeight;
      
      // Check what would happen if we add the next item
      let wouldNextItemBeWorse = false;
      if (!isLastItem) {
        const nextItem = items[index + 1];
        const nextAspectRatio = imageAspectRatios.get(nextItem.id) || 
                               nextItem.aspectRatio || 
                               (nextItem.width && nextItem.height ? nextItem.width / nextItem.height : 1);
        const nextRowAspectRatioSum = currentRowAspectRatioSum + nextAspectRatio;
        const nextRowWidth = availableWidth - (currentRow.length) * gap;
        const nextRowHeight = nextRowWidth / nextRowAspectRatioSum;
        const nextDistanceFromTarget = Math.abs(nextRowHeight - targetRowHeight);
        const nextIsAcceptable = nextRowHeight >= minRowHeight && nextRowHeight <= maxRowHeight;
        
        // Next item would be worse if:
        // - It's out of acceptable range, OR
        // - It's further from target than current
        wouldNextItemBeWorse = !nextIsAcceptable || (nextDistanceFromTarget > distanceFromTarget && isRowHeightAcceptable);
      }

      if ((isRowHeightAcceptable && distanceFromTarget < 50) || isLastItem || wouldNextItemBeWorse) {
        // Calculate final dimensions for this row
        // Clamp row height to acceptable range
        const finalRowHeight = Math.max(minRowHeight, Math.min(maxRowHeight, rowHeight));
        const finalRowWidth = availableWidth - (currentRow.length - 1) * gap;
        
        // Calculate widths based on aspect ratios
        currentRow.forEach((rowItem) => {
          const itemAspectRatio = imageAspectRatios.get(rowItem.id) || 
                                 rowItem.aspectRatio || 
                                 (rowItem.width && rowItem.height ? rowItem.width / rowItem.height : 1);
          rowItem.calculatedWidth = finalRowHeight * itemAspectRatio;
          rowItem.calculatedHeight = finalRowHeight;
        });

        // Normalize widths to fill available space exactly
        const totalCalculatedWidth = currentRow.reduce((sum, item) => sum + item.calculatedWidth, 0);
        if (totalCalculatedWidth > 0) {
          const scaleFactor = finalRowWidth / totalCalculatedWidth;
          currentRow.forEach((rowItem) => {
            rowItem.calculatedWidth *= scaleFactor;
          });
        }

        calculatedRows.push({
          items: [...currentRow],
          height: finalRowHeight,
        });

        // Reset for next row
        currentRow = [];
        currentRowAspectRatioSum = 0;
      }
    });

    return calculatedRows;
  }, [containerWidth, items, imageAspectRatios, gap, targetRowHeight, minRowHeight, maxRowHeight]);

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
    >
      <div className="flex flex-col" style={{ gap: `${gap}px` }}>
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex"
            style={{ gap: `${gap}px` }}
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
      className="relative overflow-hidden rounded-lg bg-muted cursor-pointer group flex-shrink-0"
      style={{
        width: `${item.calculatedWidth}px`,
        height: `${item.calculatedHeight}px`,
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image - use object-contain to preserve aspect ratio without cropping */}
      <OptimizedImage
        src={item.imageUrl}
        variants={item.variants}
        alt={item.alt}
        variant="feed"
        className="w-full h-full transition-transform duration-300 group-hover:scale-105"
        aspectRatio="auto"
        objectFit="contain"
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
        className="absolute inset-0 rounded-lg ring-2 ring-primary/20 pointer-events-none"
      />
    </motion.div>
  );
}

export default JustifiedGrid;
export type { JustifiedItem, JustifiedGridProps };
