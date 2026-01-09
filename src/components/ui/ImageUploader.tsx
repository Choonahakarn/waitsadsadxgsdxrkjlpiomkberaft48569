import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

interface ImageUploaderProps {
  onUploadComplete: (result: UploadResult) => void;
  folder?: string;
  maxSizeMB?: number;
  accept?: string;
  className?: string;
  disabled?: boolean;
  preview?: string;
  onPreviewClear?: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadComplete,
  folder = 'community',
  maxSizeMB = 20,
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  className,
  disabled = false,
  preview,
  onPreviewClear,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(preview || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const allowedTypes = accept.split(',');
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type. Allowed: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File too large. Maximum size is ${maxSizeMB}MB`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create local preview
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
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
      setUploadProgress(100);

      const result: UploadResult = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update preview with optimized URL
      if (result.variants?.url_medium) {
        setPreviewUrl(result.variants.url_medium);
      }

      toast.success('Image uploaded successfully!');
      onUploadComplete(result);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
      setPreviewUrl(null);
      onUploadComplete({ success: false, error: String(error) });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, [disabled, isUploading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onPreviewClear?.();
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="sr-only"
        id="image-upload"
      />

      {previewUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-auto max-h-96 object-contain bg-muted"
          />
          
          {/* Progress overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm font-medium">{uploadProgress}%</span>
            </div>
          )}

          {/* Clear button */}
          {!isUploading && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <label
          htmlFor="image-upload"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-4 p-8',
            'border-2 border-dashed rounded-lg cursor-pointer',
            'transition-colors duration-200',
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
            (disabled || isUploading) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</span>
            </>
          ) : (
            <>
              <div className="p-4 rounded-full bg-muted">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium">
                  Drop image here or click to browse
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, WebP, GIF up to {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </label>
      )}
    </div>
  );
};

export default ImageUploader;
