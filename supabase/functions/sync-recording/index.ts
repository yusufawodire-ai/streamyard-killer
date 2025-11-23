import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    console.log('Syncing recording for session:', session_id);

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const dailyApiKey = Deno.env.get('DAILY_API_KEY')!;

    // Get session from database
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (fetchError || !session) {
      console.error('Session not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!session.daily_room_id) {
      return new Response(
        JSON.stringify({ error: 'No Daily.co room associated with this session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching recordings for room:', session.daily_room_id);

    // Fetch recordings from Daily.co API
    const dailyResponse = await fetch(
      `https://api.daily.co/v1/recordings?room_name=${session.daily_room_id}`,
      {
        headers: {
          'Authorization': `Bearer ${dailyApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!dailyResponse.ok) {
      const errorText = await dailyResponse.text();
      console.error('Daily.co API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recordings from Daily.co' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recordings = await dailyResponse.json();
    console.log('Recordings found:', recordings.total);

    if (recordings.total === 0 || !recordings.data || recordings.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No recordings found yet. The recording may still be processing.',
          status: 'processing'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the most recent recording
    const recording = recordings.data[0];
    console.log('Latest recording:', recording.id, 'Status:', recording.status);

    const updateData: any = {
      daily_recording_id: recording.id,
      updated_at: new Date().toISOString(),
    };

    if (recording.status === 'finished' && recording.download_link) {
      updateData.status = 'recorded';
      updateData.daily_download_url = recording.download_link;
      updateData.raw_video_url = recording.download_link;
      updateData.duration_seconds = recording.duration;
    } else if (recording.status === 'recording') {
      updateData.status = 'recording';
    } else if (recording.status === 'processing') {
      updateData.status = 'processing';
    }

    // Update session in database
    const { error: updateError } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', session_id);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Session synced successfully');

    return new Response(
      JSON.stringify({ 
        message: 'Recording synced successfully',
        recording_status: recording.status,
        download_available: !!recording.download_link
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-recording:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});