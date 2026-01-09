// @ts-nocheck
// This file is located at supabase/functions/send-sms/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Inlined corsHeaders to resolve module not found error during deployment.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: any;

// --- Provider: Semaphore Credentials ---
const semaphoreApiKey = Deno.env.get('SEMAPHORE_API_KEY');
const semaphoreSenderName = Deno.env.get('SEMAPHORE_SENDER_NAME');

/**
 * Sends an SMS using the Semaphore API.
 */
async function sendWithSemaphore(recipient: string, message: string) {
  if (!semaphoreApiKey) {
    throw new Error('Semaphore API key is not configured in Supabase secrets.');
  }
  // Semaphore requires the number without the leading '+'
  const semaphoreNumber = recipient.startsWith('+') ? recipient.substring(1) : recipient;

  const semaphoreUrl = 'https://api.semaphore.co/api/v4/messages';
  const params = new URLSearchParams();
  params.append('apikey', semaphoreApiKey);
  params.append('number', semaphoreNumber);
  params.append('message', message);
  
  // If a Sender Name is configured in the secrets, use it.
  if (semaphoreSenderName) {
    params.append('sendername', semaphoreSenderName);
  }

  const response = await fetch(semaphoreUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error('Semaphore API Error:', errorBody);
    throw new Error(`Semaphore Error: ${JSON.stringify(errorBody)}`);
  }
  return await response.json();
}


serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const messageRecord = payload.record;

    // Validate the incoming payload
    if (messageRecord.type !== 'SMS' || !messageRecord.recipient_address || !messageRecord.body) {
      return new Response(JSON.stringify({ error: 'Invalid SMS message payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const recipientNumber = messageRecord.recipient_address;
    const messageBody = messageRecord.body;
    
    // Directly dispatch the SMS using Semaphore
    console.log(`Dispatching SMS via Semaphore to: ${recipientNumber}`);
    const responseData = await sendWithSemaphore(recipientNumber, messageBody);
    
    console.log('SMS dispatched successfully via Semaphore.', responseData);

    return new Response(JSON.stringify({ success: true, details: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Semaphore SMS Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
