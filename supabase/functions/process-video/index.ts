import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoInfo {
  title: string;
  description?: string;
  duration?: number;
  platform: string;
}

const extractVideoInfo = (url: string): VideoInfo => {
  let platform = 'other';
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    platform = 'youtube';
  } else if (url.includes('coursera.org')) {
    platform = 'coursera';
  } else if (url.includes('udemy.com')) {
    platform = 'udemy';
  } else if (url.includes('vimeo.com')) {
    platform = 'vimeo';
  }

  return {
    title: `Video from ${platform}`,
    description: `AI-enhanced learning content from ${url}`,
    platform,
  };
};

const generateTranscript = async (videoUrl: string): Promise<string> => {
  // This would integrate with a transcription service
  // For now, returning a sample transcript
  console.log('Generating transcript for:', videoUrl);
  
  return `Sample transcript for video: ${videoUrl}. This would contain the actual transcribed content from the video, including timestamps and speaker identification.`;
};

const createChapters = (transcript: string) => {
  // AI-powered chapter generation would go here
  return [
    {
      title: "Introduction",
      startTime: 0,
      endTime: 300,
      summary: "Overview of the main topics covered"
    },
    {
      title: "Main Content",
      startTime: 300,
      endTime: 1800,
      summary: "Core learning material and examples"
    },
    {
      title: "Conclusion",
      startTime: 1800,
      endTime: 2100,
      summary: "Key takeaways and next steps"
    }
  ];
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl } = await req.json();
    console.log('Processing video URL:', videoUrl);

    if (!videoUrl) {
      throw new Error('Video URL is required');
    }

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      throw new Error('Invalid authentication');
    }

    // Extract video information
    const videoInfo = extractVideoInfo(videoUrl);
    console.log('Extracted video info:', videoInfo);

    // Create video record
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        video_url: videoUrl,
        title: videoInfo.title,
        description: videoInfo.description,
        platform: videoInfo.platform,
        status: 'processing'
      })
      .select()
      .single();

    if (videoError) {
      console.error('Error creating video record:', videoError);
      throw new Error('Failed to create video record');
    }

    console.log('Created video record:', video.id);

    // Generate transcript (this would be done asynchronously in production)
    const transcript = await generateTranscript(videoUrl);
    
    // Generate chapters
    const chapters = createChapters(transcript);

    // Update video with transcript and chapters
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        transcript,
        chapters,
        status: 'completed',
        duration: 2100 // Sample duration in seconds
      })
      .eq('id', video.id);

    if (updateError) {
      console.error('Error updating video:', updateError);
      throw new Error('Failed to update video');
    }

    // Create initial chat session
    const { data: chatSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        video_id: video.id,
        session_type: 'video',
        title: `Chat for ${videoInfo.title}`
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating chat session:', sessionError);
      throw new Error('Failed to create chat session');
    }

    // Create initial learning progress
    const { error: progressError } = await supabase
      .from('learning_progress')
      .insert({
        user_id: user.id,
        video_id: video.id,
        watch_time: 0,
        completion_percentage: 0.00,
        key_concepts: [],
        notes: ''
      });

    if (progressError) {
      console.error('Error creating learning progress:', progressError);
      // Don't throw error for progress creation failure
    }

    console.log('Video processing completed successfully');

    return new Response(JSON.stringify({
      success: true,
      video: {
        id: video.id,
        title: videoInfo.title,
        platform: videoInfo.platform,
        transcript: transcript.substring(0, 200) + '...', // Preview
        chapters: chapters.length,
        sessionId: chatSession.id
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-video function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});