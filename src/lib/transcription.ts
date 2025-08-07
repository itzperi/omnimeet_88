import { TranscriptSegment } from './webrtc';

export interface TranscriptionConfig {
  apiKey: string;
  language?: string;
  sampleRate: number;
  punctuate: boolean;
  formatText: boolean;
  dualChannel: boolean;
  wordBoost?: string[];
  speakerLabels: boolean;
  confidenceThreshold: number;
}

export interface TranscriptionEvent {
  type: 'transcript' | 'error' | 'connected' | 'disconnected' | 'session_begins' | 'session_terminated';
  data?: any;
  timestamp: number;
}

export interface RealtimeTranscript {
  message_type: string;
  audio_start: number;
  audio_end: number;
  confidence: number;
  text: string;
  words?: Word[];
  created?: string;
  session_id?: string;
}

export interface Word {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
}

export interface TranscriptionSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  language: string;
  segments: TranscriptSegment[];
  summary?: string;
  keyPoints?: string[];
  speakers?: SpeakerInfo[];
}

export interface SpeakerInfo {
  speaker: string;
  segments: number[];
  confidence: number;
}

export class AssemblyAITranscriptionService {
  private config: TranscriptionConfig;
  private websocket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isConnected = false;
  private currentSession: TranscriptionSession | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(config: TranscriptionConfig) {
    this.config = {
      sampleRate: 16000,
      punctuate: true,
      formatText: true,
      dualChannel: false,
      speakerLabels: true,
      confidenceThreshold: 0.5,
      ...config
    };
  }

