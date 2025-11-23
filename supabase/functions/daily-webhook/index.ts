import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET requests (Daily.co verification)
  if (req.method === 'GET') {
    console.log('GET request received - webhook verification');
    return new Response(
      JSON.stringify({ status: 'ok', message: 'Webhook endpoint is active' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Try to parse JSON, handle gracefully if not valid JSON
    let payload;
    try {
      payload = await req.json();
    } catch (parseError) {
      console.log('Non-JSON request received, returning OK for verification');
      return new Response(
        JSON.stringify({ status: 'ok', message: 'Webhook endpoint is active' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('=== Daily.co Webhook Received ===');
    console.log('Full payload:', JSON.stringify(payload, null, 2));
    console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers), null, 2));

    const { type, payload: eventPayload } = payload;

    if (!type || !eventPayload) {
      console.error('Invalid webhook payload structure');
      // Return 200 to prevent webhook retries
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the room name from multiple possible paths in webhook payload
    const roomName = eventPayload.room?.name || 
                     eventPayload.roomName || 
                     eventPayload.room_name ||
                     eventPayload.room?.id;
    
    if (!roomName) {
      console.error('No room name in webhook payload. Payload structure:', Object.keys(eventPayload));
      // Return 200 to prevent webhook retries
      return new Response(
        JSON.stringify({ error: 'No room name provided' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing webhook for room:', roomName, 'Event type:', type);

    // Find the session by room ID
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('daily_room_id', roomName)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching session:', fetchError);
      // Return 200 to prevent webhook retries
      return new Response(
        JSON.stringify({ error: 'Database error', details: fetchError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!session) {
      console.warn('No session found for room:', roomName);
      // Return 200 to prevent webhook retries
      return new Response(
        JSON.stringify({ message: 'No matching session found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found session:', session.id, 'for webhook type:', type);

    // Handle different webhook events
    let updateData: any = { updated_at: new Date().toISOString() };

    switch (type) {
      case 'recording.started':
        console.log('Recording started for session:', session.id);
        updateData.status = 'recording';
        updateData.recorded_at = new Date().toISOString();
        updateData.daily_recording_id = eventPayload.recordingId || eventPayload.recording_id;
        break;

      case 'recording.ready-to-download':
        console.log('Recording ready for session:', session.id);
        const recordingId = eventPayload.recordingId || eventPayload.recording_id || eventPayload.id;
        
        if (recordingId) {
          updateData.daily_recording_id = recordingId;
          
          // Fetch the actual access link from Daily.co API
          const dailyApiKey = Deno.env.get('DAILY_API_KEY');
          console.log('Fetching access link for recording:', recordingId);
          
          try {
            const accessLinkResponse = await fetch(
              `https://api.daily.co/v1/recordings/${recordingId}/access-link`,
              {
                headers: {
                  'Authorization': `Bearer ${dailyApiKey}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (accessLinkResponse.ok) {
              const accessLinkData = await accessLinkResponse.json();
              console.log('Access link fetched successfully:', JSON.stringify(accessLinkData, null, 2));
              
              updateData.status = 'recorded';
              updateData.daily_download_url = accessLinkData.download_link;
              updateData.raw_video_url = accessLinkData.download_link;
              updateData.duration_seconds = eventPayload.duration || eventPayload.duration_seconds;
            } else {
              const errorText = await accessLinkResponse.text();
              console.error('Failed to fetch access link:', errorText);
              updateData.status = 'processing';
            }
          } catch (fetchError) {
            console.error('Error fetching access link:', fetchError);
            updateData.status = 'processing';
          }
        } else {
          console.error('No recording ID found in webhook payload');
          updateData.status = 'processing';
        }
        
        // Auto-trigger video upload and transcription after recording is ready
        if (updateData.daily_download_url) {
          // Trigger video upload in background (don't await)
          console.log('Auto-triggering video upload for session:', session.id);
          supabase.functions.invoke('upload-recording', {
            body: { session_id: session.id }
          }).then(result => {
            if (result.error) {
              console.error('Failed to trigger video upload:', result.error);
            } else {
              console.log('Video upload started:', result.data);
            }
          });

          // Trigger transcription
          console.log('Auto-triggering transcription for session:', session.id);
          try {
            const transcriptResult = await supabase.functions.invoke('start-transcription', {
              body: { session_id: session.id }
            });
            
            if (transcriptResult.error) {
              console.error('Failed to trigger transcription:', transcriptResult.error);
            } else {
              console.log('Transcription started successfully:', transcriptResult.data);
            }
          } catch (transcriptError) {
            console.error('Error triggering transcription:', transcriptError);
          }
        }
        
        // Trigger n8n workflow
        const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
        if (n8nWebhookUrl) {
          console.log('Triggering n8n workflow for session:', session.id);
          try {
            const n8nResponse = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                session_id: session.id,
                brand_id: session.brand_id,
                title: session.title,
                download_url: updateData.daily_download_url,
                duration: updateData.duration_seconds,
              }),
            });
            
            if (n8nResponse.ok) {
              console.log('n8n workflow triggered successfully');
            } else {
              console.error('n8n webhook failed:', await n8nResponse.text());
            }
          } catch (n8nError) {
            console.error('Error triggering n8n workflow:', n8nError);
          }
        } else {
          console.warn('N8N_WEBHOOK_URL not configured, skipping workflow trigger');
        }
        break;

      case 'recording.error':
        console.error('Recording error for session:', session.id);
        updateData.status = 'failed';
        updateData.error_message = eventPayload.error || 'Recording error from Daily.co';
        break;

      default:
        console.log('Unhandled webhook type:', type);
        return new Response(
          JSON.stringify({ message: 'Webhook received but not processed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Update the session
    const { error: updateError } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', session.id);

    if (updateError) {
      console.error('Error updating session:', updateError);
      // Return 200 to prevent webhook retries
      return new Response(
        JSON.stringify({ error: 'Failed to update session', details: updateError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Session updated successfully:', session.id);

    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully', session_id: session.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in daily-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Always return 200 to prevent webhook retries
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
