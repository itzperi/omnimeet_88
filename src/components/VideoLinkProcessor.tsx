import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Link, Play, FileText, MessageSquare } from "lucide-react";

interface ProcessedVideo {
  id: string;
  title: string;
  platform: string;
  transcript: string;
  chapters: number;
  sessionId: string;
}

const VideoLinkProcessor = () => {
  const [videoUrl, setVideoUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedVideo, setProcessedVideo] = useState<ProcessedVideo | null>(null);
  const { toast } = useToast();

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const detectPlatform = (url: string): string => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('coursera.org')) return 'Coursera';
    if (url.includes('udemy.com')) return 'Udemy';
    if (url.includes('vimeo.com')) return 'Vimeo';
    return 'Other Platform';
  };

  const processVideo = async () => {
    if (!videoUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a video URL to process",
        variant: "destructive",
      });
      return;
    }

    if (!validateUrl(videoUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid video URL",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-video', {
        body: { videoUrl }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setProcessedVideo(data.video);
        toast({
          title: "Video Processed Successfully!",
          description: "Your AI-powered learning assistant is ready",
        });
      } else {
        throw new Error(data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Error processing video:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process video",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) {
      processVideo();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Video URL Input */}
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-accent" />
            Paste Your Video Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://youtube.com/watch?v=... or any educational video URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={isProcessing}
            />
            <Button 
              onClick={processVideo} 
              disabled={isProcessing || !videoUrl.trim()}
              variant="accent"
              className="px-6"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Video'
              )}
            </Button>
          </div>
          
          {videoUrl && validateUrl(videoUrl) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Play className="w-4 h-4" />
              Platform: {detectPlatform(videoUrl)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Status */}
      {isProcessing && (
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
              <div>
                <h3 className="font-semibold text-accent">Processing Your Video</h3>
                <p className="text-sm text-muted-foreground">
                  Generating transcript, analyzing content, and setting up AI assistant...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processed Video Results */}
      {processedVideo && (
        <Card className="border-accent/50 bg-accent/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-accent">✨ Video Ready for AI Learning!</CardTitle>
              <Badge variant="outline" className="border-accent text-accent">
                {processedVideo.platform}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">{processedVideo.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {processedVideo.transcript}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                <FileText className="w-5 h-5 text-accent" />
                <div>
                  <p className="font-medium">Transcript</p>
                  <p className="text-sm text-muted-foreground">Full text generated</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                <Play className="w-5 h-5 text-accent" />
                <div>
                  <p className="font-medium">Chapters</p>
                  <p className="text-sm text-muted-foreground">{processedVideo.chapters} sections</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                <MessageSquare className="w-5 h-5 text-accent" />
                <div>
                  <p className="font-medium">AI Assistant</p>
                  <p className="text-sm text-muted-foreground">Ready to help</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="accent" className="flex-1">
                Start Learning Session
              </Button>
              <Button variant="outline">
                View Transcript
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supported Platforms */}
      <Card className="border-border/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground mb-3">Supported platforms:</p>
          <div className="flex flex-wrap gap-2">
            {['YouTube', 'Coursera', 'Udemy', 'Vimeo', 'Other Educational Platforms'].map((platform) => (
              <Badge key={platform} variant="secondary" className="text-xs">
                {platform}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoLinkProcessor;