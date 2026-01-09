import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { processImageBeforeUpload, isValidImageFormat, formatFileSize } from '@/lib/imageProcessing';

interface ImageVariants {
  url_blur: string;
  url_small: string;
  url_medium: string;
  url_large: string;
  url_original?: string;
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
  error?: string;
}

type UploadStatus = 'idle' | 'validating' | 'processing' | 'uploading' | 'complete' | 'error';

interface UseImageUploadOptions {
  folder?: string;
  maxSizeMB?: number;        // Default 25MB
  maxResolution?: number;    // Default 8000px
  autoResize?: boolean;      // Default true
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

export const useImageUpload = (options: UseImageUploadOptions = {}) => {
  const { 
    folder = 'uploads', 
    maxSizeMB = 25,
    maxResolution = 8000,
    autoResize = true,
    onSuccess,
    onError 
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [result, setResult] = useState<UploadResult | null>(null);

  const validateFile = (file: File): string | null => {
    // Only allow JPG and PNG
    if (!isValidImageFormat(file)) {
      return 'Invalid file type. Allowed: JPG, PNG only';
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File too large. Maximum size is ${maxSizeMB}MB (your file: ${formatFileSize(file.size)})`;
    }

    return null;
  };

  const upload = async (file: File): Promise<UploadResult> => {
    setStatus('validating');
    
    const validationError = validateFile(file);
    if (validationError) {
      const errorResult: UploadResult = { success: false, error: validationError };
      toast.error(validationError);
      onError?.(validationError);
      setStatus('error');
      return errorResult;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      let processedFile = file;
      
      // Auto resize if enabled
      if (autoResize) {
        setStatus('processing');
        setProgress(10);
        
        try {
          const processed = await processImageBeforeUpload(file, {
            maxDimension: maxResolution,
            quality: 0.92,
            maxSizeMB,
          });
          
          processedFile = processed.file;
          
          if (processed.wasResized) {
            console.log(`Image resized: ${processed.originalWidth}x${processed.originalHeight} → ${processed.width}x${processed.height}`);
            toast.info(`Image resized to fit ${maxResolution}px limit`);
          }
        } catch (processError) {
          console.warn('Image processing failed, uploading original:', processError);
          // Continue with original file if processing fails
        }
      }

      setStatus('uploading');
      setProgress(30);

      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please login to upload images');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', processedFile);
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
      setStatus('complete');

      const uploadResult: UploadResult = await response.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      setResult(uploadResult);
      onSuccess?.(uploadResult);
      return uploadResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      const errorResult: UploadResult = { success: false, error: errorMessage };
      
      toast.error(errorMessage);
      onError?.(errorMessage);
      setResult(errorResult);
      setStatus('error');
      return errorResult;

    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const reset = () => {
    setResult(null);
    setProgress(0);
    setStatus('idle');
  };

  return {
    upload,
    isUploading,
    progress,
    status,
    result,
    reset,
  };
};

export default useImageUpload;
