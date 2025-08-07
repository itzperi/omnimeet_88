import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import AIChat from "@/components/AIChat";
import { 
  Mic, Monitor, Square, Play, StopCircle, Pause, CheckCircle, 
  Languages, Video, Star, ListChecks, Download, Upload, Settings,
  Brain, TrendingUp, AlertTriangle, Lightbulb, Clock, Users,
  Wifi, WifiOff, Recording, Loader2, Eye, EyeOff, Volume2, VolumeX
} from "lucide-react";

// Import our custom services
import { WebRTCManager, ScreenCaptureOptions, RecordingSession, TranscriptSegment } from "@/lib/webrtc";
import { AssemblyAITranscriptionService, TranscriptionConfig, TranscriptionEvent } from "@/lib/transcription";
import { LearningInsightsService, LearningMetrics, LearningInsight } from "@/lib/learning-insights";
import { getApiService, InteractionType, LearningInsight as ApiLearningInsight } from "@/lib/backend-api";

// Configuration constants
const SCREEN_MODES = [
  { value: "screen", label: "Full Screen", icon: <Monitor className="w-4 h-4" /> },
  { value: "window", label: "Window", icon: <Square className="w-4 h-4" /> },
  { value: "area", label: "Custom Area", icon: <Video className="w-4 h-4" /> },
];

const QUALITY_LEVELS = [
  { value: "low", label: "Low (720p)", bitrate: 1000000 },
  { value: "medium", label: "Medium (1080p)", bitrate: 2500000 },
  { value: "high", label: "High (1440p)", bitrate: 5000000 },
  { value: "ultra", label: "Ultra (4K)", bitrate: 8000000 },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "hi", label: "Hindi" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
];

const ASSEMBLYAI_API_KEY = "888ba8002c7a46499cf80c50a29c74fd";

