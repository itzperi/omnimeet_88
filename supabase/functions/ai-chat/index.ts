import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

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
    const { sessionId, message, timestamp } = await req.json();
    console.log('AI Chat request:', { sessionId, message, timestamp });

    if (!sessionId || !message) {
      throw new Error('Session ID and message are required');
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

    // Get chat session and verify ownership
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*, videos(*)')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      throw new Error('Chat session not found or unauthorized');
    }

    // Store user message
    const { error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message,
        timestamp_reference: timestamp
      });

    if (userMessageError) {
      console.error('Error storing user message:', userMessageError);
      throw new Error('Failed to store user message');
    }

    // Get context from video transcript
    const transcript = session.videos?.transcript || '';
    const contextualInfo = timestamp ? 
      `At timestamp ${timestamp}s in the video: ` : 
      'Based on the video content: ';

    // Prepare AI prompt with context
    const systemPrompt = `You are an AI learning assistant for OmniMeet. You help students understand educational content from videos. 

Video Context:
Title: ${session.videos?.title || 'Educational Video'}
Platform: ${session.videos?.platform || 'Unknown'}
Transcript: ${transcript.substring(0, 2000)}...

Guidelines:
- Provide accurate, helpful explanations based on the video content
- If asked about specific timestamps, refer to the relevant section
- Generate exam-style questions when requested
- Explain concepts at an appropriate academic level
- Stay focused on the educational content`;

    // Generate AI response (simulated for now)
    const aiResponse = await generateAIResponse(systemPrompt, contextualInfo + message);

    // Store AI response
    const { error: aiMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse,
        timestamp_reference: timestamp
      });

    if (aiMessageError) {
      console.error('Error storing AI message:', aiMessageError);
      throw new Error('Failed to store AI response');
    }

    console.log('AI chat response generated successfully');

    return new Response(JSON.stringify({
      success: true,
      response: aiResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateAIResponse(systemPrompt: string, userMessage: string): Promise<string> {
  // This would integrate with OpenAI or another AI service
  // For now, generating contextual responses based on keywords
  
  const message = userMessage.toLowerCase();
  
  if (message.includes('explain') || message.includes('what is')) {
    return `Based on the video content, I can help explain this concept. The video discusses several key points that are relevant to your question. Let me break this down for you in a clear, educational manner.

Key points from the video:
1. The main concept relates to the core learning objectives
2. There are practical applications demonstrated
3. Important examples are provided for better understanding

Would you like me to elaborate on any specific aspect or generate some practice questions to test your understanding?`;
  }
  
  if (message.includes('question') || message.includes('quiz') || message.includes('exam')) {
    return `Here are some exam-style questions based on the video content:

**Multiple Choice:**
1. What is the main concept discussed in this section?
   a) Option A
   b) Option B (Correct)
   c) Option C
   d) Option D

**Short Answer:**
2. Explain the key principle demonstrated in the video and provide an example.

**Essay Question:**
3. Analyze the implications of the concepts presented and discuss their real-world applications.

Would you like me to provide answers or create more questions on specific topics?`;
  }
  
  if (message.includes('summary') || message.includes('summarize')) {
    return `Here's a comprehensive summary of the video content:

**Main Topics Covered:**
- Introduction to key concepts
- Detailed explanations with examples
- Practical applications and use cases
- Important takeaways for students

**Key Learning Objectives:**
- Understanding fundamental principles
- Ability to apply concepts in real scenarios
- Critical thinking about the subject matter

**Important Notes:**
- Pay attention to the examples provided
- Practice with the exercises mentioned
- Review the concluding remarks for exam preparation

This summary covers the essential points you need to know for your studies.`;
  }
  
  return `I understand your question about the video content. Based on the educational material presented, I can provide you with a detailed explanation that will help enhance your learning experience.

The video covers important concepts that are fundamental to understanding this subject. Let me provide you with:

1. **Contextual Explanation**: The specific topic you're asking about relates to the core principles discussed in the video.

2. **Practical Application**: Here's how this concept applies in real-world scenarios.

3. **Study Tips**: For better retention, I recommend reviewing this section again and taking notes on the key points.

4. **Next Steps**: Consider exploring related topics or practicing with additional examples.

Is there a specific aspect you'd like me to elaborate on, or would you like me to generate some practice questions to test your understanding?`;
}