  // Add event listener
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  // Remove event listener
  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Emit event
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const eventData: TranscriptionEvent = {
        type: event as any,
        data,
        timestamp: Date.now()
      };
      listeners.forEach(callback => callback(eventData));
    }
  }

  // Build WebSocket URL with parameters
  private buildWebSocketUrl(): string {
    const params = new URLSearchParams({
      sample_rate: this.config.sampleRate.toString(),
      token: this.config.apiKey,
      punctuate: this.config.punctuate.toString(),
      format_text: this.config.formatText.toString(),
      dual_channel: this.config.dualChannel.toString(),
      speaker_labels: this.config.speakerLabels.toString()
    });

    if (this.config.language) {
      params.append('language_code', this.config.language);
    }

    if (this.config.wordBoost && this.config.wordBoost.length > 0) {
      params.append('word_boost', JSON.stringify(this.config.wordBoost));
    }

    return `wss://api.assemblyai.com/v2/realtime/ws?${params.toString()}`;
  }

  // Connect to AssemblyAI WebSocket
  async connect(): Promise<void> {
    if (this.isConnected) {
      throw new Error('Already connected to transcription service');
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.buildWebSocketUrl();
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
          console.log('Connected to AssemblyAI');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };

        this.websocket.onclose = (event) => {
          console.log('AssemblyAI WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          // Attempt reconnection if not intentionally closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.websocket.onerror = (error) => {
          console.error('AssemblyAI WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Handle WebSocket messages
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as RealtimeTranscript;
      
      switch (data.message_type) {
        case 'SessionBegins':
          this.currentSession = {
            id: data.session_id || this.generateSessionId(),
            startTime: new Date(),
            language: this.config.language || 'en',
            segments: []
          };
          this.emit('session_begins', data);
          break;

        case 'PartialTranscript':
          this.emit('transcript', {
            type: 'partial',
            text: data.text,
            confidence: data.confidence,
            timestamp: Date.now()
          });
          break;

        case 'FinalTranscript':
          if (data.confidence >= this.config.confidenceThreshold) {
            const segment = this.createTranscriptSegment(data);
            if (this.currentSession) {
              this.currentSession.segments.push(segment);
            }
            
            this.emit('transcript', {
              type: 'final',
              text: data.text,
              confidence: data.confidence,
              segment: segment,
              timestamp: Date.now()
            });
          }
          break;

        case 'SessionTerminated':
          if (this.currentSession) {
            this.currentSession.endTime = new Date();
          }
          this.emit('session_terminated', data);
          break;

        default:
          console.log('Unknown message type:', data.message_type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.emit('error', error);
    }
  }

  // Create transcript segment from AssemblyAI data
  private createTranscriptSegment(data: RealtimeTranscript): TranscriptSegment {
    return {
      id: this.generateSegmentId(),
      timestamp: data.audio_start || Date.now(),
      text: data.text,
      confidence: data.confidence,
      speaker: this.extractSpeaker(data),
      isImportant: false
    };
  }

  // Extract speaker information
  private extractSpeaker(data: RealtimeTranscript): string | undefined {
    if (data.words && data.words.length > 0 && data.words[0].speaker) {
      return `Speaker ${data.words[0].speaker}`;
    }
    return undefined;
  }

  // Attempt to reconnect
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, delay);
  }

  // Start transcription from audio stream
  async startTranscription(audioStream: MediaStream): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to transcription service');
    }

    try {
      // Create audio context with the specified sample rate
      this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
      this.source = this.audioContext.createMediaStreamSource(audioStream);
      
      // Create script processor for audio processing
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (event) => {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = event.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array for AssemblyAI
        const int16Array = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        // Send audio data to AssemblyAI
        if (this.websocket.readyState === WebSocket.OPEN) {
          this.websocket.send(int16Array.buffer);
        }
      };

      // Connect the audio processing chain
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      console.log('Transcription started');
    } catch (error) {
      console.error('Error starting transcription:', error);
      throw error;
    }
  }

  // Stop transcription
  stopTranscription(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('Transcription stopped');
  }

  // Disconnect from service
  disconnect(): void {
    this.stopTranscription();
    
    if (this.websocket) {
      this.websocket.close(1000, 'Intentional disconnect');
      this.websocket = null;
    }
    
    this.isConnected = false;
  }

  // Get current session
  getCurrentSession(): TranscriptionSession | null {
    return this.currentSession;
  }

  // Generate session summary using AI
  async generateSessionSummary(): Promise<string> {
    if (!this.currentSession || this.currentSession.segments.length === 0) {
      throw new Error('No session data available for summary');
    }

    const fullText = this.currentSession.segments.map(s => s.text).join(' ');
    
    // This would integrate with an AI service like OpenAI GPT
    // For now, return a basic summary
    const wordCount = fullText.split(' ').length;
    const duration = this.currentSession.endTime 
      ? this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime()
      : Date.now() - this.currentSession.startTime.getTime();
    
    return `Session Summary:\n- Duration: ${Math.round(duration / 1000)} seconds\n- Words spoken: ${wordCount}\n- Language: ${this.currentSession.language}\n- Segments: ${this.currentSession.segments.length}`;
  }

  // Extract key points from session
  async extractKeyPoints(): Promise<string[]> {
    if (!this.currentSession || this.currentSession.segments.length === 0) {
      return [];
    }

    // Find segments marked as important
    const importantSegments = this.currentSession.segments
      .filter(s => s.isImportant)
      .map(s => s.text);

    // If no important segments, use high-confidence segments
    if (importantSegments.length === 0) {
      const highConfidenceSegments = this.currentSession.segments
        .filter(s => s.confidence > 0.8)
        .slice(0, 5) // Take top 5
        .map(s => s.text);
      
      return highConfidenceSegments;
    }

    return importantSegments;
  }

  // Get speaker analytics
  getSpeakerAnalytics(): SpeakerInfo[] {
    if (!this.currentSession) {
      return [];
    }

    const speakerMap = new Map<string, { segments: number[], totalConfidence: number, count: number }>();

    this.currentSession.segments.forEach((segment, index) => {
      if (segment.speaker) {
        if (!speakerMap.has(segment.speaker)) {
          speakerMap.set(segment.speaker, { segments: [], totalConfidence: 0, count: 0 });
        }
        
        const speakerData = speakerMap.get(segment.speaker)!;
        speakerData.segments.push(index);
        speakerData.totalConfidence += segment.confidence;
        speakerData.count++;
      }
    });

    return Array.from(speakerMap.entries()).map(([speaker, data]) => ({
      speaker,
      segments: data.segments,
      confidence: data.totalConfidence / data.count
    }));
  }

  // Export session data
  exportSession(): string {
    if (!this.currentSession) {
      throw new Error('No session to export');
    }

    return JSON.stringify({
      ...this.currentSession,
      summary: this.currentSession.summary,
      keyPoints: this.currentSession.keyPoints,
      speakers: this.getSpeakerAnalytics()
    }, null, 2);
  }

  // Mark segment as important
  markSegmentImportant(segmentId: string): boolean {
    if (!this.currentSession) {
      return false;
    }

    const segment = this.currentSession.segments.find(s => s.id === segmentId);
    if (segment) {
      segment.isImportant = true;
      return true;
    }
    
    return false;
  }

  // Search transcripts
  searchTranscripts(query: string): TranscriptSegment[] {
    if (!this.currentSession) {
      return [];
    }

    const lowercaseQuery = query.toLowerCase();
    return this.currentSession.segments.filter(segment =>
      segment.text.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Get connection status
  getConnectionStatus(): {
    isConnected: boolean;
    reconnectAttempts: number;
    currentSession: TranscriptionSession | null;
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      currentSession: this.currentSession
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<TranscriptionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Generate unique IDs
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSegmentId(): string {
    return `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup resources
  dispose(): void {
    this.disconnect();
    this.eventListeners.clear();
    this.currentSession = null;
  }
}