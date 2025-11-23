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
    
    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting video upload for session:', session_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch session data
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

    // Check if already uploaded
    if (session.final_video_url) {
      console.log('Video already uploaded for session:', session_id);
      return new Response(
        JSON.stringify({ message: 'Video already uploaded', url: session.final_video_url }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify download URL exists
    if (!session.daily_download_url) {
      console.error('No download URL available for session:', session_id);
      return new Response(
        JSON.stringify({ error: 'No download URL available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to uploading
    await supabase
      .from('sessions')
      .update({ status: 'uploading', updated_at: new Date().toISOString() })
      .eq('id', session_id);

    console.log('Downloading video from Daily.co:', session.daily_download_url);

    // Download video from Daily.co
    const videoResponse = await fetch(session.daily_download_url);
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.arrayBuffer();
    const videoSize = videoBlob.byteLength;
    console.log(`Video downloaded: ${(videoSize / 1024 / 1024).toFixed(2)} MB`);

    // Upload to Supabase Storage
    const fileName = `${session.brand_id}/${session_id}.mp4`;
    console.log('Uploading to storage bucket final-videos:', fileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('final-videos')
      .upload(fileName, videoBlob, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      await supabase
        .from('sessions')
        .update({ 
          status: 'recorded',
          error_message: `Upload failed: ${uploadError.message}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', session_id);
      
      throw uploadError;
    }

    console.log('Video uploaded successfully:', uploadData);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('final-videos')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;
    console.log('Public URL generated:', publicUrl);

    // Update session with final video URL
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        final_video_url: publicUrl,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session_id);

    if (updateError) {
      console.error('Failed to update session:', updateError);
      throw updateError;
    }

    console.log('Session updated with permanent video URL');

    return new Response(
      JSON.stringify({ 
        message: 'Video uploaded successfully',
        url: publicUrl,
        size_mb: (videoSize / 1024 / 1024).toFixed(2)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in upload-recording:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: 'Upload failed', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
