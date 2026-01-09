import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageVariants {
  url_blur: string;
  url_small: string;
  url_medium: string;
  url_large: string;
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

interface UseImageUploadOptions {
  folder?: string;
  maxSizeMB?: number;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

export const useImageUpload = (options: UseImageUploadOptions = {}) => {
  const { 
    folder = 'uploads', 
    maxSizeMB = 20,
    onSuccess,
    onError 
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF';
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File too large. Maximum size is ${maxSizeMB}MB`;
    }

    return null;
  };

  const upload = async (file: File): Promise<UploadResult> => {
    const validationError = validateFile(file);
    if (validationError) {
      const errorResult: UploadResult = { success: false, error: validationError };
      toast.error(validationError);
      onError?.(validationError);
      return errorResult;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

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
    isUploading,
    progress,
    result,
    reset,
  };
};

export default useImageUpload;
