import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface SendSmsRequest {
  to_phone: string
  message_type: 'invitation' | 'questionnaire_sent' | 'reminder' | 'deadline_warning' | 'completion' | 'login_link' | 'custom'
  
  // Context for building messages
  client_id?: string
  lawyer_id?: string
  case_id?: string
  questionnaire_id?: string
  
  // For custom messages
  custom_message?: string
  
  // For template data
  client_name?: string
  lawyer_name?: string
  case_name?: string
  question_count?: number
  deadline?: string
  login_link?: string
  remaining_questions?: number
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || ''
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || ''
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || ''

function buildMessage(data: SendSmsRequest): string {
  const clientName = data.client_name || 'there'
  const lawyerName = data.lawyer_name || 'your attorney'
  const caseName = data.case_name || 'your case'
  const questionCount = data.question_count || 0
  const deadline = data.deadline ? new Date(data.deadline).toLocaleDateString() : 'as soon as possible'
  const remaining = data.remaining_questions || questionCount
  const link = data.login_link || ''

  switch (data.message_type) {
    case 'questionnaire_sent':
      return `Hi ${clientName}, ${lawyerName} needs your input for "${caseName}". Please complete ${questionCount} questions by ${deadline}. Sign in here: ${link}`

    case 'login_link':
      return `DocuLaw: Your login link is ready. Tap here to sign in to your client portal: ${link}`

    case 'reminder':
      return `Reminder: You have ${remaining} unanswered question${remaining !== 1 ? 's' : ''} for "${caseName}" due ${deadline}. Sign in: ${link}`

    case 'deadline_warning':
      return `URGENT: Your questionnaire for "${caseName}" is due tomorrow. ${remaining} question${remaining !== 1 ? 's' : ''} remaining. Please complete ASAP: ${link}`

    case 'completion':
      return `${clientName} has completed the questionnaire for "${caseName}". All ${questionCount} questions answered. Review responses in DocuLaw.`

    case 'invitation':
      return `Hi ${clientName}, ${lawyerName} has invited you to DocuLaw, your secure client portal. Access your account: ${link}`

    case 'custom':
      return data.custom_message || `Message from ${lawyerName} about "${caseName}": Please check your DocuLaw portal.`

    default:
      return `DocuLaw: You have a new notification. Please sign in to your portal.`
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const data = await req.json() as SendSmsRequest

    if (!data.to_phone) {
      return new Response(
        JSON.stringify({ error: 'to_phone is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!data.message_type) {
      return new Response(
        JSON.stringify({ error: 'message_type is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate Twilio credentials
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Build the message
    const messageBody = buildMessage(data)

    // Log the message to database
    const { data: messageRecord, error: dbError } = await supabase
      .from('sms_messages')
      .insert({
        lawyer_id: data.lawyer_id,
        client_id: data.client_id,
        to_phone: data.to_phone,
        from_phone: TWILIO_PHONE_NUMBER,
        message_body: messageBody,
        message_type: data.message_type,
        case_id: data.case_id,
        questionnaire_id: data.questionnaire_id,
        status: 'pending',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error logging SMS to database:', dbError)
      // Continue anyway - sending is more important than logging
    }

    // Send via Twilio
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

    const twilioResponse = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`
      },
      body: new URLSearchParams({
        'To': data.to_phone,
        'From': TWILIO_PHONE_NUMBER,
        'Body': messageBody
      })
    })

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text()
      console.error('Twilio error:', twilioError)

      // Update message record with failure
      if (messageRecord) {
        await supabase
          .from('sms_messages')
          .update({
            status: 'failed',
            error_message: twilioError,
          })
          .eq('id', messageRecord.id)
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send SMS',
          details: twilioError,
          message_id: messageRecord?.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const twilioResult = await twilioResponse.json()

    // Update message record with success
    if (messageRecord) {
      await supabase
        .from('sms_messages')
        .update({
          status: 'sent',
          twilio_message_sid: twilioResult.sid,
          sent_at: new Date().toISOString(),
        })
        .eq('id', messageRecord.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS sent successfully',
        twilio_sid: twilioResult.sid,
        message_id: messageRecord?.id,
        message_body: messageBody
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('SMS API error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
