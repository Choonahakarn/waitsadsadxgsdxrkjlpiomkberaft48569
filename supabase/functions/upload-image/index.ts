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

    const formData = await req.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'uploads'

    if (!file) {
      throw new Error('No file provided')
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF')
    }

    // Max 20MB
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 20MB')
    }

    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY')
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET')

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary configuration missing')
    }

    // Create timestamp and signature for authenticated upload
    const timestamp = Math.floor(Date.now() / 1000)
    const folderPath = `${folder}/${user.id}`
    
    // NOTE: We generate variant URLs via Cloudinary URL transformations (on-demand)
    // instead of using `eager` transformations during upload. This avoids signature
    // mismatches caused by transformation-string normalization.

    // Create signature - parameters MUST be sorted alphabetically
    // Include all parameters that will be sent (except file, api_key, signature)
    const paramsToSign: Record<string, string> = {
      folder: folderPath,
      timestamp: timestamp.toString(),
    }

    const sortedParams = Object.keys(paramsToSign).sort()
    const signatureString = sortedParams
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join('&') + apiSecret

    // Use SHA-1 for Cloudinary
    const encoder = new TextEncoder()
    const data = encoder.encode(signatureString)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    // Upload to Cloudinary
    const cloudinaryFormData = new FormData()
    cloudinaryFormData.append('file', file)
    cloudinaryFormData.append('api_key', apiKey)
    cloudinaryFormData.append('timestamp', timestamp.toString())
    cloudinaryFormData.append('signature', signature)
    cloudinaryFormData.append('folder', folderPath)

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

    // Build variant URLs
    const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`
    const publicId = cloudinaryData.public_id

    const variants = {
      url_blur: `${baseUrl}/w_50,h_50,c_limit,e_blur:1000,f_auto,q_10/${publicId}`,
      url_small: `${baseUrl}/w_400,c_limit,f_auto,q_auto:good/${publicId}`,
      url_medium: `${baseUrl}/w_1200,c_limit,f_auto,q_auto:best/${publicId}`,
      url_large: `${baseUrl}/w_2400,c_limit,f_auto,q_auto:best/${publicId}`,
    }

    // Store in database using service role
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
        ...variants
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
        // For backward compatibility, also return the medium URL as the main image_url
        image_url: variants.url_medium
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
