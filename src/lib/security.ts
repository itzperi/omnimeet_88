import CryptoJS from 'crypto-js';

export interface SecurityConfig {
  encryptionEnabled: boolean;
  encryptionKey?: string;
  sessionTimeout: number;
  maxRetries: number;
  rateLimitWindow: number;
  rateLimitRequests: number;
  requireSecureContext: boolean;
  allowedOrigins: string[];
  csrfProtection: boolean;
}

export interface UserIdentity {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  sessionToken: string;
  sessionExpiry: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}

export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
  GUEST = 'guest'
}

export enum Permission {
  RECORD_LECTURE = 'record_lecture',
  VIEW_LECTURE = 'view_lecture',
  TRANSCRIBE_AUDIO = 'transcribe_audio',
  EXPORT_DATA = 'export_data',
  MANAGE_USERS = 'manage_users',
  ACCESS_ANALYTICS = 'access_analytics',
  DELETE_RECORDINGS = 'delete_recordings'
}

export interface DataClassification {
  level: SecurityLevel;
  category: DataCategory;
  retention: RetentionPolicy;
  encryption: boolean;
  piiContained: boolean;
  consentRequired: boolean;
}

export enum SecurityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted'
}

export enum DataCategory {
  RECORDING = 'recording',
  TRANSCRIPT = 'transcript',
  ANALYTICS = 'analytics',
  USER_DATA = 'user_data',
  METADATA = 'metadata'
}

export interface RetentionPolicy {
  duration: number; // in days
  autoDelete: boolean;
  archiveAfter: number; // in days
  legal_hold: boolean;
}

export interface PrivacyPreferences {
  allowRecording: boolean;
  allowTranscription: boolean;
  allowAnalytics: boolean;
  allowDataSharing: boolean;
  dataRetentionDays: number;
  notificationPreferences: NotificationPreference[];
}

export interface NotificationPreference {
  type: NotificationType;
  enabled: boolean;
  frequency: NotificationFrequency;
}

export enum NotificationType {
  RECORDING_STARTED = 'recording_started',
  RECORDING_STOPPED = 'recording_stopped',
  DATA_PROCESSED = 'data_processed',
  DATA_DELETED = 'data_deleted',
  PRIVACY_UPDATE = 'privacy_update'
}

export enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never'
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: AuditAction;
  resource: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  riskScore: number;
}

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  RECORD_START = 'record_start',
  RECORD_STOP = 'record_stop',
  DATA_ACCESS = 'data_access',
  DATA_EXPORT = 'data_export',
  DATA_DELETE = 'data_delete',
  SETTINGS_CHANGE = 'settings_change',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke'
}

export interface ConsentRecord {
  id: string;
  userId: string;
  dataType: DataCategory;
  purpose: string;
  consentGiven: boolean;
  timestamp: Date;
  expiryDate?: Date;
  withdrawnAt?: Date;
  legalBasis: string;
  version: string;
}

