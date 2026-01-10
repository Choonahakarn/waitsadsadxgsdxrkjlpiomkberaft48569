import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import OptimizedImage from './OptimizedImage';

// =============================================
// PROFESSIONAL MASONRY GRID COMPONENT
// =============================================
// Pinterest/Cara-style masonry layout with:
// - Balanced shortest-column placement
// - Fixed column widths (260px desktop, 240px tablet, 2-col mobile)
// - Consistent gutter spacing (16px)
// - Lazy loading with blur placeholders
// - Subtle hover effects
// =============================================

interface MasonryItem {
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
  aspectRatio?: number; // Computed from width/height
}

interface MasonryGridProps<T extends MasonryItem> {
  items: T[];
  onItemClick?: (item: T) => void;
  renderOverlay?: (item: T) => React.ReactNode;
  className?: string;
  columnWidth?: {
    desktop: number;
    tablet: number;
  };
  gap?: number;
  // Feed aspect ratio normalization
  minAspectRatio?: number; // Default: 1 (1:1)
  maxAspectRatio?: number; // Default: 0.8 (4:5)
}

// Calculate column count based on container width
const getColumnCount = (containerWidth: number, columnWidth: number, gap: number): number => {
  if (containerWidth < 640) return 2; // Mobile: always 2 columns
  if (containerWidth < 1024) return Math.max(2, Math.floor((containerWidth + gap) / (columnWidth + gap)));
  return Math.max(3, Math.floor((containerWidth + gap) / (columnWidth + gap)));
};

// Normalize aspect ratio to prevent extreme layouts
const normalizeAspectRatio = (
  aspectRatio: number,
  minRatio: number,
  maxRatio: number
): number => {
  // aspectRatio = width / height
  // minRatio = 1 means 1:1 (square)
  // maxRatio = 0.8 means 4:5 (portrait)
  return Math.max(maxRatio, Math.min(minRatio, aspectRatio));
};

function MasonryGrid<T extends MasonryItem>({
  items,
  onItemClick,
  renderOverlay,
  className,
  columnWidth = { desktop: 260, tablet: 240 },
  gap = 16,
  minAspectRatio = 1, // 1:1 square
  maxAspectRatio = 0.8, // 4:5 portrait
}: MasonryGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [columns, setColumns] = useState<T[][]>([]);

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

  // Calculate layout
  const layout = useMemo(() => {
    if (!containerWidth || items.length === 0) {
      return { columns: [], columnWidth: 0, columnCount: 0 };
    }

    const isMobile = containerWidth < 640;
    const isTablet = containerWidth >= 640 && containerWidth < 1024;
    const currentColumnWidth = isMobile 
      ? (containerWidth - gap) / 2 
      : isTablet 
        ? columnWidth.tablet 
        : columnWidth.desktop;

    const columnCount = getColumnCount(containerWidth, currentColumnWidth, gap);
    
    // Initialize columns with heights
    const columnHeights = new Array(columnCount).fill(0);
    const columnItems: T[][] = Array.from({ length: columnCount }, () => []);

    // Distribute items using shortest-column algorithm
    items.forEach((item) => {
      // Calculate normalized aspect ratio
      const rawAspectRatio = item.aspectRatio || 
        (item.width && item.height ? item.width / item.height : 1);
      const normalizedRatio = normalizeAspectRatio(rawAspectRatio, minAspectRatio, maxAspectRatio);
      
      // Calculate item height based on aspect ratio
      const itemHeight = currentColumnWidth / normalizedRatio;

      // Find shortest column
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      
      // Add item to shortest column
      columnItems[shortestColumnIndex].push({
        ...item,
        aspectRatio: normalizedRatio,
      });
      
      // Update column height (include gap)
      columnHeights[shortestColumnIndex] += itemHeight + gap;
    });

    return {
      columns: columnItems,
      columnWidth: currentColumnWidth,
      columnCount,
    };
  }, [containerWidth, items, columnWidth, gap, minAspectRatio, maxAspectRatio]);

  return (
    <div 
      ref={containerRef} 
      className={cn('w-full', className)}
    >
      <div 
        className="flex justify-center"
        style={{ gap: `${gap}px` }}
      >
        {layout.columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className="flex flex-col"
            style={{ 
              width: layout.columnWidth,
              gap: `${gap}px`,
            }}
          >
            {column.map((item, itemIndex) => (
              <MasonryItem
                key={item.id}
                item={item}
                onClick={() => onItemClick?.(item)}
                renderOverlay={renderOverlay}
                columnIndex={columnIndex}
                itemIndex={itemIndex}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Individual masonry item component
interface MasonryItemProps<T extends MasonryItem> {
  item: T;
  onClick?: () => void;
  renderOverlay?: (item: T) => React.ReactNode;
  columnIndex: number;
  itemIndex: number;
}

function MasonryItem<T extends MasonryItem>({
  item,
  onClick,
  renderOverlay,
  columnIndex,
  itemIndex,
}: MasonryItemProps<T>) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: (columnIndex + itemIndex) * 0.03,
        duration: 0.3,
        ease: 'easeOut'
      }}
      className="relative overflow-hidden rounded-lg bg-muted cursor-pointer group"
      style={{
        aspectRatio: item.aspectRatio || 1,
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <OptimizedImage
        src={item.imageUrl}
        variants={item.variants}
        alt={item.alt}
        variant="feed"
        className="w-full h-full transition-transform duration-300 group-hover:scale-105"
        aspectRatio="auto"
      />

      {/* Hover overlay with subtle shadow effect */}
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

export default MasonryGrid;
export type { MasonryItem, MasonryGridProps };
