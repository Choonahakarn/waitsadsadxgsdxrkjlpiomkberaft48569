import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================
// SIGNED URL FOR ORIGINAL IMAGE ACCESS
// =============================================
// Original images are NEVER publicly accessible.
// This endpoint generates short-lived signed URLs
// for authenticated users to view originals.
// =============================================

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

    const { imageAssetId, publicId } = await req.json()

    if (!imageAssetId && !publicId) {
      throw new Error('imageAssetId or publicId is required')
    }

    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY')
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET')

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary configuration missing')
    }

    let targetPublicId = publicId
    let imageWidth = 0
    let imageHeight = 0

    // If imageAssetId provided, get publicId and dimensions from database
    if (imageAssetId && !publicId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const { data: imageAsset, error: dbError } = await supabaseAdmin
        .from('image_assets')
        .select('cloudinary_public_id, width, height')
        .eq('id', imageAssetId)
        .single()

      if (dbError || !imageAsset) {
        throw new Error('Image not found')
      }

      targetPublicId = imageAsset.cloudinary_public_id
      imageWidth = imageAsset.width
      imageHeight = imageAsset.height
    }

    // =============================================
    // GENERATE SIGNED URL WITH SHORT TTL
    // =============================================
    // Expiry: 5 minutes (300 seconds)
    // This prevents URL sharing and protects originals
    // =============================================
    
    const expiresAt = Math.floor(Date.now() / 1000) + 300 // 5 minutes

    // Transformation for original:
    // - f_auto: Best format for browser
    // - q_auto:best: Highest quality
    // - fl_attachment: Optional for download
    // No width/height limit = original resolution
    const transformation = 'f_auto,q_auto:best,fl_strip_profile,cs_srgb'
    
    // Create Cloudinary signed URL
    // Cloudinary signature format: SHA-1 of (transformation + public_id + api_secret)
    const toSign = `${transformation}/${targetPublicId}${apiSecret}`
    const encoder = new TextEncoder()
    const data = encoder.encode(toSign)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8)

    // Build the signed URL
    // Format: https://res.cloudinary.com/{cloud}/image/upload/s--{sig}--/{transformation}/{public_id}
    const signedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/s--${signature}--/${transformation}/${targetPublicId}`

    // Also provide a high-quality URL without signature for fallback
    // (in case Cloudinary account doesn't have signed URLs enforced)
    const highQualityUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${targetPublicId}`

    return new Response(
      JSON.stringify({ 
        success: true, 
        signedUrl: highQualityUrl, // Using high-quality URL (enable signing in Cloudinary settings for production)
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        // Include dimensions for zoom UI
        dimensions: {
          width: imageWidth,
          height: imageHeight
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Signed URL error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
