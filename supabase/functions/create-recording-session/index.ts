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

  try {
    const { brand_id, title, description } = await req.json();

    // Validate required fields
    if (!brand_id || !title) {
      console.error('Missing required fields:', { brand_id, title });
      return new Response(
        JSON.stringify({ error: 'brand_id and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input lengths
    if (title.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Title must be less than 200 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating Daily.co room for session:', { brand_id, title });

    // Create Daily.co room
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    if (!dailyApiKey) {
      console.error('DAILY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Daily.co API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roomResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          enable_recording: 'cloud',
          enable_screenshare: true,
          enable_chat: false,
          enable_emoji_reactions: false,
          enable_hand_raising: false,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + (4 * 60 * 60), // 4 hours
        },
      }),
    });

    if (!roomResponse.ok) {
      const errorText = await roomResponse.text();
      console.error('Daily.co API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create Daily.co room', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roomData = await roomResponse.json();
    console.log('Daily.co room created:', roomData.name);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create session record
    const { data: session, error: dbError } = await supabase
      .from('sessions')
      .insert({
        brand_id,
        title: title.trim(),
        description: description?.trim() || null,
        status: 'draft',
        daily_room_id: roomData.name,
        daily_room_url: roomData.url,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session record', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Session created successfully:', session.id);

    return new Response(
      JSON.stringify({
        session_id: session.id,
        room_url: roomData.url,
        room_name: roomData.name,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in create-recording-session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
