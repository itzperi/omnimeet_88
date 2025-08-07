import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { RecordingSession, TranscriptSegment } from './webrtc';
import { TranscriptionSession } from './transcription';

export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retries: number;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  createdAt: Date;
  expiresAt: Date;
  permissions: string[];
}

export interface RecordingUploadRequest {
  sessionId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration: number;
  metadata: RecordingMetadata;
}

export interface RecordingUploadResponse {
  uploadUrl: string;
  recordingId: string;
  expiresAt: string;
}

export interface RecordingMetadata {
  captureMode: string;
  resolution: string;
  frameRate: number;
  bitrate: number;
  language: string;
  userAgent: string;
  timestamp: string;
}

export interface UserInteraction {
  id: string;
  sessionId: string;
  userId: string;
  type: InteractionType;
  timestamp: Date;
  data: any;
  context: InteractionContext;
}

export enum InteractionType {
  RECORDING_START = 'recording_start',
  RECORDING_PAUSE = 'recording_pause',
  RECORDING_RESUME = 'recording_resume',
  RECORDING_STOP = 'recording_stop',
  TRANSCRIPT_MARK_IMPORTANT = 'transcript_mark_important',
  TRANSCRIPT_SEARCH = 'transcript_search',
  AI_QUESTION = 'ai_question',
  EXPORT_SESSION = 'export_session',
  ERROR_OCCURRED = 'error_occurred',
  FEATURE_USED = 'feature_used'
}

export interface InteractionContext {
  page: string;
  userAgent: string;
  timestamp: number;
  sessionDuration: number;
  additionalData?: any;
}

export interface LearningInsight {
  id: string;
  sessionId: string;
  type: InsightType;
  title: string;
  description: string;
  confidence: number;
  timestamp: Date;
  metadata: any;
}

export enum InsightType {
  KEY_CONCEPT = 'key_concept',
  QUESTION_OPPORTUNITY = 'question_opportunity',
  KNOWLEDGE_GAP = 'knowledge_gap',
  ENGAGEMENT_PATTERN = 'engagement_pattern',
  LEARNING_MILESTONE = 'learning_milestone'
}

export interface SessionAnalytics {
  sessionId: string;
  duration: number;
  recordingQuality: QualityMetrics;
  transcriptionAccuracy: number;
  userEngagement: EngagementMetrics;
  learningEffectiveness: number;
  insights: LearningInsight[];
}

export interface QualityMetrics {
  videoQuality: number;
  audioQuality: number;
  frameDrops: number;
  networkStability: number;
}

export interface EngagementMetrics {
  interactionCount: number;
  importantMoments: number;
  questionsAsked: number;
  averageResponseTime: number;
}

export interface StorageQuota {
  used: number;
  total: number;
  percentage: number;
  recordingCount: number;
}

export class BackendApiService {
  private api: AxiosInstance;
  private config: ApiConfig;
  private currentSession: UserSession | null = null;
  private wsConnection: WebSocket | null = null;

  constructor(config: ApiConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      ...config
    };

    this.api = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    this.setupInterceptors();
  }

  // Setup axios interceptors for error handling and retries
  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        if (this.currentSession?.sessionToken) {
          config.headers['X-Session-Token'] = this.currentSession.sessionToken;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { config: requestConfig, response } = error;
        
        // Retry logic
        if (requestConfig && !requestConfig._retry && requestConfig._retryCount < this.config.retries) {
          requestConfig._retry = true;
          requestConfig._retryCount = (requestConfig._retryCount || 0) + 1;
          
          // Exponential backoff
          const delay = Math.pow(2, requestConfig._retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return this.api(requestConfig);
        }

        // Handle specific error cases
        if (response?.status === 401) {
          await this.refreshSession();
          return this.api(requestConfig);
        }

        return Promise.reject(error);
      }
    );
  }

  // Authentication and session management
  async authenticate(credentials: { username: string; password: string }): Promise<UserSession> {
    try {
      const response = await this.api.post('/auth/login', credentials);
      this.currentSession = response.data.session;
      return this.currentSession;
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  async refreshSession(): Promise<UserSession | null> {
    if (!this.currentSession) return null;

    try {
      const response = await this.api.post('/auth/refresh', {
        sessionToken: this.currentSession.sessionToken
      });
      this.currentSession = response.data.session;
      return this.currentSession;
    } catch (error) {
      console.error('Session refresh failed:', error);
      this.currentSession = null;
      return null;
    }
  }

  async logout(): Promise<void> {
    if (this.currentSession) {
      try {
        await this.api.post('/auth/logout');
      } catch (error) {
        console.error('Logout error:', error);
      }
      this.currentSession = null;
    }
  }

  // Recording session management
  async createRecordingSession(metadata: RecordingMetadata): Promise<string> {
    try {
      const response = await this.api.post('/recordings/session', {
        metadata,
        timestamp: new Date().toISOString()
      });
      return response.data.sessionId;
    } catch (error) {
      throw new Error(`Failed to create recording session: ${error}`);
    }
  }

  async updateRecordingSession(sessionId: string, updates: Partial<RecordingSession>): Promise<void> {
    try {
      await this.api.patch(`/recordings/session/${sessionId}`, updates);
    } catch (error) {
      throw new Error(`Failed to update recording session: ${error}`);
    }
  }

  async getRecordingSession(sessionId: string): Promise<RecordingSession> {
    try {
      const response = await this.api.get(`/recordings/session/${sessionId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get recording session: ${error}`);
    }
  }

  // File upload and storage
  async requestUploadUrl(request: RecordingUploadRequest): Promise<RecordingUploadResponse> {
    try {
      const response = await this.api.post('/recordings/upload-url', request);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get upload URL: ${error}`);
    }
  }

  async uploadRecording(uploadUrl: string, file: Blob, onProgress?: (progress: number) => void): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(progress);
          }
        }
      });
    } catch (error) {
      throw new Error(`Failed to upload recording: ${error}`);
    }
  }

  async deleteRecording(recordingId: string): Promise<void> {
    try {
      await this.api.delete(`/recordings/${recordingId}`);
    } catch (error) {
      throw new Error(`Failed to delete recording: ${error}`);
    }
  }

  // Transcription management
  async saveTranscriptionSession(session: TranscriptionSession): Promise<string> {
    try {
      const response = await this.api.post('/transcriptions', session);
      return response.data.id;
    } catch (error) {
      throw new Error(`Failed to save transcription: ${error}`);
    }
  }

  async getTranscriptionSession(sessionId: string): Promise<TranscriptionSession> {
    try {
      const response = await this.api.get(`/transcriptions/${sessionId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get transcription: ${error}`);
    }
  }

  async updateTranscriptSegment(sessionId: string, segmentId: string, updates: Partial<TranscriptSegment>): Promise<void> {
    try {
      await this.api.patch(`/transcriptions/${sessionId}/segments/${segmentId}`, updates);
    } catch (error) {
      throw new Error(`Failed to update transcript segment: ${error}`);
    }
  }

  // User interaction logging
  async logUserInteraction(interaction: Omit<UserInteraction, 'id'>): Promise<string> {
    try {
      const response = await this.api.post('/analytics/interactions', {
        ...interaction,
        timestamp: new Date().toISOString()
      });
      return response.data.id;
    } catch (error) {
      console.error('Failed to log user interaction:', error);
      // Don't throw error for analytics to avoid disrupting user experience
      return '';
    }
  }

  async getSessionAnalytics(sessionId: string): Promise<SessionAnalytics> {
    try {
      const response = await this.api.get(`/analytics/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get session analytics: ${error}`);
    }
  }

  // Learning insights generation
  async generateLearningInsights(sessionId: string): Promise<LearningInsight[]> {
    try {
      const response = await this.api.post(`/ai/insights/${sessionId}`);
      return response.data.insights;
    } catch (error) {
      throw new Error(`Failed to generate learning insights: ${error}`);
    }
  }

  async getLearningInsights(sessionId: string): Promise<LearningInsight[]> {
    try {
      const response = await this.api.get(`/ai/insights/${sessionId}`);
      return response.data.insights;
    } catch (error) {
      throw new Error(`Failed to get learning insights: ${error}`);
    }
  }

  // Real-time WebSocket communication
  async connectRealtime(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.baseUrl.replace('http', 'ws')}/realtime/${sessionId}`;
        this.wsConnection = new WebSocket(wsUrl);

        this.wsConnection.onopen = () => {
          console.log('Connected to realtime service');
          resolve();
        };

        this.wsConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleRealtimeMessage(data);
          } catch (error) {
            console.error('Error parsing realtime message:', error);
          }
        };

        this.wsConnection.onclose = () => {
          console.log('Realtime connection closed');
        };

        this.wsConnection.onerror = (error) => {
          console.error('Realtime connection error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleRealtimeMessage(data: any): void {
    switch (data.type) {
      case 'recording_status':
        // Handle recording status updates
        break;
      case 'transcription_update':
        // Handle real-time transcription updates
        break;
      case 'insight_generated':
        // Handle new learning insights
        break;
      default:
        console.log('Unknown realtime message type:', data.type);
    }
  }

  sendRealtimeMessage(type: string, data: any): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({ type, data, timestamp: Date.now() }));
    }
  }

  disconnectRealtime(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  // Storage management
  async getStorageQuota(): Promise<StorageQuota> {
    try {
      const response = await this.api.get('/storage/quota');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get storage quota: ${error}`);
    }
  }

  async getUserRecordings(limit = 20, offset = 0): Promise<RecordingSession[]> {
    try {
      const response = await this.api.get('/recordings', {
        params: { limit, offset }
      });
      return response.data.recordings;
    } catch (error) {
      throw new Error(`Failed to get user recordings: ${error}`);
    }
  }

  // Health check and diagnostics
  async healthCheck(): Promise<{ status: string; timestamp: string; services: any[] }> {
    try {
      const response = await this.api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error}`);
    }
  }

  async getDiagnostics(): Promise<any> {
    try {
      const response = await this.api.get('/diagnostics');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get diagnostics: ${error}`);
    }
  }

  // Configuration
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update axios instance
    this.api.defaults.baseURL = this.config.baseUrl;
    this.api.defaults.timeout = this.config.timeout;
    
    if (this.config.apiKey) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
  }

  // Utility methods
  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  isAuthenticated(): boolean {
    return !!this.currentSession && new Date() < new Date(this.currentSession.expiresAt);
  }

  hasPermission(permission: string): boolean {
    return !!this.currentSession?.permissions.includes(permission);
  }

  // Cleanup
  dispose(): void {
    this.disconnectRealtime();
    this.currentSession = null;
  }
}

// Factory function for creating API service instance
export function createBackendApiService(config: Partial<ApiConfig>): BackendApiService {
  const defaultConfig: ApiConfig = {
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
    timeout: 30000,
    retries: 3
  };

  return new BackendApiService({ ...defaultConfig, ...config });
}

// Singleton instance
let apiServiceInstance: BackendApiService | null = null;

export function getApiService(): BackendApiService {
  if (!apiServiceInstance) {
    apiServiceInstance = createBackendApiService({});
  }
  return apiServiceInstance;
}