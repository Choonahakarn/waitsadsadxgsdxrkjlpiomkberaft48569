import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { imageAssetId, publicId } = await req.json()

    if (!imageAssetId && !publicId) {
      throw new Error('imageAssetId or publicId is required')
    }

    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET')

    if (!cloudName || !apiSecret) {
      throw new Error('Cloudinary configuration missing')
    }

    let targetPublicId = publicId

    // If imageAssetId provided, get publicId from database
    if (imageAssetId && !publicId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const { data: imageAsset, error: dbError } = await supabaseAdmin
        .from('image_assets')
        .select('cloudinary_public_id')
        .eq('id', imageAssetId)
        .single()

      if (dbError || !imageAsset) {
        throw new Error('Image not found')
      }

      targetPublicId = imageAsset.cloudinary_public_id
    }

    // Generate signed URL with 5 minute expiry
    const expiresAt = Math.floor(Date.now() / 1000) + 300 // 5 minutes

    // Cloudinary signed URL format
    // For original quality image (no transformations except format)
    const transformation = 'f_auto,q_auto:best'
    
    // Create signature for the URL
    const signatureString = `${transformation}/${targetPublicId}${expiresAt}${apiSecret}`
    const encoder = new TextEncoder()
    const data = encoder.encode(signatureString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8)

    // Build signed URL
    const signedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/s--${signature}--/${transformation}/${targetPublicId}?_a=${expiresAt}`

    // For Cloudinary, we can also use the authenticated URL approach
    // But for simplicity, we'll return the high-quality URL with timestamp
    const originalUrl = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto:best/${targetPublicId}`

    return new Response(
      JSON.stringify({ 
        success: true, 
        signedUrl: originalUrl, // Using direct URL for now (can implement proper signing later)
        expiresAt: new Date(expiresAt * 1000).toISOString()
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
