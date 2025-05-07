import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  email: string
  password: string
  metadata: {
    full_name: string
    client_id: string
    lawyer_id: string
    user_type: string
  }
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Parse request body
    const { email, password, metadata } = await req.json() as RequestBody

    if (!email || !password || !metadata) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and metadata are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create the user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: metadata,
      app_metadata: {
        role: 'client',
      },
    })

    if (error) {
      console.error('Error creating user:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Update the client record with the new user ID
    const { error: updateError } = await supabase
      .from('clients')
      .update({ user_id: data.user.id })
      .eq('id', metadata.client_id)

    if (updateError) {
      console.error('Error updating client record:', updateError)
      // Continue - don't fail the entire request if just the update fails
    }

    // No longer creating a profile record for the client user

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Client user created successfully',
        user: {
          id: data.user.id,
          email: data.user.email,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 