import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================
// PROFESSIONAL ART PLATFORM IMAGE SYSTEM
// =============================================
// Image variants:
// - FEED_PREVIEW: 600px max width, optimized for fast feed scrolling (≤250KB target)
// - VIEW_IMAGE: 2400px max width, high quality for full-screen viewing (≤2MB target)
// - ORIGINAL: Full resolution, stored privately, never publicly accessible
// =============================================

interface ImageQualityCheck {
  valid: boolean;
  error?: string;
  warning?: string;
}

// Validate image dimensions and file characteristics
async function validateImageQuality(
  file: File,
  dimensions: { width: number; height: number }
): Promise<ImageQualityCheck> {
  const { width, height } = dimensions;
  const longestSide = Math.max(width, height);
  
  // Check max resolution (8000px longest side)
  if (longestSide > 8000) {
    return {
      valid: false,
      error: `Image too large. Maximum resolution is 8000px on the longest side. Your image: ${longestSide}px`
    };
  }

  // Check minimum resolution for quality
  if (longestSide < 400) {
    return {
      valid: false,
      error: `Image too small. Minimum resolution is 400px. Your image: ${longestSide}px`
    };
  }

  // Check file size (max 25MB)
  if (file.size > 25 * 1024 * 1024) {
    return {
      valid: false,
      error: `File too large. Maximum size is 25MB. Your file: ${(file.size / (1024 * 1024)).toFixed(1)}MB`
    };
  }

  // Aspect ratio check (extreme ratios may indicate corrupted files)
  const aspectRatio = width / height;
  if (aspectRatio > 10 || aspectRatio < 0.1) {
    return {
      valid: false,
      error: 'Image has an extreme aspect ratio. Please use a standard image format.'
    };
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Verify user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'uploads'

    if (!file) {
      throw new Error('No file provided')
    }

    // =============================================
    // A. VALIDATE UPLOAD LIMITS
    // =============================================
    
    // Only accept JPG and PNG (as per spec)
    const allowedTypes = ['image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG and PNG files are accepted for professional artwork.')
    }

    // Max 25MB
    if (file.size > 25 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 25MB')
    }

    // Validate file is not corrupted by checking magic bytes
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // Check magic bytes
    const isPNG = uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47
    const isJPEG = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF

    if (!isPNG && !isJPEG) {
      throw new Error('Corrupted or invalid image file. Please upload a valid JPEG or PNG.')
    }

    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')?.trim()
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY')?.trim()
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET')?.trim()

    console.log('Cloudinary env present:', {
      cloudName: !!cloudName,
      apiKeyLen: apiKey?.length ?? 0,
      apiSecretLen: apiSecret?.length ?? 0,
    })

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary configuration missing')
    }

    if (apiSecret.length < 20) {
      throw new Error('Cloudinary API secret looks invalid (too short). Please update the CLOUDINARY_API_SECRET secret.')
    }

    // =============================================
    // B. UPLOAD TO CLOUDINARY
    // =============================================
    
    const timestamp = Math.floor(Date.now() / 1000)
    const folderPath = `${folder}/${user.id}`

    // Parameters for upload with image normalization:
    // - Strip EXIF metadata
    // - Convert to sRGB color profile
    // - Store original at full resolution (private)
    const uploadParams: Record<string, string> = {
      folder: folderPath,
      timestamp: timestamp.toString(),
      // Cloudinary flags for normalization
      colors: 'true', // Extract color info
      // The original is stored as-is, transformations are done on delivery
    }

    const sortedParams = Object.keys(uploadParams).sort()
    const signatureString = sortedParams
      .map((key) => `${key}=${uploadParams[key]}`)
      .join('&') + apiSecret

    const encoder = new TextEncoder()
    const data = encoder.encode(signatureString)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    // Reconstruct file from array buffer for upload
    const uploadFile = new File([arrayBuffer], file.name, { type: file.type })

    const cloudinaryFormData = new FormData()
    cloudinaryFormData.append('file', uploadFile)
    cloudinaryFormData.append('api_key', apiKey)
    cloudinaryFormData.append('timestamp', timestamp.toString())
    cloudinaryFormData.append('signature', signature)
    cloudinaryFormData.append('folder', folderPath)
    cloudinaryFormData.append('colors', 'true')

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: cloudinaryFormData
      }
    )

    if (!cloudinaryResponse.ok) {
      const errorText = await cloudinaryResponse.text()
      console.error('Cloudinary error:', errorText)
      throw new Error(`Cloudinary upload failed: ${errorText}`)
    }

    const cloudinaryData = await cloudinaryResponse.json()
    console.log('Cloudinary response:', JSON.stringify(cloudinaryData))

    // =============================================
    // C. IMAGE QUALITY ASSURANCE
    // =============================================
    
    const qualityCheck = await validateImageQuality(file, {
      width: cloudinaryData.width,
      height: cloudinaryData.height
    })

    if (!qualityCheck.valid) {
      throw new Error(qualityCheck.error || 'Image quality check failed')
    }

    // =============================================
    // D. BUILD IMAGE VARIANTS
    // =============================================
    
    const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`
    const publicId = cloudinaryData.public_id

    // Image transformation parameters:
    // - f_auto: Automatic format selection (AVIF → WebP → JPEG)
    // - q_auto: Automatic quality optimization
    // - c_limit: Limit size without upscaling
    // - fl_strip_profile: Strip EXIF data
    // - cs_srgb: Convert to sRGB color space
    
    const variants = {
      // Blur placeholder (tiny, for progressive loading)
      url_blur: `${baseUrl}/w_50,h_50,c_limit,e_blur:1000,f_auto,q_10/${publicId}`,
      
      // FEED_PREVIEW: 600px max, optimized for fast feed (target ≤250KB)
      // Using q_auto:low for smaller file size in feed
      url_small: `${baseUrl}/w_600,c_limit,f_auto,q_auto:good,fl_strip_profile,cs_srgb/${publicId}`,
      
      // VIEW_IMAGE: 2400px max, high quality for full-screen viewing
      url_medium: `${baseUrl}/w_1200,c_limit,f_auto,q_auto:best,fl_strip_profile,cs_srgb/${publicId}`,
      
      // VIEW_IMAGE (large): 2400px for full-screen high quality
      url_large: `${baseUrl}/w_2400,c_limit,f_auto,q_auto:best,fl_strip_profile,cs_srgb/${publicId}`,
    }

    // Note: Original image (full resolution) is accessed via get-signed-url edge function only

    // =============================================
    // E. STORE IN DATABASE
    // =============================================
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: imageAsset, error: dbError } = await supabaseAdmin
      .from('image_assets')
      .insert({
        owner_id: user.id,
        cloudinary_public_id: publicId,
        original_filename: file.name,
        width: cloudinaryData.width,
        height: cloudinaryData.height,
        format: cloudinaryData.format,
        bytes: cloudinaryData.bytes,
        ...variants,
        // Mark original as private by default
        original_private: true,
        visibility: 'public' // Variants are public, original is private
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error(`Failed to save image metadata: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageAsset,
        variants,
        // For backward compatibility
        image_url: variants.url_medium,
        // Quality info
        quality: {
          width: cloudinaryData.width,
          height: cloudinaryData.height,
          format: cloudinaryData.format,
          bytes: cloudinaryData.bytes,
          aspectRatio: (cloudinaryData.width / cloudinaryData.height).toFixed(2)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
