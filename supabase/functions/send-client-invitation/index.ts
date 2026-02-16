import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  email: string
  firstName: string
  lastName: string
  lawyerName: string
  clientId: string
  redirectTo: string
  phone: string // Now required
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || ''
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || ''
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || ''

// Email template embedded directly in the code
const emailTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to DocuLaw - Your Client Portal</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .header {
      text-align: center;
      padding: 20px 0;
    }
    .logo {
      max-width: 200px;
      margin-bottom: 20px;
    }
    .content {
      background-color: #ffffff;
      padding: 30px;
      border-radius: 6px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 20px;
      font-size: 0.85em;
      color: #6c757d;
    }
    .highlight {
      background-color: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      border-left: 3px solid #4f46e5;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://doculaw.app/logo.png" alt="DocuLaw Logo" class="logo">
      <h1>Welcome to DocuLaw!</h1>
    </div>
    
    <div class="content">
      <p>Hello {{firstName}},</p>
      
      <p>You've been invited by <strong>{{lawyerName}}</strong> to join DocuLaw, your secure client portal to collaborate on your legal matters.</p>
      
      <p>Through DocuLaw, you can:</p>
      <ul>
        <li>Access important case documents</li>
        <li>Securely communicate with your legal team</li>
        <li>Stay updated on your case progress</li>
        <li>Sign documents electronically</li>
      </ul>
      
      <p>Click the button below to access your account:</p>
      
      <div style="text-align: center;">
        <a href="{{magicLink}}" class="button">Access Your Client Portal</a>
      </div>
      
      <div class="highlight">
        <p>If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">{{magicLink}}</p>
      </div>
      
      <p><strong>Note:</strong> This magic link will expire in 24 hours. If you need a new link, please contact your attorney or sign up with this email address: <strong>{{clientEmail}}</strong></p>
      
      <p>We're excited to have you on board!</p>
      
      <p>Best regards,<br>
      The DocuLaw Team<br>
      On behalf of {{lawyerName}}</p>
    </div>
    
    <div class="footer">
      <p>© 2024 DocuLaw, Inc. All rights reserved.</p>
      <p>This is a service email sent to {{clientEmail}}. You're receiving this email because your attorney has invited you to use DocuLaw.</p>
      <p>If you believe this was sent in error, please contact your attorney directly.</p>
    </div>
  </div>
</body>
</html>`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Parse request body
    const { email, firstName, lastName, lawyerName, clientId, redirectTo, phone } = await req.json() as RequestBody

    if (!email || !firstName || !lastName || !phone) {
      return new Response(
        JSON.stringify({ error: 'Email, firstName, lastName, and phone are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Generate a real magic link using Supabase Auth
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `https://doculaw.vercel.app/auth/callback?clientId=${clientId}`,
      },
    })

    if (error) {
      console.error('Error generating magic link:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const magicLink = data.properties.action_link

    // Update client record with an invitation sent timestamp
    const { error: updateError } = await supabase
      .from('clients')
      .update({ 
        invitation_sent_at: new Date().toISOString(),
        status: 'invited',
        invitation_url: magicLink // Store the magic link in the database
      })
      .eq('id', clientId)

    if (updateError) {
      console.error('Error updating client record:', updateError)
      // Continue - don't fail the entire request if just the update fails
    }

    // Log the link for debugging
    console.log(`Magic link generated for ${firstName} ${lastName}: ${magicLink}`);

    // Send SMS via Twilio
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Twilio credentials not set up properly');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Twilio credentials not set up properly',
          magicLink: magicLink // Include the link so it can be shared manually
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    try {
      const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const messageBody = `Hello ${firstName}, ${lawyerName} has invited you to DocuLaw, your secure client portal. Use this link to access your account: ${magicLink}`;
      
      const twilioResponse = await fetch(twilioEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`
        },
        body: new URLSearchParams({
          'To': phone,
          'From': TWILIO_PHONE_NUMBER,
          'Body': messageBody
        })
      });

      if (!twilioResponse.ok) {
        const twilioError = await twilioResponse.text();
        
        // Log failed SMS to database
        await supabase.from('sms_messages').insert({
          client_id: clientId,
          to_phone: phone,
          from_phone: TWILIO_PHONE_NUMBER,
          message_body: messageBody,
          message_type: 'invitation',
          status: 'failed',
          error_message: twilioError,
        });

        throw new Error(`Twilio SMS sending failed: ${twilioError}`);
      }

      const twilioResult = await twilioResponse.json();

      // Log successful SMS to database
      await supabase.from('sms_messages').insert({
        client_id: clientId,
        to_phone: phone,
        from_phone: TWILIO_PHONE_NUMBER,
        message_body: messageBody,
        message_type: 'invitation',
        status: 'sent',
        twilio_message_sid: twilioResult.sid,
        sent_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Client invited successfully via SMS',
          magicLink: magicLink
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (smsError) {
      console.error('Error sending SMS:', smsError);
      
      // If SMS fails, we still want to return the magic link
      return new Response(
        JSON.stringify({
          success: false,
          warning: 'Failed to send SMS but client was created',
          error: smsError instanceof Error ? smsError.message : 'SMS sending failed',
          magicLink: magicLink
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 