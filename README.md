# Omnimeet Live Lecture System

A revolutionary educational technology platform featuring advanced WebRTC screen recording, real-time transcription with AssemblyAI, and AI-powered learning insights. This comprehensive system transforms passive learning into an interactive, intelligent educational experience.

## 🚀 Key Features

### WebRTC Screen Recording
- **Multiple Capture Modes**: Full screen, specific window, or custom area selection
- **High-Quality Recording**: Support for 720p to 4K recording with customizable bitrates
- **Real-time Controls**: Start, pause, resume, and stop recording with intuitive UI
- **Cross-browser Compatibility**: Works across all modern browsers with fallback mechanisms
- **Local & Cloud Storage**: Save recordings locally or upload to secure cloud storage

### Advanced Live Transcription
- **AssemblyAI Integration**: Industry-leading speech-to-text with 95%+ accuracy
- **Real-time Processing**: Live transcription with minimal latency
- **Multi-language Support**: Support for 8+ languages including English, Spanish, French, German, Hindi, Chinese, Japanese, and Korean
- **Speaker Identification**: Automatic speaker labeling and confidence scoring
- **Intelligent Segmentation**: Timestamp-based transcript organization

### AI-Powered Learning Insights
- **Real-time Analysis**: Live detection of confusion indicators, engagement patterns, and learning velocity
- **Comprehension Scoring**: Automated assessment of understanding based on multiple factors
- **Adaptive Recommendations**: Personalized learning suggestions based on performance
- **Concept Mapping**: Automatic extraction and mastery tracking of educational concepts
- **Predictive Analytics**: Retention prediction and knowledge gap identification

### Security & Privacy
- **End-to-end Encryption**: AES encryption for all sensitive data
- **GDPR Compliance**: Comprehensive privacy controls and consent management
- **Audit Logging**: Complete activity tracking with risk assessment
- **Permission Management**: Role-based access control with granular permissions
- **Data Anonymization**: Automatic PII detection and anonymization

## 🏗️ Architecture

### Frontend Components
```
src/
├── pages/
│   └── LiveLecture.tsx          # Main lecture interface
├── lib/
│   ├── webrtc.ts               # WebRTC recording manager
│   ├── transcription.ts        # AssemblyAI integration
│   ├── learning-insights.ts    # AI analysis engine
│   ├── backend-api.ts          # Backend communication
│   ├── compatibility.ts        # Browser compatibility
│   └── security.ts             # Security & privacy
└── components/
    └── ui/                     # Reusable UI components
```

### Backend Services
- **Recording Microservice**: WebRTC-compatible recording processing
- **Transcription Service**: AssemblyAI streaming integration
- **Analytics Engine**: Real-time learning insights generation
- **Storage Service**: Secure file upload and management
- **User Management**: Authentication and permission handling

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn
- Modern browser with WebRTC support
- HTTPS environment (required for screen capture)
- AssemblyAI API key

### Installation

1. **Clone and Install Dependencies**
```bash
git clone <repository>
cd omnimeet-live-lecture
npm install
```

