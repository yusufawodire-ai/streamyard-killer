import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    if (!dailyApiKey) {
      console.error('DAILY_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'Daily API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = 'https://plklxboeramqlwgmhkpc.supabase.co/functions/v1/daily-webhook';
    
    console.log('Registering webhook with Daily.co...');
    console.log('Webhook URL:', webhookUrl);

    // Register webhook with Daily.co
    const response = await fetch('https://api.daily.co/v1/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        event_types: [
          'recording.started',
          'recording.ready-to-download',
          'recording.error'
        ]
      })
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Failed to register webhook:', responseData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to register webhook',
          details: responseData 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook registered successfully:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true,
        webhook: responseData,
        message: 'Webhook registered successfully with Daily.co'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error setting up webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
