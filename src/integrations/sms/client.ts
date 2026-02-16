import { supabase } from "@/integrations/supabase/client";

export type SmsMessageType =
  | 'invitation'
  | 'questionnaire_sent'
  | 'reminder'
  | 'deadline_warning'
  | 'completion'
  | 'login_link'
  | 'custom';

export interface SendSmsParams {
  to_phone: string;
  message_type: SmsMessageType;
  client_id?: string;
  lawyer_id?: string;
  case_id?: string;
  questionnaire_id?: string;
  custom_message?: string;
  client_name?: string;
  lawyer_name?: string;
  case_name?: string;
  question_count?: number;
  deadline?: string;
  login_link?: string;
  remaining_questions?: number;
}

export interface SendSmsResult {
  success: boolean;
  message?: string;
  twilio_sid?: string;
  message_id?: string;
  message_body?: string;
  error?: string;
}

/**
 * Send an SMS message via the send-sms Edge Function.
 * This is the central SMS utility used across the app.
 */
export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: params,
    });

    if (error) {
      console.error('Edge function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }

    return data as SendSmsResult;
  } catch (err) {
    console.error('SMS send error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error sending SMS',
    };
  }
}

/**
 * Helper to get a client's phone number from the clients table.
 */
export async function getClientPhone(clientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('phone')
    .eq('id', clientId)
    .single();

  if (error || !data?.phone) {
    console.warn(`No phone found for client ${clientId}`);
    return null;
  }

  return data.phone;
}

/**
 * Helper to get client details for SMS.
 */
export async function getClientDetails(clientId: string): Promise<{
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}> {
  const { data, error } = await supabase
    .from('clients')
    .select('phone, first_name, last_name, email')
    .eq('id', clientId)
    .single();

  if (error || !data) {
    return { phone: null, first_name: null, last_name: null, email: null };
  }

  return data;
}