const LiveLecture = () => {
  const { toast } = useToast();
  
  // Core state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [screenMode, setScreenMode] = useState<"screen" | "window" | "area">("screen");
  const [videoQuality, setVideoQuality] = useState<"low" | "medium" | "high" | "ultra">("medium");
  const [language, setLanguage] = useState("en");
  const [includeMicrophone, setIncludeMicrophone] = useState(true);
  const [includeSystemAudio, setIncludeSystemAudio] = useState(true);
  
  // Session and status state
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [sessionDuration, setSessionDuration] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Connection states
  const [webrtcConnected, setWebrtcConnected] = useState(false);
  const [transcriptionConnected, setTranscriptionConnected] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  
  // Learning insights state
  const [learningMetrics, setLearningMetrics] = useState<LearningMetrics | null>(null);
  const [realTimeInsights, setRealTimeInsights] = useState<LearningInsight[]>([]);
  const [showInsights, setShowInsights] = useState(true);
  
  // Error and notification state
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importantQuestions, setImportantQuestions] = useState<string[]>([]);
  
  // Refs for services
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const transcriptionServiceRef = useRef<AssemblyAITranscriptionService | null>(null);
  const learningInsightsRef = useRef<LearningInsightsService | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const apiService = getApiService();

  // Initialize services
  useEffect(() => {
    initializeServices();
    checkBrowserCompatibility();
    
    return () => {
      cleanup();
    };
  }, []);

  // Update session duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording && currentSession) {
      interval = setInterval(() => {
        setSessionDuration(Date.now() - currentSession.startTime.getTime());
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, currentSession]);

  const initializeServices = async () => {
    try {
      // Initialize WebRTC Manager
      webrtcManagerRef.current = new WebRTCManager();
      setWebrtcConnected(WebRTCManager.isWebRTCSupported());

      // Initialize Transcription Service
      const transcriptionConfig: TranscriptionConfig = {
        apiKey: ASSEMBLYAI_API_KEY,
        language: language,
        sampleRate: 16000,
        punctuate: true,
        formatText: true,
        dualChannel: false,
        speakerLabels: true,
        confidenceThreshold: 0.6
      };
      
      transcriptionServiceRef.current = new AssemblyAITranscriptionService(transcriptionConfig);
      
      // Set up transcription event listeners
      transcriptionServiceRef.current.addEventListener('connected', () => {
        setTranscriptionConnected(true);
        toast({ title: "Transcription Connected", description: "Real-time transcription is ready" });
      });
      
      transcriptionServiceRef.current.addEventListener('disconnected', () => {
        setTranscriptionConnected(false);
      });
      
      transcriptionServiceRef.current.addEventListener('transcript', handleTranscriptEvent);
      transcriptionServiceRef.current.addEventListener('error', handleTranscriptionError);

      // Initialize Learning Insights Service
      learningInsightsRef.current = new LearningInsightsService();
      await learningInsightsRef.current.initialize('demo-user');

      // Check backend connectivity
      try {
        await apiService.healthCheck();
        setBackendConnected(true);
      } catch (error) {
        setBackendConnected(false);
        setWarnings(prev => [...prev, "Backend services unavailable - running in offline mode"]);
      }

      toast({ title: "Services Initialized", description: "All systems ready for recording" });
    } catch (error) {
      console.error('Failed to initialize services:', error);
      setError(`Failed to initialize services: ${error}`);
    }
  };

  const checkBrowserCompatibility = () => {
    const issues: string[] = [];

    if (!WebRTCManager.isWebRTCSupported()) {
      issues.push("WebRTC not supported in this browser");
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      issues.push("Screen capture not supported");
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      issues.push("Microphone access not supported");
    }

    const supportedTypes = WebRTCManager.getSupportedMimeTypes();
    if (supportedTypes.length === 0) {
      issues.push("No supported video recording formats");
    }

    if (issues.length > 0) {
      setWarnings(prev => [...prev, ...issues]);
    }
  };

  const handleTranscriptEvent = useCallback((event: TranscriptionEvent) => {
    switch (event.data.type) {
      case 'partial':
        setCurrentTranscript(event.data.text);
        break;
        
      case 'final':
        if (event.data.segment) {
          setTranscriptSegments(prev => [...prev, event.data.segment]);
          setCurrentTranscript("");
          
          // Add to WebRTC session if active
          if (webrtcManagerRef.current && isRecording) {
            webrtcManagerRef.current.addTranscriptSegment({
              timestamp: event.data.segment.timestamp,
              text: event.data.segment.text,
              confidence: event.data.segment.confidence,
              speaker: event.data.segment.speaker,
              isImportant: false
            });
          }

          // Generate real-time insights
          if (learningInsightsRef.current) {
            learningInsightsRef.current.generateRealTimeInsights([...transcriptSegments, event.data.segment])
              .then(insights => {
                setRealTimeInsights(prev => [...prev, ...insights]);
              });
          }

          // Log interaction
          if (backendConnected) {
            apiService.logUserInteraction({
              sessionId: currentSession?.id || 'unknown',
              userId: 'demo-user',
              type: InteractionType.TRANSCRIPT_SEARCH,
              timestamp: new Date(),
              data: { text: event.data.segment.text, confidence: event.data.segment.confidence },
              context: {
                page: 'live-lecture',
                userAgent: navigator.userAgent,
                timestamp: Date.now(),
                sessionDuration: sessionDuration
              }
            });
          }
        }
        break;
    }
  }, [transcriptSegments, isRecording, currentSession, sessionDuration, backendConnected]);

  const handleTranscriptionError = useCallback((event: TranscriptionEvent) => {
    console.error('Transcription error:', event.data);
    setError(`Transcription error: ${event.data}`);
  }, []);

  const startRecording = async () => {
    if (!webrtcManagerRef.current || !transcriptionServiceRef.current) {
      setError("Services not initialized");
      return;
    }

    try {
      setError(null);
      setTranscriptSegments([]);
      setCurrentTranscript("");
      setRealTimeInsights([]);
      setImportantQuestions([]);

      // Prepare recording options
      const qualityConfig = QUALITY_LEVELS.find(q => q.value === videoQuality);
      const captureOptions: ScreenCaptureOptions = {
        captureMode: screenMode,
        includeMicrophone,
        includeSystemAudio,
        videoQuality,
        frameRate: videoQuality === 'ultra' ? 60 : 30,
        audioBitrate: 128000,
        videoBitrate: qualityConfig?.bitrate || 2500000,
        language
      };

      // Connect to transcription service
      await transcriptionServiceRef.current.connect();

      // Start WebRTC recording
      const sessionId = await webrtcManagerRef.current.startRecording(captureOptions);
      
      // Get current recording session
      const session = webrtcManagerRef.current.getRecordingStatus().session;
      setCurrentSession(session);

      // Set up video preview
      const stream = webrtcManagerRef.current.getRecordingStatus().session?.videoBlob 
        ? null 
        : await navigator.mediaDevices.getDisplayMedia({ video: true });
        
      if (stream && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      // Start transcription if microphone is included
      if (includeMicrophone) {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        await transcriptionServiceRef.current.startTranscription(micStream);
      }

      setIsRecording(true);
      setIsPaused(false);

      // Log start interaction
      if (backendConnected) {
        await apiService.logUserInteraction({
          sessionId,
          userId: 'demo-user',
          type: InteractionType.RECORDING_START,
          timestamp: new Date(),
          data: { captureMode: screenMode, videoQuality, language },
          context: {
            page: 'live-lecture',
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            sessionDuration: 0
          }
        });
      }

      toast({ 
        title: "Recording Started", 
        description: `Recording ${screenMode} in ${videoQuality} quality` 
      });

    } catch (error) {
      console.error('Failed to start recording:', error);
      setError(`Failed to start recording: ${error}`);
      toast({ 
        title: "Recording Failed", 
        description: String(error),
        variant: "destructive"
      });
    }
  };

  const pauseResumeRecording = async () => {
    if (!webrtcManagerRef.current) return;

    try {
      webrtcManagerRef.current.pauseRecording();
      setIsPaused(!isPaused);

      // Log interaction
      if (backendConnected && currentSession) {
        await apiService.logUserInteraction({
          sessionId: currentSession.id,
          userId: 'demo-user',
          type: isPaused ? InteractionType.RECORDING_RESUME : InteractionType.RECORDING_PAUSE,
          timestamp: new Date(),
          data: { duration: sessionDuration },
          context: {
            page: 'live-lecture',
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            sessionDuration
          }
        });
      }

      toast({ 
        title: isPaused ? "Recording Resumed" : "Recording Paused",
        description: `Session ${isPaused ? "resumed" : "paused"} successfully`
      });

    } catch (error) {
      console.error('Failed to pause/resume recording:', error);
      setError(`Failed to ${isPaused ? 'resume' : 'pause'} recording: ${error}`);
    }
  };

  const stopRecording = async () => {
    if (!webrtcManagerRef.current || !transcriptionServiceRef.current) return;

    try {
      // Stop recording
      const finalSession = await webrtcManagerRef.current.stopRecording();
      
      // Stop transcription
      transcriptionServiceRef.current.stopTranscription();
      transcriptionServiceRef.current.disconnect();

      // Generate final learning metrics
      if (learningInsightsRef.current && transcriptionServiceRef.current.getCurrentSession()) {
        const session = transcriptionServiceRef.current.getCurrentSession()!;
        const metrics = await learningInsightsRef.current.analyzeSession(session);
        setLearningMetrics(metrics);
      }

      setIsRecording(false);
      setIsPaused(false);

      // Upload recording if backend is available
      if (finalSession && backendConnected) {
        await uploadRecording(finalSession);
      }

      // Log stop interaction
      if (backendConnected && currentSession) {
        await apiService.logUserInteraction({
          sessionId: currentSession.id,
          userId: 'demo-user',
          type: InteractionType.RECORDING_STOP,
          timestamp: new Date(),
          data: { 
            duration: sessionDuration,
            transcriptSegments: transcriptSegments.length,
            importantQuestions: importantQuestions.length
          },
          context: {
            page: 'live-lecture',
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            sessionDuration
          }
        });
      }

      toast({ 
        title: "Recording Completed", 
        description: `Session recorded successfully (${Math.round(sessionDuration / 1000)}s)`
      });

    } catch (error) {
      console.error('Failed to stop recording:', error);
      setError(`Failed to stop recording: ${error}`);
    }
  };

  const uploadRecording = async (session: RecordingSession) => {
    if (!session.videoBlob || !backendConnected) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Request upload URL
      const uploadRequest = {
        sessionId: session.id,
        fileName: `recording_${session.id}.${session.videoBlob.type.split('/')[1]}`,
        fileSize: session.videoBlob.size,
        mimeType: session.videoBlob.type,
        duration: session.duration,
        metadata: {
          captureMode: session.captureMode,
          resolution: session.metadata.captureResolution,
          frameRate: 30,
          bitrate: session.metadata.videoBitrate,
          language: session.metadata.language,
          userAgent: session.metadata.userAgent,
          timestamp: session.startTime.toISOString()
        }
      };

      const uploadResponse = await apiService.requestUploadUrl(uploadRequest);

      // Upload the file
      await apiService.uploadRecording(
        uploadResponse.uploadUrl, 
        session.videoBlob,
        (progress) => setUploadProgress(progress)
      );

      // Save transcription session
      if (transcriptionServiceRef.current?.getCurrentSession()) {
        await apiService.saveTranscriptionSession(transcriptionServiceRef.current.getCurrentSession()!);
      }

      toast({ 
        title: "Upload Complete", 
        description: "Recording and transcription saved successfully"
      });

    } catch (error) {
      console.error('Failed to upload recording:', error);
      toast({
        title: "Upload Failed",
        description: String(error),
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const markCurrentAsImportant = () => {
    if (!currentTranscript.trim()) return;

    setImportantQuestions(prev => [...prev, currentTranscript]);
    
    // Mark in WebRTC session
    if (webrtcManagerRef.current && transcriptSegments.length > 0) {
      const lastSegment = transcriptSegments[transcriptSegments.length - 1];
      webrtcManagerRef.current.markSegmentImportant(lastSegment.id);
    }

    // Log interaction
    if (backendConnected && currentSession) {
      apiService.logUserInteraction({
        sessionId: currentSession.id,
        userId: 'demo-user',
        type: InteractionType.TRANSCRIPT_MARK_IMPORTANT,
        timestamp: new Date(),
        data: { text: currentTranscript },
        context: {
          page: 'live-lecture',
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          sessionDuration
        }
      });
    }

    toast({ 
      title: "Marked Important", 
      description: "Current statement marked as important question"
    });
  };

  const downloadRecording = () => {
    if (!webrtcManagerRef.current) return;

    const downloadUrl = webrtcManagerRef.current.getRecordingDownloadUrl();
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `lecture-recording-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast({ title: "Download Started", description: "Recording download initiated" });
    }
  };

  const exportSession = () => {
    if (!webrtcManagerRef.current) return;

    const sessionData = webrtcManagerRef.current.exportSession();
    if (sessionData) {
      const blob = new Blob([sessionData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-data-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Session Exported", description: "Session data exported successfully" });
    }
  };

  const dismissInsight = (insightId: string) => {
    setRealTimeInsights(prev => prev.filter(insight => insight.id !== insightId));
  };

  const cleanup = () => {
    webrtcManagerRef.current?.dispose();
    transcriptionServiceRef.current?.dispose();
    learningInsightsRef.current?.dispose();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  };

  // Prepare transcript for AI Chat
  const fullTranscript = transcriptSegments.map(segment => segment.text).join('\n');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-6 pt-24 pb-12">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">Live Lecture</h1>
          <p className="text-muted-foreground">
            Advanced WebRTC screen recording with real-time transcription and AI-powered learning insights
          </p>
        </div>

        {/* Connection Status Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  {webrtcConnected ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm">WebRTC</span>
                </div>
                <div className="flex items-center gap-2">
                  {transcriptionConnected ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm">Transcription</span>
                </div>
                <div className="flex items-center gap-2">
                  {backendConnected ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  <span className="text-sm">Backend</span>
                </div>
              </div>
              
              {isRecording && (
                <div className="flex items-center gap-3">
                  <Recording className="w-4 h-4 text-red-500 animate-pulse" />
                  <span className="text-sm font-medium">Recording: {formatDuration(sessionDuration)}</span>
                  {isPaused && <Badge variant="secondary">Paused</Badge>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Warning Alerts */}
        {warnings.length > 0 && (
          <div className="mb-6 space-y-2">
            {warnings.map((warning, index) => (
              <Alert key={index} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Recording Interface - Spans 3 columns */}
          <div className="xl:col-span-3 space-y-6">
            {/* Recording Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Video className="w-6 h-6 text-accent" />
                  Recording Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Video Preview */}
                <div className="mb-6">
                  <video 
                    ref={videoPreviewRef}
                    className="w-full rounded-lg border border-border bg-black"
                    autoPlay 
                    playsInline 
                    muted
                    style={{ minHeight: 300, maxHeight: 400 }}
                  >
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Click Start to begin recording
                    </div>
                  </video>
                </div>

                {/* Settings Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Select value={screenMode} onValueChange={(value: any) => setScreenMode(value)} disabled={isRecording}>
                    <SelectTrigger>
                      <SelectValue placeholder="Capture Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCREEN_MODES.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          <div className="flex items-center gap-2">
                            {mode.icon}
                            {mode.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={videoQuality} onValueChange={(value: any) => setVideoQuality(value)} disabled={isRecording}>
                    <SelectTrigger>
                      <SelectValue placeholder="Quality" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_LEVELS.map((quality) => (
                        <SelectItem key={quality.value} value={quality.value}>
                          {quality.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={language} onValueChange={setLanguage} disabled={isRecording}>
                    <SelectTrigger>
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          <div className="flex items-center gap-2">
                            <Languages className="w-4 h-4" />
                            {lang.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={includeMicrophone ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIncludeMicrophone(!includeMicrophone)}
                      disabled={isRecording}
                    >
                      {includeMicrophone ? <Mic className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant={includeSystemAudio ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIncludeSystemAudio(!includeSystemAudio)}
                      disabled={isRecording}
                    >
                      {includeSystemAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <Button 
                    onClick={startRecording} 
                    disabled={isRecording || !webrtcConnected} 
                    variant="accent" 
                    size="lg"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>

                  <Button 
                    onClick={pauseResumeRecording} 
                    disabled={!isRecording} 
                    variant="outline" 
                    size="lg"
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </>
                    )}
                  </Button>

                  <Button 
                    onClick={stopRecording} 
                    disabled={!isRecording} 
                    variant="destructive" 
                    size="lg"
                  >
                    <StopCircle className="w-4 h-4 mr-2" />
                    Stop
                  </Button>

                  <Button 
                    onClick={markCurrentAsImportant} 
                    disabled={!isRecording || !currentTranscript.trim()} 
                    variant="secondary" 
                    size="lg"
                  >
                    <Star className="w-4 h-4 mr-2 text-yellow-500" />
                    Mark Important
                  </Button>

                  <Button 
                    onClick={downloadRecording} 
                    disabled={!currentSession?.videoBlob} 
                    variant="outline" 
                    size="lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>

                  <Button 
                    onClick={exportSession} 
                    disabled={!currentSession} 
                    variant="outline" 
                    size="lg"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">Uploading recording...</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Transcript */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Mic className="w-6 h-6 text-accent" />
                  Live Transcript
                  {transcriptionConnected && (
                    <Badge variant="secondary" className="ml-auto">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full rounded-md border p-4">
                  <div className="space-y-2">
                    {transcriptSegments.map((segment, index) => (
                      <div key={segment.id} className="flex items-start gap-3 text-sm">
                        <Badge variant="outline" className="shrink-0">
                          {Math.floor(segment.timestamp / 60000)}:{String(Math.floor((segment.timestamp % 60000) / 1000)).padStart(2, '0')}
                        </Badge>
                        <div className="flex-1">
                          <div className={`${segment.isImportant ? 'font-medium text-yellow-600' : ''}`}>
                            {segment.text}
                          </div>
                          {segment.speaker && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {segment.speaker} • Confidence: {Math.round(segment.confidence * 100)}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Current/Partial Transcript */}
                    {currentTranscript && (
                      <div className="flex items-start gap-3 text-sm opacity-60">
                        <Badge variant="outline" className="shrink-0">Live</Badge>
                        <div className="flex-1 italic">{currentTranscript}</div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Important Questions Summary */}
            {importantQuestions.length > 0 && (
              <Card className="border-yellow-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    <ListChecks className="w-5 h-5" />
                    Important Questions ({importantQuestions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {importantQuestions.map((question, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Star className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar - AI Chat and Insights */}
          <div className="space-y-6">
            {/* Real-time Insights */}
            {showInsights && realTimeInsights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-accent" />
                    Live Insights
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInsights(false)}
                      className="ml-auto"
                    >
                      <EyeOff className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {realTimeInsights.slice(-3).map((insight) => (
                      <div key={insight.id} className="p-3 rounded-lg bg-accent/10 border">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{insight.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {insight.description}
                            </div>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {Math.round(insight.confidence * 100)}% confidence
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissInsight(insight.id)}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Learning Metrics */}
            {learningMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    Session Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Comprehension</div>
                        <div className="font-medium">
                          {Math.round(learningMetrics.comprehensionScore * 100)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Engagement</div>
                        <div className="font-medium">
                          {Math.round(learningMetrics.engagementLevel * 100)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Velocity</div>
                        <div className="font-medium">
                          {Math.round(learningMetrics.learningVelocity * 100)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Retention</div>
                        <div className="font-medium">
                          {Math.round(learningMetrics.retentionPrediction * 100)}%
                        </div>
                      </div>
                    </div>
                    
                    {learningMetrics.recommendations.length > 0 && (
                      <div>
                        <Separator className="my-3" />
                        <div className="text-sm font-medium mb-2">Top Recommendations</div>
                        <div className="space-y-2">
                          {learningMetrics.recommendations.slice(0, 2).map((rec) => (
                            <div key={rec.id} className="p-2 bg-accent/5 rounded text-xs">
                              <div className="font-medium">{rec.title}</div>
                              <div className="text-muted-foreground mt-1">{rec.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Chat */}
            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="chat">AI Chat</TabsTrigger>
                <TabsTrigger value="chapters">Chapters</TabsTrigger>
              </TabsList>
              <TabsContent value="chat">
                <AIChat 
                  sessionId={currentSession?.id || "live-lecture-demo"} 
                  videoTitle="Live Lecture Session" 
                  transcript={fullTranscript}
                />
              </TabsContent>
              <TabsContent value="chapters">
                <Card>
                  <CardHeader>
                    <CardTitle>Auto-Generated Chapters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      {transcriptSegments.length > 0 ? (
                        <>
                          <div className="flex items-center gap-2 p-2 bg-accent/5 rounded">
                            <Clock className="w-4 h-4" />
                            <span>Introduction (0:00)</span>
                          </div>
                          {transcriptSegments.filter(s => s.isImportant).map((segment, index) => (
                            <div key={segment.id} className="flex items-center gap-2 p-2 bg-accent/5 rounded">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span>
                                Key Point {index + 1} ({Math.floor(segment.timestamp / 60000)}:{String(Math.floor((segment.timestamp % 60000) / 1000)).padStart(2, '0')})
                              </span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="text-muted-foreground text-center py-4">
                          Start recording to see auto-generated chapters
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveLecture;
