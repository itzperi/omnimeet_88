import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Bot, User, Clock, FileText, Brain, HelpCircle } from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp_reference?: number;
  created_at: string;
}

interface AIChatProps {
  sessionId: string;
  videoTitle?: string;
  onTimestampClick?: (timestamp: number) => void;
}

const AIChat = ({ sessionId, videoTitle, onTimestampClick }: AIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (sessionId) {
      loadChatHistory();
    }
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }

      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      id: `temp-${Date.now()}`,
      role: 'user' as const,
      content: newMessage,
      timestamp_reference: currentTimestamp,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          sessionId,
          message: newMessage,
          timestamp: currentTimestamp
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        const aiMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant' as const,
          content: data.response,
          timestamp_reference: currentTimestamp,
          created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Message Failed",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const suggestedQuestions = [
    "Explain the main concepts from this video",
    "Generate quiz questions for exam prep",
    "Summarize the key takeaways",
    "What are the practical applications?",
  ];

  return (
    <Card className="h-[600px] flex flex-col border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-accent" />
          AI Learning Assistant
          {videoTitle && (
            <Badge variant="outline" className="ml-2 text-xs">
              {videoTitle}
            </Badge>
          )}
        </CardTitle>
        
        {/* Timestamp Selector */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <Input
            type="number"
            placeholder="Video timestamp (seconds)"
            value={currentTimestamp || ""}
            onChange={(e) => setCurrentTimestamp(e.target.value ? parseInt(e.target.value) : null)}
            className="w-40 h-8"
          />
          {currentTimestamp && (
            <Badge variant="secondary" className="text-xs">
              {formatTimestamp(currentTimestamp)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-accent mx-auto mb-4" />
                <h3 className="font-semibold mb-2">AI Assistant Ready!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ask me anything about the video content. I can help with explanations, 
                  generate quiz questions, or provide summaries.
                </p>
                
                {/* Suggested Questions */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Try asking:</p>
                  <div className="grid grid-cols-1 gap-1">
                    {suggestedQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="text-xs h-auto py-2 px-3 text-left justify-start"
                        onClick={() => setNewMessage(question)}
                      >
                        <HelpCircle className="w-3 h-3 mr-2" />
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-accent" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {message.timestamp_reference && (
                    <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                      <Clock className="w-3 h-3" />
                      <button
                        onClick={() => onTimestampClick?.(message.timestamp_reference!)}
                        className="hover:underline"
                      >
                        {formatTimestamp(message.timestamp_reference)}
                      </button>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-accent" />
                </div>
                <div className="bg-secondary rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about the video content..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isLoading}
              variant="accent"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIChat;