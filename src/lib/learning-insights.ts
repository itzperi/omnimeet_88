import { TranscriptSegment } from './webrtc';
import { TranscriptionSession } from './transcription';
import { LearningInsight, InsightType } from './backend-api';

export interface LearningPattern {
  id: string;
  type: PatternType;
  confidence: number;
  frequency: number;
  description: string;
  recommendations: string[];
  relatedSegments: string[];
}

export enum PatternType {
  CONFUSION_INDICATOR = 'confusion_indicator',
  ENGAGEMENT_PEAK = 'engagement_peak',
  KNOWLEDGE_GAP = 'knowledge_gap',
  CONCEPT_MASTERY = 'concept_mastery',
  QUESTION_PATTERN = 'question_pattern',
  LEARNING_VELOCITY = 'learning_velocity'
}

export interface ConceptMap {
  id: string;
  name: string;
  confidence: number;
  prerequisites: string[];
  relatedConcepts: string[];
  masteryLevel: number;
  firstMentioned: number;
  totalMentions: number;
  contexts: ConceptContext[];
}

export interface ConceptContext {
  segmentId: string;
  timestamp: number;
  context: string;
  sentiment: number;
  importance: number;
}

export interface LearningMetrics {
  sessionId: string;
  comprehensionScore: number;
  engagementLevel: number;
  learningVelocity: number;
  retentionPrediction: number;
  conceptMastery: ConceptMap[];
  identifiedGaps: string[];
  recommendations: LearningRecommendation[];
}

export interface LearningRecommendation {
  id: string;
  type: RecommendationType;
  priority: Priority;
  title: string;
  description: string;
  actionItems: string[];
  estimatedTime: number;
  difficulty: number;
  relatedConcepts: string[];
}

export enum RecommendationType {
  REVIEW_CONCEPT = 'review_concept',
  PRACTICE_EXERCISE = 'practice_exercise',
  SUPPLEMENTARY_MATERIAL = 'supplementary_material',
  CLARIFICATION_NEEDED = 'clarification_needed',
  ADVANCED_TOPIC = 'advanced_topic',
  PREREQUISITE_REVIEW = 'prerequisite_review'
}

export enum Priority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export interface AdaptiveLearningProfile {
  userId: string;
  learningStyle: LearningStyle;
  preferredPace: LearningPace;
  strengthAreas: string[];
  improvementAreas: string[];
  historicalPerformance: PerformanceMetric[];
  personalizedRecommendations: LearningRecommendation[];
}

export enum LearningStyle {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  KINESTHETIC = 'kinesthetic',
  READING_WRITING = 'reading_writing',
  MULTIMODAL = 'multimodal'
}

export enum LearningPace {
  SLOW = 'slow',
  MODERATE = 'moderate',
  FAST = 'fast',
  ADAPTIVE = 'adaptive'
}

export interface PerformanceMetric {
  timestamp: Date;
  sessionId: string;
  subject: string;
  score: number;
  timeSpent: number;
  accuracy: number;
}

export class LearningInsightsService {
  private knowledgeBase: Map<string, ConceptMap> = new Map();
  private learningPatterns: LearningPattern[] = [];
  private userProfile: AdaptiveLearningProfile | null = null;

  // Initialize the service with user profile
  async initialize(userId: string): Promise<void> {
    try {
      // In a real implementation, this would load from backend
      this.userProfile = await this.loadUserProfile(userId);
      await this.loadKnowledgeBase();
    } catch (error) {
      console.error('Failed to initialize learning insights service:', error);
    }
  }

  // Analyze transcription session for learning insights
  async analyzeSession(session: TranscriptionSession): Promise<LearningMetrics> {
    try {
      const segments = session.segments;
      const concepts = await this.extractConcepts(segments);
      const patterns = await this.identifyLearningPatterns(segments);
      const comprehension = this.calculateComprehensionScore(segments, concepts);
      const engagement = this.calculateEngagementLevel(segments);
      const velocity = this.calculateLearningVelocity(segments, concepts);
      const retention = this.predictRetention(concepts, engagement, comprehension);
      const gaps = this.identifyKnowledgeGaps(concepts);
      const recommendations = await this.generateRecommendations(concepts, gaps, patterns);

      return {
        sessionId: session.id,
        comprehensionScore: comprehension,
        engagementLevel: engagement,
        learningVelocity: velocity,
        retentionPrediction: retention,
        conceptMastery: concepts,
        identifiedGaps: gaps,
        recommendations
      };
    } catch (error) {
      console.error('Error analyzing session:', error);
      throw error;
    }
  }

