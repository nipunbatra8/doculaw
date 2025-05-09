import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  email: string
  redirectTo: string
}

// This function validates if an email belongs to a client and sends a magic link
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    // Create a Supabase client with the service role key (admin privileges)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Parse the request body
    const { email, redirectTo } = await req.json() as RequestBody

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Normalize the email
    const normalizedEmail = email.trim().toLowerCase()
    
    // Check if this email belongs to a client in the database
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, email, first_name, last_name')
      .ilike('email', normalizedEmail)
      .limit(1)
    
    // Log client lookup results (for debugging)
    console.log('Client lookup:', { normalizedEmail, found: clientData && clientData.length > 0, clientError })
    
    // If no client found, return an error
    if (clientError || !clientData || clientData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This email is not registered as a client',
          details: 'Please contact your lawyer for an invitation' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }
    
    // Client found, send a magic link
    const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
        redirectTo: redirectTo || `${new URL(req.url).origin}/auth/callback`,
        // Set user metadata to ensure they're identified as a client
        data: {
          user_type: 'client'
        }
      }
    })
    
    if (authError) {
      console.error('Error generating magic link:', authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authError.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Magic link sent successfully',
        email: normalizedEmail
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 