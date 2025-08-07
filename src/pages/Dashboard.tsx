import { useState } from "react";
import Navigation from "@/components/Navigation";
import VideoLinkProcessor from "@/components/VideoLinkProcessor";
import AIChat from "@/components/AIChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  FileText, 
  MessageSquare, 
  BookOpen, 
  Clock, 
  TrendingUp,
  Zap,
  Target
} from "lucide-react";

const Dashboard = () => {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState<string | null>(null);

  // Sample data for demonstration
  const recentVideos = [
    {
      id: "1",
      title: "Introduction to Machine Learning",
      platform: "YouTube",
      duration: "45:30",
      progress: 75,
      lastWatched: "2 hours ago"
    },
    {
      id: "2", 
      title: "Advanced React Concepts",
      platform: "Udemy",
      duration: "1:20:15",
      progress: 45,
      lastWatched: "1 day ago"
    }
  ];

  const learningStats = {
    totalHours: 24.5,
    videosCompleted: 12,
    averageScore: 87,
    streakDays: 7
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome to your <span className="text-accent">Learning Hub</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Transform any video into an interactive learning experience
          </p>
        </div>

        <Tabs defaultValue="process" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="process" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Process Video
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              My Library
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="process" className="space-y-6">
            <VideoLinkProcessor />
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {activeSessionId ? (
                  <AIChat 
                    sessionId={activeSessionId}
                    videoTitle={activeVideoTitle || undefined}
                  />
                ) : (
                  <Card className="h-[600px] flex items-center justify-center border-dashed border-2 border-border">
                    <div className="text-center">
                      <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No Active Chat Session</h3>
                      <p className="text-muted-foreground">
                        Process a video first to start chatting with your AI assistant
                      </p>
                    </div>
                  </Card>
                )}
              </div>
              
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Target className="w-4 h-4 mr-2" />
                      Generate Quiz Questions
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Create Summary
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Explain Concepts
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Learning Tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-accent/10 rounded-lg">
                        <p className="font-medium">💡 Use timestamps</p>
                        <p className="text-muted-foreground">Reference specific video moments for better context</p>
                      </div>
                      <div className="p-3 bg-accent/10 rounded-lg">
                        <p className="font-medium">🧠 Ask for examples</p>
                        <p className="text-muted-foreground">Request practical applications of concepts</p>
                      </div>
                      <div className="p-3 bg-accent/10 rounded-lg">
                        <p className="font-medium">📝 Generate notes</p>
                        <p className="text-muted-foreground">Create structured study materials</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="library" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentVideos.map((video) => (
                <Card key={video.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-2">{video.title}</CardTitle>
                      <Badge variant="outline">{video.platform}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {video.duration}
                      </div>
                      <span>{video.lastWatched}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{video.progress}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-accent h-2 rounded-full transition-all" 
                          style={{ width: `${video.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="accent" 
                        className="flex-1"
                        onClick={() => {
                          setActiveSessionId(video.id);
                          setActiveVideoTitle(video.title);
                        }}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Continue
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-2xl font-bold text-accent">{learningStats.totalHours}</p>
                    </div>
                    <Clock className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Videos Completed</p>
                      <p className="text-2xl font-bold text-accent">{learningStats.videosCompleted}</p>
                    </div>
                    <Play className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Score</p>
                      <p className="text-2xl font-bold text-accent">{learningStats.averageScore}%</p>
                    </div>
                    <Target className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Learning Streak</p>
                      <p className="text-2xl font-bold text-accent">{learningStats.streakDays} days</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Learning Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Concept Retention</span>
                    <span className="text-accent font-semibold">85%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{ width: '85%' }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Quiz Performance</span>
                    <span className="text-accent font-semibold">92%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{ width: '92%' }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Engagement Level</span>
                    <span className="text-accent font-semibold">78%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{ width: '78%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;