  // Extract concepts from transcript segments
  private async extractConcepts(segments: TranscriptSegment[]): Promise<ConceptMap[]> {
    const conceptMap = new Map<string, ConceptMap>();
    const educationalKeywords = this.getEducationalKeywords();

    for (const segment of segments) {
      const words = segment.text.toLowerCase().split(/\s+/);
      const concepts = this.identifyConceptsInText(words, educationalKeywords);

      for (const concept of concepts) {
        if (conceptMap.has(concept.name)) {
          const existing = conceptMap.get(concept.name)!;
          existing.totalMentions++;
          existing.contexts.push({
            segmentId: segment.id,
            timestamp: segment.timestamp,
            context: segment.text,
            sentiment: this.analyzeSentiment(segment.text),
            importance: segment.isImportant ? 1.0 : 0.5
          });
          existing.confidence = Math.min(1.0, existing.confidence + 0.1);
        } else {
          conceptMap.set(concept.name, {
            id: this.generateConceptId(concept.name),
            name: concept.name,
            confidence: concept.confidence,
            prerequisites: [],
            relatedConcepts: [],
            masteryLevel: this.calculateInitialMastery(concept, segment),
            firstMentioned: segment.timestamp,
            totalMentions: 1,
            contexts: [{
              segmentId: segment.id,
              timestamp: segment.timestamp,
              context: segment.text,
              sentiment: this.analyzeSentiment(segment.text),
              importance: segment.isImportant ? 1.0 : 0.5
            }]
          });
        }
      }
    }

    return Array.from(conceptMap.values());
  }

  // Identify learning patterns in the session
  private async identifyLearningPatterns(segments: TranscriptSegment[]): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    // Pattern 1: Confusion indicators (repeated questions, uncertainty phrases)
    const confusionPattern = this.detectConfusionPattern(segments);
    if (confusionPattern) patterns.push(confusionPattern);

    // Pattern 2: Engagement peaks (exclamations, positive sentiment)
    const engagementPattern = this.detectEngagementPattern(segments);
    if (engagementPattern) patterns.push(engagementPattern);

    // Pattern 3: Question patterns
    const questionPattern = this.detectQuestionPattern(segments);
    if (questionPattern) patterns.push(questionPattern);

    // Pattern 4: Learning velocity changes
    const velocityPattern = this.detectVelocityPattern(segments);
    if (velocityPattern) patterns.push(velocityPattern);

