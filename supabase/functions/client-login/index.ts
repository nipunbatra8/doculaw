import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  email: string
  redirectTo: string
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || ''
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || ''
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || ''

// This function validates if an email belongs to a client and sends a magic link
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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
      .select('id, email, first_name, last_name, phone')
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

    // Client found, check if auth user exists
    const { data: { users }, error: userCheckError } = await supabase.auth.admin.listUsers()
    const authUserExists = users?.some(u => u.email?.toLowerCase() === normalizedEmail)

    console.log('Auth user check:', { normalizedEmail, authUserExists, userCheckError })

    // Client found, send a magic link via email
    const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        redirectTo: redirectTo || `https://doculaw.vercel.app/auth/callback`,
        data: {
          user_type: 'client',
          client_id: clientData[0].id,
          full_name: `${clientData[0].first_name} ${clientData[0].last_name}`.trim()
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

    // Also send login link via SMS if phone number exists
    let smsSent = false
    const clientPhone = clientData[0].phone

    if (clientPhone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
      try {
        const smsBody = `DocuLaw: Your login link has been sent to ${normalizedEmail}. Check your email to sign in to your client portal.`

        const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
        const twilioResponse = await fetch(twilioEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`
          },
          body: new URLSearchParams({
            'To': clientPhone,
            'From': TWILIO_PHONE_NUMBER,
            'Body': smsBody
          })
        })

        if (twilioResponse.ok) {
          smsSent = true
          console.log(`SMS login notification sent to ${clientPhone}`)

          // Log to sms_messages table
          await supabase.from('sms_messages').insert({
            client_id: clientData[0].id,
            to_phone: clientPhone,
            from_phone: TWILIO_PHONE_NUMBER,
            message_body: smsBody,
            message_type: 'login_link',
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
        } else {
          console.error('Twilio SMS failed:', await twilioResponse.text())
        }
      } catch (smsError) {
        console.error('SMS send error (non-blocking):', smsError)
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Magic link sent successfully',
        email: normalizedEmail,
        sms_sent: smsSent
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