2. **Environment Configuration**
Create a `.env` file with:
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ASSEMBLYAI_KEY=888ba8002c7a46499cf80c50a29c74fd
REACT_APP_ENV=development
```

3. **Development Server**
```bash
npm run dev
```

4. **Production Build**
```bash
npm run build
npm run preview
```

## 📖 Usage Guide

### Starting a Live Lecture

1. **Navigate to Live Lecture**: Go to `/live-lecture` in your browser
2. **Configure Settings**:
   - Select capture mode (screen/window/area)
   - Choose video quality (720p to 4K)
   - Set language for transcription
   - Enable/disable microphone and system audio
3. **Start Recording**: Click "Start Recording" to begin
4. **Monitor Status**: Watch real-time connection indicators and session duration

### During Recording

- **Real-time Transcription**: View live speech-to-text conversion
- **Mark Important Moments**: Click "Mark Important" for key concepts
- **AI Insights**: Monitor live learning analytics and recommendations
- **Pause/Resume**: Control recording as needed
- **Quality Monitoring**: Check connection status and recording quality

### After Recording

- **Download Recording**: Save video file locally
- **Export Session Data**: Export transcripts and metadata as JSON
- **Review Analytics**: Analyze comprehension scores and learning metrics
- **Access Transcripts**: Search and review timestamped transcripts

## 🔧 API Configuration

### AssemblyAI Setup
The system uses AssemblyAI for real-time transcription:

```typescript
const transcriptionConfig = {
  apiKey: "888ba8002c7a46499cf80c50a29c74fd",
  language: "en",
  sampleRate: 16000,
  punctuate: true,
  formatText: true,
  speakerLabels: true,
  confidenceThreshold: 0.6
};
```

### WebRTC Configuration
Recording settings can be customized:

```typescript
const captureOptions = {
  captureMode: "screen", // "screen" | "window" | "area"
  videoQuality: "medium", // "low" | "medium" | "high" | "ultra"
  frameRate: 30,
  audioBitrate: 128000,
  videoBitrate: 2500000,
  includeMicrophone: true,
  includeSystemAudio: true
};
```

## 🛡️ Security Features

### Data Protection
- **Encryption**: All sensitive data encrypted with AES-256
- **Secure Storage**: Local encryption with secure key management
- **HTTPS Only**: Requires secure context for all operations
- **CSRF Protection**: Built-in cross-site request forgery protection

### Privacy Controls
- **Consent Management**: Granular consent for different data types
- **Data Retention**: Configurable retention policies
- **Right to Erasure**: Complete data deletion capabilities
- **Anonymization**: Automatic PII detection and masking

### Access Control
```typescript
enum Permission {
  RECORD_LECTURE = 'record_lecture',
  VIEW_LECTURE = 'view_lecture', 
  TRANSCRIBE_AUDIO = 'transcribe_audio',
  EXPORT_DATA = 'export_data',
  ACCESS_ANALYTICS = 'access_analytics'
}
```

## 🔍 Browser Compatibility

### Supported Browsers
- **Chrome 88+**: Full feature support
- **Firefox 85+**: Full feature support  
- **Safari 14+**: Limited WebRTC support
- **Edge 88+**: Full feature support

### Fallback Mechanisms
- Automatic quality reduction for older browsers
- Polyfills for missing APIs
- Progressive enhancement for unsupported features
- Audio-only recording fallback

## 📊 Performance Metrics

### Target Performance
- **95%+ User Satisfaction** with recording experience
- **40% Reduction** in lecture review time
- **60% Improvement** in concept retention
- **75% Enhancement** in learning engagement

### System Requirements
- **Minimum**: 4GB RAM, modern browser
- **Recommended**: 8GB RAM, dedicated graphics
- **Network**: 10 Mbps upload for high-quality recording
- **Storage**: 1GB available space per hour of recording

## 🚨 Error Handling

### Comprehensive Error Management
- **Browser Compatibility**: Automatic detection and fallback
- **Network Issues**: Retry mechanisms with exponential backoff
- **Permission Errors**: Clear user guidance for resolution
- **Hardware Problems**: Device detection and alternative options

### Recovery Strategies
```typescript
const errorRecovery = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  fallbackStrategies: [
    'quality_reduction',
    'audio_only', 
    'basic_recording'
  ]
};
```

## 🔬 Advanced Features

### Learning Analytics
- **Engagement Tracking**: Real-time attention measurement
- **Comprehension Analysis**: Understanding assessment algorithms
- **Retention Prediction**: Machine learning-based retention forecasting
- **Adaptive Learning**: Personalized recommendation engine

### AI Insights
- **Confusion Detection**: Automatic identification of learning difficulties
- **Concept Extraction**: Educational keyword and topic identification  
- **Question Opportunities**: Prompts for interactive moments
- **Learning Patterns**: Behavioral analysis and optimization

## 🧪 Development

### Code Structure
```
Live Lecture System
├── WebRTC Recording Engine
├── AssemblyAI Transcription
├── Learning Insights AI
├── Security & Privacy Layer
├── Error Handling System
└── Cross-browser Compatibility
```

### Testing
```bash
npm run test              # Run unit tests
npm run test:integration  # Integration tests  
npm run test:e2e         # End-to-end tests
npm run lint             # Code quality checks
```

### Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

For support, email support@omnimeet.com or join our [Discord community](https://discord.gg/omnimeet).

## 🙏 Acknowledgments

- **AssemblyAI** for providing industry-leading speech-to-text capabilities
- **WebRTC Community** for open-source real-time communication standards
- **React & TypeScript** communities for excellent development tools
- **shadcn/ui** for beautiful, accessible UI components

---

**Built with ❤️ for the future of education**