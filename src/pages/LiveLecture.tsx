import { useState, useRef, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import AIChat from "@/components/AIChat";
import { Mic, Monitor, Square, Globe, Play, StopCircle, Pause, CheckCircle, Languages, Video, Star, ListChecks } from "lucide-react";

const SCREEN_MODES = [
  { value: "screen", label: "Full Screen", icon: <Monitor className="w-4 h-4 mr-2" /> },
  { value: "window", label: "Window", icon: <Square className="w-4 h-4 mr-2" /> },
  { value: "area", label: "Custom Area", icon: <Video className="w-4 h-4 mr-2" /> },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "hi", label: "Hindi" },
  { value: "zh", label: "Chinese" },
  // Add more as needed
];

const ASSEMBLYAI_API_KEY = "888ba8002c7a46499cf80c50a29c74fd";
const ASSEMBLYAI_WS_URL = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${ASSEMBLYAI_API_KEY}`;

const LiveLecture = () => {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [screenMode, setScreenMode] = useState("screen");
  const [language, setLanguage] = useState("en");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [importantQuestions, setImportantQuestions] = useState<string[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Connect AssemblyAI WebSocket
  useEffect(() => {
    if (!recording) return;
    const ws = new window.WebSocket(ASSEMBLYAI_WS_URL);
    wsRef.current = ws;
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = (e) => setError("WebSocket error: " + e.type);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.text) {
          setCurrentTranscript(data.text);
          setTranscript((prev) => {
            if (prev.length === 0 || prev[prev.length - 1] !== data.text) {
              return [...prev, data.text];
            }
            return prev;
          });
        }
      } catch (err) {
        // Ignore non-JSON
      }
    };
    return () => {
      ws.close();
      setWsConnected(false);
    };
  }, [recording]);

  // Start recording
  const handleStart = async () => {
    setError(null);
    setTranscript([]);
    setCurrentTranscript("");
    setProgress(0);
    setShowSummary(false);
    try {
      let stream: MediaStream;
      if (screenMode === "screen" || screenMode === "window") {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } else {
        setError("Custom area selection is not yet implemented.");
        return;
      }
      // Get mic audio
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Combine screen and mic audio
      const combinedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...micStream.getAudioTracks(),
      ]);
      // Show the shared screen in the video element
      if (videoRef.current) {
        videoRef.current.srcObject = combinedStream;
        videoRef.current.play();
      }
      // Setup audio context for real-time streaming
      const audioContext = new window.AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const sourceNode = audioContext.createMediaStreamSource(combinedStream);
      sourceNodeRef.current = sourceNode;
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      sourceNode.connect(processor);
      processor.connect(audioContext.destination);
      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== 1) return;
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32Array to Int16Array for AssemblyAI
        const int16Buffer = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Buffer[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32767));
        }
        wsRef.current.send(int16Buffer.buffer);
      };
      setRecording(true);
      setPaused(false);
      setError(null);
    } catch (err: any) {
      setError("Failed to start recording: " + (err.message || err));
      setRecording(false);
    }
  };

  // Pause/Resume
  const handlePause = () => {
    setPaused((p) => !p);
    if (mediaRecorderRef.current) {
      if (!paused) mediaRecorderRef.current.pause();
      else mediaRecorderRef.current.resume();
    }
  };

  // Stop recording
  const handleStop = () => {
    setRecording(false);
    setPaused(false);
    setProgress(100);
    // Cleanup audio context and processor
    processorRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    audioContextRef.current?.close();
    wsRef.current?.close();
    setTranscript((t) => [...t, "[Recording stopped. Transcript finalized.]"]);
    setShowSummary(true);
  };

  // Progress simulation (for demo)
  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => {
      setProgress((p) => (p < 99 ? p + 1 : p));
    }, 1000);
    return () => clearInterval(interval);
  }, [recording]);

  // Record important question
  const handleRecordImportant = () => {
    if (currentTranscript) {
      setImportantQuestions((prev) => [...prev, currentTranscript]);
    }
  };

  // Feed transcript to AIChat as a single string
  const fullTranscript = transcript.join("\n");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-6 pt-24 pb-12">
        <h1 className="text-4xl font-bold mb-6">Live Lecture</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Controls & Transcript */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Mic className="w-6 h-6 text-accent" />
                  Screen Recording & Live Transcription
                  {wsConnected && (
                    <span className="ml-4 text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Connected</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Video Preview */}
                <div className="mb-4">
                  <video ref={videoRef} className="w-full rounded-lg border border-border bg-black" autoPlay playsInline muted style={{ minHeight: 200, maxHeight: 320 }} />
                </div>
                <div className="flex flex-wrap gap-4 items-center mb-4">
                  {/* Screen Mode Selector */}
                  <Select value={screenMode} onValueChange={setScreenMode}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Select Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCREEN_MODES.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          <span className="flex items-center">{mode.icon}{mode.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Language Selector */}
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Recording Controls */}
                  <Button onClick={handleStart} disabled={recording} variant="accent" size="lg">
                    <Play className="w-4 h-4 mr-2" /> Start
                  </Button>
                  <Button onClick={handlePause} disabled={!recording} variant="outline" size="lg">
                    <Pause className="w-4 h-4 mr-2" /> {paused ? "Resume" : "Pause"}
                  </Button>
                  <Button onClick={handleStop} disabled={!recording} variant="destructive" size="lg">
                    <StopCircle className="w-4 h-4 mr-2" /> Stop
                  </Button>
                  <Button onClick={handleRecordImportant} disabled={!recording || !currentTranscript} variant="secondary" size="lg">
                    <Star className="w-4 h-4 mr-2 text-yellow-500" /> Record Important Question
                  </Button>
                </div>
                {/* Progress Bar */}
                <div className="mb-4">
                  <Progress value={recording ? (progress < 100 ? progress + 1 : 100) : progress} />
                </div>
                {/* Transcript Area */}
                <div className="bg-muted rounded-lg p-4 min-h-[120px] max-h-64 overflow-y-auto text-sm font-mono">
                  {transcript.map((line, i) => (
                    <div key={i} className="mb-1">{line}</div>
                  ))}
                </div>
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {/* Show summary of important questions at end */}
                {showSummary && importantQuestions.length > 0 && (
                  <Card className="mt-6 border-accent">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-accent"><ListChecks className="w-5 h-5" /> Important Questions Collected</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc pl-6 space-y-2 text-sm">
                        {importantQuestions.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
          {/* AI Chat/Assistance Panel */}
          <div className="space-y-6">
            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="chat">AI Chat</TabsTrigger>
                <TabsTrigger value="chapters">Chapters</TabsTrigger>
              </TabsList>
              <TabsContent value="chat">
                <AIChat sessionId="live-lecture-demo" videoTitle="Live Lecture" transcript={fullTranscript} />
              </TabsContent>
              <TabsContent value="chapters">
                <Card>
                  <CardHeader>
                    <CardTitle>Chapters (Auto-segmentation)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-6 space-y-2 text-sm">
                      <li>Introduction</li>
                      <li>Key Concepts</li>
                      <li>Examples & Applications</li>
                      <li>Summary & Q&A</li>
                    </ul>
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