export class SecurityManager {
  private config: SecurityConfig;
  private currentUser: UserIdentity | null = null;
  private auditLogs: AuditLog[] = [];
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private rateLimitTracker: Map<string, number[]> = new Map();
  private encryptionKey: string;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      encryptionEnabled: true,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      maxRetries: 3,
      rateLimitWindow: 60 * 1000, // 1 minute
      rateLimitRequests: 100,
      requireSecureContext: true,
      allowedOrigins: ['localhost', 'omnimeet.com'],
      csrfProtection: true,
      ...config
    };

    this.encryptionKey = this.config.encryptionKey || this.generateEncryptionKey();
    this.validateSecurityContext();
  }

  // Authentication and session management
  async authenticate(credentials: { email: string; password: string }): Promise<UserIdentity> {
    try {
      this.checkRateLimit(credentials.email);
      
      // In a real implementation, this would validate against a backend
      const user = await this.validateCredentials(credentials);
      
      // Create secure session
      const sessionToken = this.generateSecureToken();
      const sessionExpiry = new Date(Date.now() + this.config.sessionTimeout);
      
      this.currentUser = {
        ...user,
        sessionToken,
        sessionExpiry,
        lastActivity: new Date(),
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent
      };

      // Log authentication
      await this.auditAction(AuditAction.LOGIN, 'authentication', {
        email: credentials.email,
        success: true
      });

      // Store session securely
      await this.storeSession(this.currentUser);

      return this.currentUser;
    } catch (error) {
      await this.auditAction(AuditAction.LOGIN, 'authentication', {
        email: credentials.email,
        success: false,
        error: error.message
      });
      throw error;
    }
  }

  // Session validation and refresh
  async validateSession(token: string): Promise<boolean> {
    try {
      const session = await this.retrieveSession(token);
      
      if (!session || session.sessionExpiry < new Date()) {
        await this.invalidateSession(token);
        return false;
      }

      // Update last activity
      session.lastActivity = new Date();
      await this.storeSession(session);
      this.currentUser = session;

      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }

  // Permission checking
  hasPermission(permission: Permission): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.permissions.includes(permission);
  }

  hasRole(role: UserRole): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.role === role;
  }

  // Data encryption and decryption
  encryptData(data: any): string {
    if (!this.config.encryptionEnabled) return JSON.stringify(data);
    
    const jsonString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonString, this.encryptionKey).toString();
  }

  decryptData(encryptedData: string): any {
    if (!this.config.encryptionEnabled) return JSON.parse(encryptedData);
    
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      throw new Error('Failed to decrypt data');
    }
  }

  // Data classification and handling
  classifyData(data: any, category: DataCategory): DataClassification {
    const classification: DataClassification = {
      level: SecurityLevel.INTERNAL,
      category,
      retention: this.getDefaultRetentionPolicy(category),
      encryption: true,
      piiContained: this.detectPII(data),
      consentRequired: true
    };

    // Adjust based on content analysis
    if (classification.piiContained) {
      classification.level = SecurityLevel.CONFIDENTIAL;
      classification.consentRequired = true;
    }

    if (category === DataCategory.RECORDING || category === DataCategory.TRANSCRIPT) {
      classification.level = SecurityLevel.CONFIDENTIAL;
    }

    return classification;
  }

  // PII detection
  private detectPII(data: any): boolean {
    const piiPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone number
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    return piiPatterns.some(pattern => pattern.test(dataString));
  }

  // Consent management
  async recordConsent(userId: string, dataType: DataCategory, purpose: string, legalBasis: string): Promise<string> {
    const consentRecord: ConsentRecord = {
      id: this.generateSecureToken(),
      userId,
      dataType,
      purpose,
      consentGiven: true,
      timestamp: new Date(),
      legalBasis,
      version: '1.0'
    };

    if (!this.consentRecords.has(userId)) {
      this.consentRecords.set(userId, []);
    }
    
    this.consentRecords.get(userId)!.push(consentRecord);

    await this.auditAction(AuditAction.PERMISSION_GRANT, 'consent', {
      userId,
      dataType,
      purpose,
      consentId: consentRecord.id
    });

    return consentRecord.id;
  }

  async withdrawConsent(userId: string, consentId: string): Promise<void> {
    const userConsents = this.consentRecords.get(userId);
    if (!userConsents) throw new Error('No consent records found');

    const consent = userConsents.find(c => c.id === consentId);
    if (!consent) throw new Error('Consent record not found');

    consent.consentGiven = false;
    consent.withdrawnAt = new Date();

    await this.auditAction(AuditAction.PERMISSION_REVOKE, 'consent', {
      userId,
      consentId,
      withdrawnAt: consent.withdrawnAt
    });
  }

  hasValidConsent(userId: string, dataType: DataCategory): boolean {
    const userConsents = this.consentRecords.get(userId);
    if (!userConsents) return false;

    return userConsents.some(consent => 
      consent.dataType === dataType &&
      consent.consentGiven &&
      !consent.withdrawnAt &&
      (!consent.expiryDate || consent.expiryDate > new Date())
    );
  }

  // Privacy preferences management
  async updatePrivacyPreferences(userId: string, preferences: PrivacyPreferences): Promise<void> {
    // Validate preferences
    this.validatePrivacyPreferences(preferences);

    // Store encrypted preferences
    const encryptedPreferences = this.encryptData(preferences);
    await this.storePrivacyPreferences(userId, encryptedPreferences);

    await this.auditAction(AuditAction.SETTINGS_CHANGE, 'privacy', {
      userId,
      preferences: Object.keys(preferences)
    });
  }

  async getPrivacyPreferences(userId: string): Promise<PrivacyPreferences | null> {
    try {
      const encryptedPreferences = await this.retrievePrivacyPreferences(userId);
      if (!encryptedPreferences) return null;
      
      return this.decryptData(encryptedPreferences);
    } catch (error) {
      console.error('Failed to retrieve privacy preferences:', error);
      return null;
    }
  }

  // Data anonymization
  anonymizeData(data: any): any {
    const anonymized = JSON.parse(JSON.stringify(data));
    
    // Replace PII with anonymized versions
    this.anonymizeEmails(anonymized);
    this.anonymizePhoneNumbers(anonymized);
    this.anonymizeNames(anonymized);
    
    return anonymized;
  }

  private anonymizeEmails(data: any): void {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    this.recursiveReplace(data, emailRegex, '***@***.***');
  }

  private anonymizePhoneNumbers(data: any): void {
    const phoneRegex = /\b\d{3}-\d{3}-\d{4}\b/g;
    this.recursiveReplace(data, phoneRegex, '***-***-****');
  }

  private anonymizeNames(data: any): void {
    // Simple name patterns - in production would use more sophisticated NLP
    const namePatterns = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    this.recursiveReplace(data, namePatterns, '[Name]');
  }

  private recursiveReplace(obj: any, regex: RegExp, replacement: string): void {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(regex, replacement);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.recursiveReplace(obj[key], regex, replacement);
      }
    }
  }

  // Audit logging
  async auditAction(action: AuditAction, resource: string, details: any): Promise<void> {
    const auditLog: AuditLog = {
      id: this.generateSecureToken(),
      timestamp: new Date(),
      userId: this.currentUser?.id || 'anonymous',
      action,
      resource,
      details,
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      success: details.success !== false,
      riskScore: this.calculateRiskScore(action, details)
    };

    this.auditLogs.push(auditLog);
    await this.persistAuditLog(auditLog);

    // Check for suspicious activity
    if (auditLog.riskScore > 7) {
      await this.alertSecurityTeam(auditLog);
    }
  }

  // Risk assessment
  private calculateRiskScore(action: AuditAction, details: any): number {
    let score = 0;

    // Base risk by action type
    const actionRisks = {
      [AuditAction.LOGIN]: 2,
      [AuditAction.LOGOUT]: 1,
      [AuditAction.RECORD_START]: 4,
      [AuditAction.DATA_ACCESS]: 3,
      [AuditAction.DATA_EXPORT]: 6,
      [AuditAction.DATA_DELETE]: 8,
      [AuditAction.SETTINGS_CHANGE]: 3,
      [AuditAction.PERMISSION_GRANT]: 5,
      [AuditAction.PERMISSION_REVOKE]: 4
    };

    score += actionRisks[action] || 1;

    // Increase risk for failures
    if (!details.success) score += 3;

    // Increase risk for unusual activity patterns
    const recentActions = this.auditLogs.filter(log => 
      log.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
    );

    if (recentActions.length > 10) score += 2;

    return Math.min(score, 10);
  }

  // Secure token generation
  generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Rate limiting
  private checkRateLimit(identifier: string): void {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow;
    
    if (!this.rateLimitTracker.has(identifier)) {
      this.rateLimitTracker.set(identifier, []);
    }

    const requests = this.rateLimitTracker.get(identifier)!;
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.config.rateLimitRequests) {
      throw new Error('Rate limit exceeded');
    }

    validRequests.push(now);
    this.rateLimitTracker.set(identifier, validRequests);
  }

  // Security context validation
  private validateSecurityContext(): void {
    if (this.config.requireSecureContext && !window.isSecureContext) {
      throw new Error('Secure context (HTTPS) required');
    }

    // Check CSP headers
    if (this.config.csrfProtection) {
      this.setupCSRFProtection();
    }
  }

  private setupCSRFProtection(): void {
    // Basic CSRF token implementation
    const csrfToken = this.generateSecureToken();
    document.cookie = `csrf-token=${csrfToken}; Secure; SameSite=Strict`;
  }

  // Helper methods
  private generateEncryptionKey(): string {
    return CryptoJS.lib.WordArray.random(256 / 8).toString();
  }

  private async getClientIP(): Promise<string> {
    // In a real implementation, this would get the actual client IP
    return '127.0.0.1';
  }

  private getDefaultRetentionPolicy(category: DataCategory): RetentionPolicy {
    const policies: Record<DataCategory, RetentionPolicy> = {
      [DataCategory.RECORDING]: {
        duration: 365,
        autoDelete: true,
        archiveAfter: 90,
        legal_hold: false
      },
      [DataCategory.TRANSCRIPT]: {
        duration: 365,
        autoDelete: true,
        archiveAfter: 90,
        legal_hold: false
      },
      [DataCategory.ANALYTICS]: {
        duration: 730,
        autoDelete: false,
        archiveAfter: 365,
        legal_hold: false
      },
      [DataCategory.USER_DATA]: {
        duration: 2555, // 7 years
        autoDelete: false,
        archiveAfter: 365,
        legal_hold: true
      },
      [DataCategory.METADATA]: {
        duration: 90,
        autoDelete: true,
        archiveAfter: 30,
        legal_hold: false
      }
    };

    return policies[category];
  }

  private validatePrivacyPreferences(preferences: PrivacyPreferences): void {
    if (preferences.dataRetentionDays < 0 || preferences.dataRetentionDays > 2555) {
      throw new Error('Invalid data retention period');
    }
  }

  // Storage methods (would be implemented with actual storage backend)
  private async storeSession(user: UserIdentity): Promise<void> {
    const encrypted = this.encryptData(user);
    localStorage.setItem(`session_${user.sessionToken}`, encrypted);
  }

  private async retrieveSession(token: string): Promise<UserIdentity | null> {
    const encrypted = localStorage.getItem(`session_${token}`);
    if (!encrypted) return null;
    
    try {
      return this.decryptData(encrypted);
    } catch (error) {
      return null;
    }
  }

  private async invalidateSession(token: string): Promise<void> {
    localStorage.removeItem(`session_${token}`);
  }

  private async storePrivacyPreferences(userId: string, preferences: string): Promise<void> {
    localStorage.setItem(`privacy_${userId}`, preferences);
  }

  private async retrievePrivacyPreferences(userId: string): Promise<string | null> {
    return localStorage.getItem(`privacy_${userId}`);
  }

  private async persistAuditLog(log: AuditLog): Promise<void> {
    // In production, this would send to a secure audit service
    console.log('Audit log:', log);
  }

  private async alertSecurityTeam(log: AuditLog): Promise<void> {
    // In production, this would send alerts to security team
    console.warn('High-risk activity detected:', log);
  }

  private async validateCredentials(credentials: { email: string; password: string }): Promise<UserIdentity> {
    // Mock implementation - in production would validate against backend
    return {
      id: 'user_123',
      email: credentials.email,
      name: 'Demo User',
      role: UserRole.STUDENT,
      permissions: [Permission.RECORD_LECTURE, Permission.VIEW_LECTURE, Permission.TRANSCRIBE_AUDIO],
      sessionToken: '',
      sessionExpiry: new Date(),
      lastActivity: new Date(),
      ipAddress: '',
      userAgent: ''
    };
  }

  // Public API methods
  getCurrentUser(): UserIdentity | null {
    return this.currentUser;
  }

  async logout(): Promise<void> {
    if (this.currentUser) {
      await this.auditAction(AuditAction.LOGOUT, 'authentication', {
        userId: this.currentUser.id,
        sessionDuration: Date.now() - this.currentUser.lastActivity.getTime()
      });

      await this.invalidateSession(this.currentUser.sessionToken);
      this.currentUser = null;
    }
  }

  getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  getConsentRecords(userId: string): ConsentRecord[] {
    return this.consentRecords.get(userId) || [];
  }

  isSecurityCompliant(): boolean {
    return this.config.requireSecureContext && window.isSecureContext;
  }

  dispose(): void {
    this.auditLogs = [];
    this.consentRecords.clear();
    this.rateLimitTracker.clear();
    this.currentUser = null;
  }
}

// Factory function for creating security manager
export function createSecurityManager(config?: Partial<SecurityConfig>): SecurityManager {
  return new SecurityManager(config);
}

// Singleton instance
let securityManagerInstance: SecurityManager | null = null;

export function getSecurityManager(): SecurityManager {
  if (!securityManagerInstance) {
    securityManagerInstance = createSecurityManager();
  }
  return securityManagerInstance;
}