    this.learningPatterns = patterns;
    return patterns;
  }

  // Calculate comprehension score based on various factors
  private calculateComprehensionScore(segments: TranscriptSegment[], concepts: ConceptMap[]): number {
    let score = 0.5; // Base score

    // Factor 1: Confidence in transcription
    const avgConfidence = segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length;
    score += (avgConfidence - 0.5) * 0.3;

    // Factor 2: Concept mastery
    const avgMastery = concepts.reduce((sum, concept) => sum + concept.masteryLevel, 0) / Math.max(concepts.length, 1);
    score += avgMastery * 0.4;

    // Factor 3: Question-to-statement ratio (lower ratio = better comprehension)
    const questionCount = segments.filter(seg => seg.text.includes('?')).length;
    const questionRatio = questionCount / segments.length;
    score += Math.max(0, (0.2 - questionRatio)) * 2; // Bonus for fewer questions

    // Factor 4: Important moments marked
    const importantCount = segments.filter(seg => seg.isImportant).length;
    const importantRatio = importantCount / segments.length;
    score += importantRatio * 0.3;

    return Math.max(0, Math.min(1, score));
  }

  // Calculate engagement level
  private calculateEngagementLevel(segments: TranscriptSegment[]): number {
    let engagement = 0;

    // Factor 1: Speaking frequency and duration
    const avgSegmentLength = segments.reduce((sum, seg) => sum + seg.text.length, 0) / segments.length;
    engagement += Math.min(1, avgSegmentLength / 100) * 0.3;

    // Factor 2: Emotional indicators
    const positiveWords = ['great', 'excellent', 'interesting', 'amazing', 'wow', 'cool'];
    const negativeWords = ['boring', 'difficult', 'confused', 'hard', 'unclear'];
    
    let positiveCount = 0;
    let negativeCount = 0;

    segments.forEach(seg => {
      const words = seg.text.toLowerCase().split(/\s+/);
      positiveCount += words.filter(word => positiveWords.includes(word)).length;
      negativeCount += words.filter(word => negativeWords.includes(word)).length;
    });

    const sentimentScore = (positiveCount - negativeCount) / Math.max(segments.length, 1);
    engagement += Math.max(0, Math.min(1, sentimentScore + 0.5)) * 0.4;

    // Factor 3: Interactive elements (questions asked)
    const interactionCount = segments.filter(seg => 
      seg.text.includes('?') || seg.text.toLowerCase().includes('what') || 
      seg.text.toLowerCase().includes('how') || seg.text.toLowerCase().includes('why')
    ).length;
    const interactionRatio = interactionCount / segments.length;
    engagement += Math.min(1, interactionRatio * 3) * 0.3;

    return Math.max(0, Math.min(1, engagement));
  }

  // Calculate learning velocity
  private calculateLearningVelocity(segments: TranscriptSegment[], concepts: ConceptMap[]): number {
    if (segments.length === 0 || concepts.length === 0) return 0;

    const sessionDuration = segments[segments.length - 1].timestamp - segments[0].timestamp;
    const conceptsPerMinute = (concepts.length / (sessionDuration / 60000)) || 0;
    
    // Normalize to 0-1 scale (assuming 2 concepts per minute is high velocity)
    return Math.min(1, conceptsPerMinute / 2);
  }

  // Predict retention based on various factors
  private predictRetention(concepts: ConceptMap[], engagement: number, comprehension: number): number {
    let retention = 0.4; // Base retention

    // Factor 1: Comprehension score
    retention += comprehension * 0.3;

    // Factor 2: Engagement level
    retention += engagement * 0.2;

    // Factor 3: Concept mastery depth
    const avgMastery = concepts.reduce((sum, concept) => sum + concept.masteryLevel, 0) / Math.max(concepts.length, 1);
    retention += avgMastery * 0.3;

    // Factor 4: Repetition and context diversity
    const avgContexts = concepts.reduce((sum, concept) => sum + concept.contexts.length, 0) / Math.max(concepts.length, 1);
    retention += Math.min(0.2, avgContexts / 10);

    return Math.max(0, Math.min(1, retention));
  }

  // Identify knowledge gaps
  private identifyKnowledgeGaps(concepts: ConceptMap[]): string[] {
    const gaps: string[] = [];

    concepts.forEach(concept => {
      // Gap 1: Low mastery level
      if (concept.masteryLevel < 0.6) {
        gaps.push(`Low mastery of concept: ${concept.name}`);
      }

      // Gap 2: Negative sentiment in contexts
      const avgSentiment = concept.contexts.reduce((sum, ctx) => sum + ctx.sentiment, 0) / concept.contexts.length;
      if (avgSentiment < -0.3) {
        gaps.push(`Negative sentiment towards: ${concept.name}`);
      }

      // Gap 3: Prerequisites not mentioned
      if (concept.prerequisites.length > 0) {
        const mentionedPrereqs = concept.prerequisites.filter(prereq => 
          concepts.some(c => c.name.toLowerCase().includes(prereq.toLowerCase()))
        );
        if (mentionedPrereqs.length < concept.prerequisites.length) {
          gaps.push(`Missing prerequisites for: ${concept.name}`);
        }
      }
    });

    return gaps;
  }

  // Generate personalized learning recommendations
  private async generateRecommendations(
    concepts: ConceptMap[], 
    gaps: string[], 
    patterns: LearningPattern[]
  ): Promise<LearningRecommendation[]> {
    const recommendations: LearningRecommendation[] = [];

    // Recommendation 1: Address knowledge gaps
    gaps.forEach((gap, index) => {
      recommendations.push({
        id: `gap_${index}`,
        type: RecommendationType.CLARIFICATION_NEEDED,
        priority: Priority.HIGH,
        title: `Address Knowledge Gap`,
        description: gap,
        actionItems: [
          'Review related materials',
          'Ask clarifying questions',
          'Practice with examples'
        ],
        estimatedTime: 15,
        difficulty: 3,
        relatedConcepts: this.extractConceptsFromGap(gap, concepts)
      });
    });

    // Recommendation 2: Reinforce well-understood concepts
    const masteredConcepts = concepts.filter(c => c.masteryLevel > 0.8);
    if (masteredConcepts.length > 0) {
      recommendations.push({
        id: 'reinforce_mastered',
        type: RecommendationType.ADVANCED_TOPIC,
        priority: Priority.MEDIUM,
        title: 'Explore Advanced Applications',
        description: `You've mastered ${masteredConcepts.map(c => c.name).join(', ')}. Consider exploring advanced applications.`,
        actionItems: [
          'Look for real-world applications',
          'Explore related advanced topics',
          'Create practice scenarios'
        ],
        estimatedTime: 30,
        difficulty: 4,
        relatedConcepts: masteredConcepts.map(c => c.name)
      });
    }

    // Recommendation 3: Practice exercises for moderate mastery
    const practiceNeeded = concepts.filter(c => c.masteryLevel >= 0.4 && c.masteryLevel <= 0.7);
    if (practiceNeeded.length > 0) {
      recommendations.push({
        id: 'practice_exercises',
        type: RecommendationType.PRACTICE_EXERCISE,
        priority: Priority.MEDIUM,
        title: 'Practice Key Concepts',
        description: `Practice exercises for: ${practiceNeeded.map(c => c.name).join(', ')}`,
        actionItems: [
          'Complete practice problems',
          'Work through examples',
          'Test understanding with quizzes'
        ],
        estimatedTime: 20,
        difficulty: 2,
        relatedConcepts: practiceNeeded.map(c => c.name)
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  // Real-time insights generation during recording
  async generateRealTimeInsights(currentSegments: TranscriptSegment[]): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];
    const recentSegments = currentSegments.slice(-5); // Last 5 segments

    // Insight 1: Confusion detection
    const confusionIndicators = ['i don\'t understand', 'confused', 'what does', 'unclear'];
    const hasConfusion = recentSegments.some(seg => 
      confusionIndicators.some(indicator => seg.text.toLowerCase().includes(indicator))
    );

    if (hasConfusion) {
      insights.push({
        id: `confusion_${Date.now()}`,
        sessionId: 'current',
        type: InsightType.KNOWLEDGE_GAP,
        title: 'Confusion Detected',
        description: 'Recent statements suggest confusion. Consider pausing for clarification.',
        confidence: 0.8,
        timestamp: new Date(),
        metadata: { trigger: 'confusion_keywords' }
      });
    }

    // Insight 2: High engagement
    const engagementWords = ['interesting', 'amazing', 'wow', 'great', 'excellent'];
    const hasEngagement = recentSegments.some(seg =>
      engagementWords.some(word => seg.text.toLowerCase().includes(word))
    );

    if (hasEngagement) {
      insights.push({
        id: `engagement_${Date.now()}`,
        sessionId: 'current',
        type: InsightType.ENGAGEMENT_PATTERN,
        title: 'High Engagement Detected',
        description: 'Excellent engagement! This might be a good moment for deeper exploration.',
        confidence: 0.9,
        timestamp: new Date(),
        metadata: { trigger: 'positive_sentiment' }
      });
    }

    // Insight 3: Question opportunity
    const hasQuestions = recentSegments.some(seg => seg.text.includes('?'));
    if (!hasQuestions && recentSegments.length >= 3) {
      insights.push({
        id: `question_opp_${Date.now()}`,
        sessionId: 'current',
        type: InsightType.QUESTION_OPPORTUNITY,
        title: 'Question Opportunity',
        description: 'No questions asked recently. Consider encouraging questions to check understanding.',
        confidence: 0.6,
        timestamp: new Date(),
        metadata: { trigger: 'no_recent_questions' }
      });
    }

    return insights;
  }

  // Helper methods
  private getEducationalKeywords(): string[] {
    return [
      'algorithm', 'function', 'variable', 'loop', 'condition', 'array', 'object',
      'method', 'class', 'inheritance', 'polymorphism', 'abstraction', 'encapsulation',
      'database', 'query', 'table', 'index', 'normalization', 'transaction',
      'network', 'protocol', 'http', 'tcp', 'ip', 'dns', 'server', 'client',
      'security', 'encryption', 'authentication', 'authorization', 'vulnerability'
    ];
  }

  private identifyConceptsInText(words: string[], keywords: string[]): Array<{name: string, confidence: number}> {
    const concepts: Array<{name: string, confidence: number}> = [];
    
    keywords.forEach(keyword => {
      if (words.includes(keyword.toLowerCase())) {
        concepts.push({
          name: keyword,
          confidence: 0.8
        });
      }
    });

    return concepts;
  }

  private calculateInitialMastery(concept: {name: string, confidence: number}, segment: TranscriptSegment): number {
    let mastery = concept.confidence * 0.5; // Base on concept confidence
    
    // Boost if marked as important
    if (segment.isImportant) mastery += 0.2;
    
    // Boost if segment has high confidence
    if (segment.confidence > 0.8) mastery += 0.1;
    
    return Math.min(1, mastery);
  }

  private analyzeSentiment(text: string): number {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'difficult', 'hard', 'confusing'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    return Math.max(-1, Math.min(1, score / words.length));
  }

  private detectConfusionPattern(segments: TranscriptSegment[]): LearningPattern | null {
    const confusionIndicators = ['confused', 'don\'t understand', 'unclear', 'what', 'how'];
    const confusionSegments = segments.filter(seg =>
      confusionIndicators.some(indicator => seg.text.toLowerCase().includes(indicator))
    );

    if (confusionSegments.length >= 2) {
      return {
        id: `confusion_${Date.now()}`,
        type: PatternType.CONFUSION_INDICATOR,
        confidence: 0.8,
        frequency: confusionSegments.length / segments.length,
        description: 'Multiple confusion indicators detected',
        recommendations: [
          'Pause for clarification',
          'Review previous concepts',
          'Use simpler explanations'
        ],
        relatedSegments: confusionSegments.map(s => s.id)
      };
    }

    return null;
  }

  private detectEngagementPattern(segments: TranscriptSegment[]): LearningPattern | null {
    const engagementWords = ['wow', 'amazing', 'interesting', 'cool', 'great'];
    const engagementSegments = segments.filter(seg =>
      engagementWords.some(word => seg.text.toLowerCase().includes(word))
    );

    if (engagementSegments.length >= 2) {
      return {
        id: `engagement_${Date.now()}`,
        type: PatternType.ENGAGEMENT_PEAK,
        confidence: 0.9,
        frequency: engagementSegments.length / segments.length,
        description: 'High engagement pattern detected',
        recommendations: [
          'Capitalize on engagement',
          'Introduce related concepts',
          'Encourage deeper exploration'
        ],
        relatedSegments: engagementSegments.map(s => s.id)
      };
    }

    return null;
  }

  private detectQuestionPattern(segments: TranscriptSegment[]): LearningPattern | null {
    const questionSegments = segments.filter(seg => seg.text.includes('?'));
    
    if (questionSegments.length >= 3) {
      return {
        id: `questions_${Date.now()}`,
        type: PatternType.QUESTION_PATTERN,
        confidence: 0.7,
        frequency: questionSegments.length / segments.length,
        description: 'Active questioning pattern detected',
        recommendations: [
          'Encourage continued questioning',
          'Provide comprehensive answers',
          'Build on curiosity'
        ],
        relatedSegments: questionSegments.map(s => s.id)
      };
    }

    return null;
  }

  private detectVelocityPattern(segments: TranscriptSegment[]): LearningPattern | null {
    if (segments.length < 5) return null;

    const recentSegments = segments.slice(-5);
    const earlierSegments = segments.slice(0, 5);

    const recentAvgLength = recentSegments.reduce((sum, seg) => sum + seg.text.length, 0) / recentSegments.length;
    const earlierAvgLength = earlierSegments.reduce((sum, seg) => sum + seg.text.length, 0) / earlierSegments.length;

    const velocityChange = (recentAvgLength - earlierAvgLength) / earlierAvgLength;

    if (Math.abs(velocityChange) > 0.3) {
      return {
        id: `velocity_${Date.now()}`,
        type: PatternType.LEARNING_VELOCITY,
        confidence: 0.6,
        frequency: 1,
        description: velocityChange > 0 ? 'Learning velocity increasing' : 'Learning velocity decreasing',
        recommendations: velocityChange > 0 ? 
          ['Maintain momentum', 'Introduce challenging concepts'] :
          ['Slow down pace', 'Review recent concepts', 'Check understanding'],
        relatedSegments: recentSegments.map(s => s.id)
      };
    }

    return null;
  }

  private extractConceptsFromGap(gap: string, concepts: ConceptMap[]): string[] {
    return concepts
      .filter(concept => gap.toLowerCase().includes(concept.name.toLowerCase()))
      .map(concept => concept.name);
  }

  private generateConceptId(conceptName: string): string {
    return `concept_${conceptName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  }

  private async loadUserProfile(userId: string): Promise<AdaptiveLearningProfile> {
    // In a real implementation, this would load from backend
    return {
      userId,
      learningStyle: LearningStyle.MULTIMODAL,
      preferredPace: LearningPace.ADAPTIVE,
      strengthAreas: [],
      improvementAreas: [],
      historicalPerformance: [],
      personalizedRecommendations: []
    };
  }

  private async loadKnowledgeBase(): Promise<void> {
    // In a real implementation, this would load from backend
    this.knowledgeBase.clear();
  }

  // Public API methods
  getUserProfile(): AdaptiveLearningProfile | null {
    return this.userProfile;
  }

  getLearningPatterns(): LearningPattern[] {
    return this.learningPatterns;
  }

  getKnowledgeBase(): ConceptMap[] {
    return Array.from(this.knowledgeBase.values());
  }

  dispose(): void {
    this.knowledgeBase.clear();
    this.learningPatterns = [];
    this.userProfile = null;
  }
}