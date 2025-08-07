import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import pdfAnalysisImage from "@/assets/pdf-analysis.jpg";
import liveLectureImage from "@/assets/live-lecture.jpg";
import analyticsImage from "@/assets/analytics.jpg";

const FeatureSection = () => {
  const features = [
    {
      title: "Smart PDF Analysis",
      subtitle: "OMNIMEET SMARTER",
      description: "Get instant insights from any document with AI-powered analysis",
      features: [
        "Contextual question answering from documents",
        "Smart highlighting and annotation tools", 
        "Multi-document cross-referencing",
        "Automatic summary generation"
      ],
      image: pdfAnalysisImage,
      imageAlt: "PDF analysis interface showing document insights"
    },
    {
      title: "Live Lecture AI",
      subtitle: "OMNIMEET FASTER", 
      description: "Transform live lectures with real-time AI assistance",
      features: [
        "Real-time transcription and note-taking",
        "Contextual AI chatbot during lectures",
        "Auto-chapter segmentation",
        "Knowledge retention tracking"
      ],
      image: liveLectureImage,
      imageAlt: "Live lecture interface with AI assistance"
    },
    {
      title: "Learning Analytics",
      subtitle: "OMNIMEET BEYOND",
      description: "Track progress and optimize your learning journey",
      features: [
        "Personalized learning path generation",
        "Progress tracking dashboard", 
        "Exam preparation assistance",
        "Study time optimization"
      ],
      image: analyticsImage,
      imageAlt: "Learning analytics dashboard"
    }
  ];

  return (
    <section className="py-24 bg-gradient-primary relative">
      <div className="container mx-auto px-6">
        {features.map((feature, index) => (
          <div key={index} className="mb-32 last:mb-0">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Content */}
              <div className={`space-y-8 ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="space-y-4">
                  <div className="text-sm font-semibold text-accent tracking-wider uppercase">
                    {feature.subtitle}
                  </div>
                  <h2 className="text-4xl lg:text-5xl font-bold text-accent leading-tight">
                    {feature.title}
                  </h2>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Feature List */}
                <div className="space-y-4">
                  {feature.features.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                      <span className="text-foreground leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>

                <Button variant="accent" size="lg" className="rounded-xl">
                  Try Free →
                </Button>
              </div>

              {/* Image */}
              <div className={`relative ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <Card className="p-0 overflow-hidden bg-card/50 backdrop-blur-sm border-border/50">
                  <img 
                    src={feature.image} 
                    alt={feature.imageAlt}
                    className="w-full h-auto object-cover"
                  />
                </Card>
                
                {/* Decorative elements */}
                <div className={`absolute w-20 h-20 bg-accent/20 rounded-full blur-xl animate-glow-pulse ${
                  index % 2 === 0 ? '-top-4 -right-4' : '-top-4 -left-4'
                }`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeatureSection;