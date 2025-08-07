export interface BrowserCapabilities {
  webrtc: boolean;
  mediaDevices: boolean;
  displayMedia: boolean;
  getUserMedia: boolean;
  mediaRecorder: boolean;
  webSocket: boolean;
  audioContext: boolean;
  supportedMimeTypes: string[];
  recommendedMimeType: string;
  hasPermissions: boolean;
  isSecureContext: boolean;
}

export interface FallbackOptions {
  enablePolyfills: boolean;
  useRecordingWorker: boolean;
  lowQualityFallback: boolean;
  audioOnlyFallback: boolean;
  basicTranscriptionFallback: boolean;
}

export interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  fallbackStrategies: string[];
  notificationHandler?: (error: ErrorInfo) => void;
}

export interface ErrorInfo {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'permissions' | 'browser' | 'hardware' | 'user' | 'system';
  recoverable: boolean;
  fallbackAvailable: boolean;
  userAction?: string;
  technicalDetails?: any;
}

export interface PermissionStatus {
  camera: 'granted' | 'denied' | 'prompt' | 'unknown';
  microphone: 'granted' | 'denied' | 'prompt' | 'unknown';
  displayCapture: 'granted' | 'denied' | 'prompt' | 'unknown';
  notifications: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export class CompatibilityManager {
  private capabilities: BrowserCapabilities | null = null;
  private errorRecoveryConfig: ErrorRecoveryConfig;
  private retryAttempts: Map<string, number> = new Map();
  
  constructor(errorConfig?: Partial<ErrorRecoveryConfig>) {
    this.errorRecoveryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      fallbackStrategies: ['quality_reduction', 'audio_only', 'basic_recording'],
      ...errorConfig
    };
  }

  // Comprehensive browser capability detection
  async detectCapabilities(): Promise<BrowserCapabilities> {
    const capabilities: BrowserCapabilities = {
      webrtc: this.checkWebRTCSupport(),
      mediaDevices: this.checkMediaDevicesSupport(),
      displayMedia: this.checkDisplayMediaSupport(),
      getUserMedia: this.checkUserMediaSupport(),
      mediaRecorder: this.checkMediaRecorderSupport(),
      webSocket: this.checkWebSocketSupport(),
      audioContext: this.checkAudioContextSupport(),
      supportedMimeTypes: this.getSupportedMimeTypes(),
      recommendedMimeType: '',
      hasPermissions: await this.checkPermissions(),
      isSecureContext: this.checkSecureContext()
    };

    capabilities.recommendedMimeType = this.getRecommendedMimeType(capabilities.supportedMimeTypes);
    this.capabilities = capabilities;
    
    return capabilities;
  }

  // WebRTC support detection
  private checkWebRTCSupport(): boolean {
    return !!(
      window.RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection
    );
  }

  // Media devices support
  private checkMediaDevicesSupport(): boolean {
    return !!(navigator.mediaDevices);
  }

  // Display media (screen capture) support
  private checkDisplayMediaSupport(): boolean {
    return !!(navigator.mediaDevices?.getDisplayMedia);
  }

  // User media (camera/microphone) support
  private checkUserMediaSupport(): boolean {
    return !!(
      navigator.mediaDevices?.getUserMedia ||
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia
    );
  }

  // MediaRecorder support
  private checkMediaRecorderSupport(): boolean {
    return !!(window.MediaRecorder);
  }

  // WebSocket support
  private checkWebSocketSupport(): boolean {
    return !!(window.WebSocket);
  }

  // AudioContext support
  private checkAudioContextSupport(): boolean {
    return !!(
      window.AudioContext ||
      (window as any).webkitAudioContext ||
      (window as any).mozAudioContext
    );
  }

  // Get supported MIME types for recording
  private getSupportedMimeTypes(): string[] {
    if (!window.MediaRecorder) return [];

    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm;codecs=h264',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4;codecs=h264',
      'video/mp4',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];

    return types.filter(type => {
      try {
        return MediaRecorder.isTypeSupported(type);
      } catch (error) {
        return false;
      }
    });
  }

  // Get recommended MIME type based on browser capabilities
  private getRecommendedMimeType(supportedTypes: string[]): string {
    const preferences = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4'
    ];

    for (const type of preferences) {
      if (supportedTypes.includes(type)) {
        return type;
      }
    }

    return supportedTypes[0] || 'video/webm';
  }

  // Check if running in secure context (required for many APIs)
  private checkSecureContext(): boolean {
    return window.isSecureContext === true;
  }

  // Check various permissions
  private async checkPermissions(): Promise<boolean> {
    if (!navigator.permissions) return false;

    try {
      const permissions = await Promise.allSettled([
        navigator.permissions.query({ name: 'camera' as PermissionName }),
        navigator.permissions.query({ name: 'microphone' as PermissionName }),
        navigator.permissions.query({ name: 'display-capture' as PermissionName }).catch(() => null)
      ]);

      return permissions.some(result => 
        result.status === 'fulfilled' && 
        result.value?.state === 'granted'
      );
    } catch (error) {
      return false;
    }
  }

  // Get detailed permission status
  async getPermissionStatus(): Promise<PermissionStatus> {
    const status: PermissionStatus = {
      camera: 'unknown',
      microphone: 'unknown',
      displayCapture: 'unknown',
      notifications: 'unknown'
    };

    if (!navigator.permissions) return status;

    try {
      const [camera, microphone, displayCapture, notifications] = await Promise.allSettled([
        navigator.permissions.query({ name: 'camera' as PermissionName }),
        navigator.permissions.query({ name: 'microphone' as PermissionName }),
        navigator.permissions.query({ name: 'display-capture' as PermissionName }).catch(() => null),
        navigator.permissions.query({ name: 'notifications' as PermissionName })
      ]);

      if (camera.status === 'fulfilled') status.camera = camera.value.state as any;
      if (microphone.status === 'fulfilled') status.microphone = microphone.value.state as any;
      if (displayCapture.status === 'fulfilled' && displayCapture.value) status.displayCapture = displayCapture.value.state as any;
      if (notifications.status === 'fulfilled') status.notifications = notifications.value.state as any;
    } catch (error) {
      console.warn('Permission status check failed:', error);
    }

    return status;
  }

  // Request permissions with fallback handling
  async requestPermissions(): Promise<PermissionStatus> {
    const status = await this.getPermissionStatus();

    // Request camera permission
    if (status.camera === 'prompt') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        status.camera = 'granted';
      } catch (error) {
        status.camera = 'denied';
      }
    }

    // Request microphone permission
    if (status.microphone === 'prompt') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        status.microphone = 'granted';
      } catch (error) {
        status.microphone = 'denied';
      }
    }

    // Request notification permission
    if (status.notifications === 'prompt' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        status.notifications = permission as any;
      } catch (error) {
        status.notifications = 'denied';
      }
    }

    return status;
  }

  // Error classification and handling
  classifyError(error: any): ErrorInfo {
    let errorInfo: ErrorInfo = {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      severity: 'medium',
      category: 'system',
      recoverable: false,
      fallbackAvailable: false
    };

    // Network errors
    if (error.name === 'NetworkError' || error.message?.includes('network')) {
      errorInfo = {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        severity: 'high',
        category: 'network',
        recoverable: true,
        fallbackAvailable: true,
        userAction: 'Check your internet connection and try again',
        technicalDetails: error
      };
    }

    // Permission errors
    else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorInfo = {
        code: 'PERMISSION_DENIED',
        message: 'Permission denied for media access',
        severity: 'high',
        category: 'permissions',
        recoverable: true,
        fallbackAvailable: true,
        userAction: 'Please grant camera and microphone permissions in your browser settings',
        technicalDetails: error
      };
    }

    // Device not found errors
    else if (error.name === 'NotFoundError' || error.name === 'DeviceNotFoundError') {
      errorInfo = {
        code: 'DEVICE_NOT_FOUND',
        message: 'Required device not found',
        severity: 'high',
        category: 'hardware',
        recoverable: false,
        fallbackAvailable: true,
        userAction: 'Check that your camera and microphone are connected',
        technicalDetails: error
      };
    }

    // Browser not supported
    else if (error.name === 'NotSupportedError') {
      errorInfo = {
        code: 'BROWSER_NOT_SUPPORTED',
        message: 'Browser does not support required features',
        severity: 'critical',
        category: 'browser',
        recoverable: false,
        fallbackAvailable: true,
        userAction: 'Please use a modern browser that supports WebRTC',
        technicalDetails: error
      };
    }

    // Security errors
    else if (error.name === 'SecurityError') {
      errorInfo = {
        code: 'SECURITY_ERROR',
        message: 'Security restrictions prevent access',
        severity: 'high',
        category: 'browser',
        recoverable: false,
        fallbackAvailable: false,
        userAction: 'Ensure you are using HTTPS and have granted necessary permissions',
        technicalDetails: error
      };
    }

    // Timeout errors
    else if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      errorInfo = {
        code: 'TIMEOUT_ERROR',
        message: 'Operation timed out',
        severity: 'medium',
        category: 'network',
        recoverable: true,
        fallbackAvailable: true,
        userAction: 'Please try again',
        technicalDetails: error
      };
    }

    // Media recorder errors
    else if (error.name === 'InvalidStateError' && error.message?.includes('recorder')) {
      errorInfo = {
        code: 'RECORDER_STATE_ERROR',
        message: 'Media recorder in invalid state',
        severity: 'medium',
        category: 'system',
        recoverable: true,
        fallbackAvailable: true,
        userAction: 'Please stop and restart the recording',
        technicalDetails: error
      };
    }

    return errorInfo;
  }

  // Retry mechanism with exponential backoff
  async retryOperation<T>(
    operationId: string,
    operation: () => Promise<T>,
    customConfig?: Partial<ErrorRecoveryConfig>
  ): Promise<T> {
    const config = { ...this.errorRecoveryConfig, ...customConfig };
    const currentAttempts = this.retryAttempts.get(operationId) || 0;

    try {
      const result = await operation();
      this.retryAttempts.delete(operationId); // Reset on success
      return result;
    } catch (error) {
      const errorInfo = this.classifyError(error);
      
      if (!errorInfo.recoverable || currentAttempts >= config.maxRetries) {
        this.retryAttempts.delete(operationId);
        throw error;
      }

      this.retryAttempts.set(operationId, currentAttempts + 1);
      
      // Calculate delay
      let delay = config.retryDelay;
      if (config.exponentialBackoff) {
        delay = delay * Math.pow(2, currentAttempts);
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry
      return this.retryOperation(operationId, operation, customConfig);
    }
  }

  // Apply fallback strategies
  async applyFallbacks(error: ErrorInfo, originalOptions: any): Promise<any> {
    const fallbackOptions = { ...originalOptions };
    
    switch (error.code) {
      case 'BROWSER_NOT_SUPPORTED':
        return this.getBrowserFallbackOptions(fallbackOptions);
        
      case 'DEVICE_NOT_FOUND':
        return this.getDeviceFallbackOptions(fallbackOptions);
        
      case 'PERMISSION_DENIED':
        return this.getPermissionFallbackOptions(fallbackOptions);
        
      case 'NETWORK_ERROR':
        return this.getNetworkFallbackOptions(fallbackOptions);
        
      default:
        return this.getGenericFallbackOptions(fallbackOptions);
    }
  }

  private getBrowserFallbackOptions(options: any): any {
    return {
      ...options,
      videoQuality: 'low',
      frameRate: 15,
      audioBitrate: 64000,
      videoBitrate: 500000,
      includeSystemAudio: false,
      enablePolyfills: true
    };
  }

  private getDeviceFallbackOptions(options: any): any {
    return {
      ...options,
      captureMode: 'screen', // Prefer screen over window
      includeMicrophone: false,
      audioOnlyFallback: true
    };
  }

  private getPermissionFallbackOptions(options: any): any {
    return {
      ...options,
      includeMicrophone: false,
      includeSystemAudio: false,
      basicTranscriptionFallback: true
    };
  }

  private getNetworkFallbackOptions(options: any): any {
    return {
      ...options,
      videoQuality: 'low',
      frameRate: 10,
      audioBitrate: 32000,
      videoBitrate: 250000,
      useRecordingWorker: false
    };
  }

  private getGenericFallbackOptions(options: any): any {
    return {
      ...options,
      videoQuality: 'low',
      frameRate: 15,
      lowQualityFallback: true
    };
  }

  // Browser-specific workarounds
  applyBrowserWorkarounds(): void {
    // Chrome workarounds
    if (this.isChrome()) {
      this.applyChromeWorkarounds();
    }
    
    // Firefox workarounds
    else if (this.isFirefox()) {
      this.applyFirefoxWorkarounds();
    }
    
    // Safari workarounds
    else if (this.isSafari()) {
      this.applySafariWorkarounds();
    }
    
    // Edge workarounds
    else if (this.isEdge()) {
      this.applyEdgeWorkarounds();
    }
  }

  private isChrome(): boolean {
    return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  }

  private isFirefox(): boolean {
    return /Firefox/.test(navigator.userAgent);
  }

  private isSafari(): boolean {
    return /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
  }

  private isEdge(): boolean {
    return /Edg/.test(navigator.userAgent);
  }

  private applyChromeWorkarounds(): void {
    // Chrome-specific fixes
    if (!window.AudioContext && (window as any).webkitAudioContext) {
      (window as any).AudioContext = (window as any).webkitAudioContext;
    }
  }

  private applyFirefoxWorkarounds(): void {
    // Firefox-specific fixes
    if (!navigator.mediaDevices.getDisplayMedia && (navigator as any).mozGetDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia = (navigator as any).mozGetDisplayMedia.bind(navigator);
    }
  }

  private applySafariWorkarounds(): void {
    // Safari-specific fixes
    // Safari has limited WebRTC support
  }

  private applyEdgeWorkarounds(): void {
    // Edge-specific fixes
    if (!window.AudioContext && (window as any).webkitAudioContext) {
      (window as any).AudioContext = (window as any).webkitAudioContext;
    }
  }

  // Polyfills for missing features
  loadPolyfills(): Promise<void> {
    const polyfills: Promise<void>[] = [];

    // WebRTC polyfill
    if (!this.capabilities?.webrtc) {
      polyfills.push(this.loadWebRTCPolyfill());
    }

    // MediaRecorder polyfill
    if (!this.capabilities?.mediaRecorder) {
      polyfills.push(this.loadMediaRecorderPolyfill());
    }

    // AudioContext polyfill
    if (!this.capabilities?.audioContext) {
      polyfills.push(this.loadAudioContextPolyfill());
    }

    return Promise.all(polyfills).then(() => {});
  }

  private async loadWebRTCPolyfill(): Promise<void> {
    // In a real implementation, you would load adapter.js or similar
    console.log('Loading WebRTC polyfill...');
  }

  private async loadMediaRecorderPolyfill(): Promise<void> {
    // In a real implementation, you would load MediaRecorder polyfill
    console.log('Loading MediaRecorder polyfill...');
  }

  private async loadAudioContextPolyfill(): Promise<void> {
    // Apply basic AudioContext polyfill
    if (!window.AudioContext && (window as any).webkitAudioContext) {
      (window as any).AudioContext = (window as any).webkitAudioContext;
    }
  }

  // Generate compatibility report
  generateCompatibilityReport(): string {
    if (!this.capabilities) {
      return 'Compatibility check not yet performed';
    }

    const report = [
      '=== Omnimeet Live Lecture Compatibility Report ===',
      '',
      `Browser: ${navigator.userAgent}`,
      `Secure Context: ${this.capabilities.isSecureContext ? 'Yes' : 'No'}`,
      '',
      'Core Features:',
      `  WebRTC Support: ${this.capabilities.webrtc ? '✓' : '✗'}`,
      `  Media Devices: ${this.capabilities.mediaDevices ? '✓' : '✗'}`,
      `  Screen Capture: ${this.capabilities.displayMedia ? '✓' : '✗'}`,
      `  User Media: ${this.capabilities.getUserMedia ? '✓' : '✗'}`,
      `  Media Recorder: ${this.capabilities.mediaRecorder ? '✓' : '✗'}`,
      `  WebSocket: ${this.capabilities.webSocket ? '✓' : '✗'}`,
      `  Audio Context: ${this.capabilities.audioContext ? '✓' : '✗'}`,
      '',
      'Recording Formats:',
      ...this.capabilities.supportedMimeTypes.map(type => `  ${type}`),
      '',
      `Recommended Format: ${this.capabilities.recommendedMimeType}`,
      `Permissions Granted: ${this.capabilities.hasPermissions ? 'Yes' : 'No'}`,
      '',
      '=== End Report ==='
    ];

    return report.join('\n');
  }

  // Notify about errors
  notifyError(errorInfo: ErrorInfo): void {
    if (this.errorRecoveryConfig.notificationHandler) {
      this.errorRecoveryConfig.notificationHandler(errorInfo);
    } else {
      console.error('Error:', errorInfo);
    }
  }

  // Get current capabilities
  getCapabilities(): BrowserCapabilities | null {
    return this.capabilities;
  }

  // Update error recovery configuration
  updateErrorConfig(config: Partial<ErrorRecoveryConfig>): void {
    this.errorRecoveryConfig = { ...this.errorRecoveryConfig, ...config };
  }

  // Clean up retry attempts
  clearRetryAttempts(): void {
    this.retryAttempts.clear();
  }
}

// Factory function for creating compatibility manager
export function createCompatibilityManager(config?: Partial<ErrorRecoveryConfig>): CompatibilityManager {
  const manager = new CompatibilityManager(config);
  manager.applyBrowserWorkarounds();
  return manager;
}

// Singleton instance
let compatibilityManagerInstance: CompatibilityManager | null = null;

export function getCompatibilityManager(): CompatibilityManager {
  if (!compatibilityManagerInstance) {
    compatibilityManagerInstance = createCompatibilityManager();
  }
  return compatibilityManagerInstance;
}