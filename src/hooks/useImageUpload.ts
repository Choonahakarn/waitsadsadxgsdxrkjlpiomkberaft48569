import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// =============================================
// PROFESSIONAL IMAGE UPLOAD HOOK
// =============================================
// Handles client-side validation before upload:
// - Max resolution: 8000px (longest side)
// - Max file size: 25MB
// - Accepted formats: JPG, PNG only
// =============================================

interface ImageVariants {
  url_blur: string;
  url_small: string;
  url_medium: string;
  url_large: string;
}

interface ImageQuality {
  width: number;
  height: number;
  format: string;
  bytes: number;
  aspectRatio: string;
}

interface UploadResult {
  success: boolean;
  imageAsset?: {
    id: string;
    cloudinary_public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  } & ImageVariants;
  variants?: ImageVariants;
  image_url?: string;
  quality?: ImageQuality;
  error?: string;
}

interface UseImageUploadOptions {
  folder?: string;
  maxSizeMB?: number;
  maxResolution?: number;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  dimensions?: { width: number; height: number };
}

// Get image dimensions from file
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for dimension check'));
    };
    img.src = URL.createObjectURL(file);
  });
};

export const useImageUpload = (options: UseImageUploadOptions = {}) => {
  const { 
    folder = 'uploads', 
    maxSizeMB = 25,
    maxResolution = 8000,
    onSuccess,
    onError 
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);

  // Comprehensive file validation
  const validateFile = useCallback(async (file: File): Promise<ValidationResult> => {
    // =============================================
    // A. FILE TYPE VALIDATION
    // =============================================
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG and PNG files are accepted for professional artwork.'
      };
    }

    // =============================================
    // B. FILE SIZE VALIDATION
    // =============================================
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${maxSizeMB}MB. Your file: ${(file.size / (1024 * 1024)).toFixed(1)}MB`
      };
    }

    // =============================================
    // C. IMAGE RESOLUTION VALIDATION
    // =============================================
    try {
      const dimensions = await getImageDimensions(file);
      const longestSide = Math.max(dimensions.width, dimensions.height);

      if (longestSide > maxResolution) {
        return {
          valid: false,
          error: `Image too large. Maximum resolution is ${maxResolution}px on the longest side. Your image: ${longestSide}px`,
          dimensions
        };
      }

      if (longestSide < 400) {
        return {
          valid: false,
          error: `Image too small. Minimum resolution is 400px. Your image: ${longestSide}px`,
          dimensions
        };
      }

      // Check for extreme aspect ratios
      const aspectRatio = dimensions.width / dimensions.height;
      if (aspectRatio > 10 || aspectRatio < 0.1) {
        return {
          valid: false,
          error: 'Image has an extreme aspect ratio. Please use a standard image format.',
          dimensions
        };
      }

      return { valid: true, dimensions };
    } catch (err) {
      return {
        valid: false,
        error: 'Failed to read image. The file may be corrupted.'
      };
    }
  }, [maxSizeMB, maxResolution]);

  const upload = async (file: File): Promise<UploadResult> => {
    // Pre-upload validation
    const validation = await validateFile(file);
    if (!validation.valid) {
      const errorResult: UploadResult = { success: false, error: validation.error };
      toast.error(validation.error);
      onError?.(validation.error!);
      return errorResult;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 85));
      }, 150);

      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please login to upload images');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      // Upload via edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      clearInterval(progressInterval);
      setProgress(100);

      const uploadResult: UploadResult = await response.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      setResult(uploadResult);
      onSuccess?.(uploadResult);
      
      toast.success('Image uploaded successfully', {
        description: `${validation.dimensions?.width}×${validation.dimensions?.height}px`
      });
      
      return uploadResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      const errorResult: UploadResult = { success: false, error: errorMessage };
      
      toast.error(errorMessage);
      onError?.(errorMessage);
      setResult(errorResult);
      return errorResult;

    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const reset = () => {
    setResult(null);
    setProgress(0);
  };

  return {
    upload,
    validateFile,
    isUploading,
    progress,
    result,
    reset,
  };
};

export default useImageUpload;
