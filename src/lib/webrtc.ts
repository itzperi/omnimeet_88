export interface ScreenCaptureOptions {
  captureMode: 'screen' | 'window' | 'area';
  includeMicrophone: boolean;
  includeSystemAudio: boolean;
  videoQuality: 'low' | 'medium' | 'high' | 'ultra';
  frameRate: number;
  audioBitrate: number;
  videoBitrate: number;
}

export interface RecordingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  captureMode: string;
  transcriptSegments: TranscriptSegment[];
  videoBlob?: Blob;
  audioBlob?: Blob;
  metadata: RecordingMetadata;
}

export interface TranscriptSegment {
  id: string;
  timestamp: number;
  text: string;
  confidence: number;
  speaker?: string;
  isImportant: boolean;
}

export interface RecordingMetadata {
  userAgent: string;
  screenResolution: string;
  captureResolution: string;
  audioBitrate: number;
  videoBitrate: number;
  language: string;
}

export class WebRTCManager {
  private mediaRecorder: MediaRecorder | null = null;
  private displayStream: MediaStream | null = null;
  private audioStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private isPaused = false;
  private currentSession: RecordingSession | null = null;

  // Browser compatibility checks
  static isWebRTCSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getDisplayMedia &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
  }

  static getSupportedMimeTypes(): string[] {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4'
    ];
    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }

  static getOptimalMimeType(): string {
    const supported = WebRTCManager.getSupportedMimeTypes();
    return supported[0] || 'video/webm';
  }

  // Get available capture sources
  async getAvailableDisplaySources(): Promise<any[]> {
    try {
      // For Chrome/Edge - use getDisplayMedia with advanced constraints
      const constraints = {
        video: {
          displaySurface: 'monitor',
          logicalSurface: true,
          cursor: 'always'
        },
        audio: false
      };
      
      // This will trigger the native browser picker
      return [{ type: 'native-picker', constraints }];
    } catch (error) {
      console.error('Error getting display sources:', error);
      return [];
    }
  }

  // Enhanced screen capture with multiple modes
  async startScreenCapture(options: ScreenCaptureOptions): Promise<MediaStream> {
    try {
      let displayConstraints: any = {
        video: {
          cursor: 'always',
          displaySurface: options.captureMode === 'screen' ? 'monitor' : 'window'
        }
      };

      // Set video quality constraints
      switch (options.videoQuality) {
        case 'low':
          displayConstraints.video.width = { ideal: 1280 };
          displayConstraints.video.height = { ideal: 720 };
          displayConstraints.video.frameRate = { ideal: 15 };
          break;
        case 'medium':
          displayConstraints.video.width = { ideal: 1920 };
          displayConstraints.video.height = { ideal: 1080 };
          displayConstraints.video.frameRate = { ideal: 30 };
          break;
        case 'high':
          displayConstraints.video.width = { ideal: 2560 };
          displayConstraints.video.height = { ideal: 1440 };
          displayConstraints.video.frameRate = { ideal: 30 };
          break;
        case 'ultra':
          displayConstraints.video.width = { ideal: 3840 };
          displayConstraints.video.height = { ideal: 2160 };
          displayConstraints.video.frameRate = { ideal: 60 };
          break;
      }

      // Custom area selection (requires additional UI implementation)
      if (options.captureMode === 'area') {
        // For now, fall back to screen capture
        // In a real implementation, you'd show a selection overlay
        displayConstraints.video.displaySurface = 'monitor';
      }

      // Include system audio if supported and requested
      if (options.includeSystemAudio) {
        displayConstraints.audio = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        };
      }

      this.displayStream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);
      
      // Handle stream end (user stops sharing)
      this.displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopRecording();
      });

      return this.displayStream;
    } catch (error) {
      throw new Error(`Failed to capture screen: ${error}`);
    }
  }

  // Enhanced microphone capture
  async startMicrophoneCapture(): Promise<MediaStream> {
    try {
      const audioConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2
        }
      };

      this.audioStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      return this.audioStream;
    } catch (error) {
      throw new Error(`Failed to capture microphone: ${error}`);
    }
  }

  // Combine audio and video streams
  createCombinedStream(videoStream: MediaStream, audioStream?: MediaStream): MediaStream {
    const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
    
    if (audioStream) {
      tracks.push(...audioStream.getAudioTracks());
    }
    
    // Add system audio if available in display stream
    if (videoStream.getAudioTracks().length > 0) {
      tracks.push(...videoStream.getAudioTracks());
    }

    this.combinedStream = new MediaStream(tracks);
    return this.combinedStream;
  }

  // Start recording with enhanced options
  async startRecording(options: ScreenCaptureOptions): Promise<string> {
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    try {
      // Start screen capture
      const displayStream = await this.startScreenCapture(options);
      
      // Start microphone if requested
      let micStream: MediaStream | undefined;
      if (options.includeMicrophone) {
        micStream = await this.startMicrophoneCapture();
      }

      // Combine streams
      const combinedStream = this.createCombinedStream(displayStream, micStream);

      // Configure MediaRecorder with optimal settings
      const mimeType = WebRTCManager.getOptimalMimeType();
      const recorderOptions: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: options.videoBitrate || 2500000, // 2.5 Mbps default
        audioBitsPerSecond: options.audioBitrate || 128000   // 128 kbps default
      };

      this.mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
      this.recordedChunks = [];

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.handleRecordingError(event);
      };

      // Create recording session
      const sessionId = this.generateSessionId();
      this.currentSession = {
        id: sessionId,
        startTime: new Date(),
        duration: 0,
        captureMode: options.captureMode,
        transcriptSegments: [],
        metadata: this.createMetadata(options, combinedStream)
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      this.isPaused = false;

      return sessionId;
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  // Pause/Resume recording
  pauseRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('No active recording to pause');
    }

    if (this.isPaused) {
      this.mediaRecorder.resume();
      this.isPaused = false;
    } else {
      this.mediaRecorder.pause();
      this.isPaused = true;
    }
  }

  // Stop recording
  async stopRecording(): Promise<RecordingSession | null> {
    if (!this.isRecording || !this.mediaRecorder) {
      return null;
    }

    return new Promise((resolve) => {
      if (this.mediaRecorder) {
        this.mediaRecorder.addEventListener('stop', () => {
          resolve(this.currentSession);
        }, { once: true });
        
        this.mediaRecorder.stop();
      }
    });
  }

  // Handle recording stop
  private handleRecordingStop(): void {
    if (this.currentSession && this.recordedChunks.length > 0) {
      // Create final video blob
      const mimeType = WebRTCManager.getOptimalMimeType();
      this.currentSession.videoBlob = new Blob(this.recordedChunks, { type: mimeType });
      this.currentSession.endTime = new Date();
      this.currentSession.duration = this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();
    }

    this.cleanup();
  }

  // Handle recording errors
  private handleRecordingError(event: any): void {
    console.error('Recording error:', event);
    this.cleanup();
    // Could emit error event here for UI handling
  }

  // Get current recording status
  getRecordingStatus(): {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    session: RecordingSession | null;
  } {
    const duration = this.currentSession 
      ? Date.now() - this.currentSession.startTime.getTime()
      : 0;

    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      duration,
      session: this.currentSession
    };
  }

  // Add transcript segment
  addTranscriptSegment(segment: Omit<TranscriptSegment, 'id'>): void {
    if (this.currentSession) {
      const transcriptSegment: TranscriptSegment = {
        id: this.generateSegmentId(),
        ...segment
      };
      this.currentSession.transcriptSegments.push(transcriptSegment);
    }
  }

  // Mark transcript segment as important
  markSegmentImportant(segmentId: string): void {
    if (this.currentSession) {
      const segment = this.currentSession.transcriptSegments.find(s => s.id === segmentId);
      if (segment) {
        segment.isImportant = true;
      }
    }
  }

  // Export recording session as JSON
  exportSession(): string | null {
    if (!this.currentSession) return null;
    
    return JSON.stringify({
      ...this.currentSession,
      videoBlob: undefined, // Exclude blob from JSON
      audioBlob: undefined
    }, null, 2);
  }

  // Cleanup resources
  private cleanup(): void {
    this.isRecording = false;
    this.isPaused = false;

    // Stop all tracks
    if (this.displayStream) {
      this.displayStream.getTracks().forEach(track => track.stop());
      this.displayStream = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach(track => track.stop());
      this.combinedStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.mediaRecorder = null;
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate unique segment ID
  private generateSegmentId(): string {
    return `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create recording metadata
  private createMetadata(options: ScreenCaptureOptions, stream: MediaStream): RecordingMetadata {
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack?.getSettings();

    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      captureResolution: settings ? `${settings.width}x${settings.height}` : 'unknown',
      audioBitrate: options.audioBitrate || 128000,
      videoBitrate: options.videoBitrate || 2500000,
      language: options.language || 'en'
    };
  }

  // Get recording download URL
  getRecordingDownloadUrl(): string | null {
    if (!this.currentSession?.videoBlob) return null;
    return URL.createObjectURL(this.currentSession.videoBlob);
  }

  // Dispose of the manager
  dispose(): void {
    this.cleanup();
    this.currentSession = null;
    this.recordedChunks = [];
  }
}