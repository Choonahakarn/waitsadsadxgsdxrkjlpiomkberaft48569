/**
 * Client-side image processing utilities
 * - Max resolution: 8000px
 * - Formats: JPG, PNG only
 * - Color space: sRGB
 * - No upscaling
 */

export interface ProcessedImageResult {
  file: File;
  width: number;
  height: number;
  wasResized: boolean;
  originalWidth: number;
  originalHeight: number;
}

export interface ImageProcessingOptions {
  maxDimension?: number;  // Default 8000px
  quality?: number;       // Default 0.92 (92%)
  maxSizeMB?: number;     // Default 25MB
}

/**
 * Get dimensions of an image file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Resize image if it exceeds max dimension
 * Uses canvas to resize and compress
 * Never upscales - only downscales
 */
export async function processImageBeforeUpload(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImageResult> {
  const {
    maxDimension = 8000,
    quality = 0.92,
    maxSizeMB = 25,
  } = options;

  // Get original dimensions
  const { width: originalWidth, height: originalHeight } = await getImageDimensions(file);
  
  // Check if resize is needed (only downscale, never upscale)
  const maxOriginal = Math.max(originalWidth, originalHeight);
  const needsResize = maxOriginal > maxDimension;
  
  // If no resize needed and file size is OK, return original
  if (!needsResize && file.size <= maxSizeMB * 1024 * 1024) {
    return {
      file,
      width: originalWidth,
      height: originalHeight,
      wasResized: false,
      originalWidth,
      originalHeight,
    };
  }

  // Calculate new dimensions (maintain aspect ratio)
  let newWidth = originalWidth;
  let newHeight = originalHeight;
  
  if (needsResize) {
    const scale = maxDimension / maxOriginal;
    newWidth = Math.round(originalWidth * scale);
    newHeight = Math.round(originalHeight * scale);
  }

  // Create canvas for processing
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Load image
  const img = await loadImage(file);
  
  // Draw with high-quality settings
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  // Determine output format (preserve original, but only JPG/PNG)
  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  
  // Convert to blob with quality setting
  let blob = await canvasToBlob(canvas, outputType, quality);
  
  // If still too large, progressively reduce quality (only for JPEG)
  if (outputType === 'image/jpeg' && blob.size > maxSizeMB * 1024 * 1024) {
    let currentQuality = quality;
    while (blob.size > maxSizeMB * 1024 * 1024 && currentQuality > 0.5) {
      currentQuality -= 0.1;
      blob = await canvasToBlob(canvas, outputType, currentQuality);
    }
  }

  // Create new File object
  const processedFile = new File(
    [blob],
    file.name,
    { type: outputType }
  );

  return {
    file: processedFile,
    width: newWidth,
    height: newHeight,
    wasResized: needsResize,
    originalWidth,
    originalHeight,
  };
}

/**
 * Load an image file into an HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Convert canvas to Blob with specified format and quality
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Validate file format (JPG, PNG only)
 */
export function isValidImageFormat(file: File): boolean {
  return ['image/jpeg', 'image/png'].includes(file.type);
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
