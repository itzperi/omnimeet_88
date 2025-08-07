import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-dashboard.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(var(--accent)/0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,hsl(var(--primary)/0.1),transparent_50%)]" />
      
      <div className="container mx-auto px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Transform your 
                <span className="text-accent block">learning experience</span>
                with AI-powered assistance.
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Revolutionize how you interact with educational content through intelligent 
                real-time transcription, contextual Q&A, and smart learning analytics.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full" />
                <span className="text-foreground">Save thousands of hours in study time</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full" />
                <span className="text-foreground">Improve exam scores by 60%</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full" />
                <span className="text-foreground">Real-time AI assistance for any lecture</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="accent" 
                size="lg" 
                className="text-lg px-8 py-4 rounded-xl"
                onClick={() => navigate('/dashboard')}
              >
                Try Free
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4 rounded-xl">
                Learn More
              </Button>
            </div>

            {/* Quote */}
            <div className="pt-8">
              <blockquote className="text-lg italic text-muted-foreground">
                "This is like copilot for learning"
              </blockquote>
            </div>
          </div>

          {/* Right Content - Dashboard Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl animate-fade-in" style={{animationDelay: '0.2s'}}>
              <img 
                src={heroImage} 
                alt="OmniMeet AI-powered learning dashboard interface"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-accent/10 to-transparent" />
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-xl animate-glow-pulse" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/20 rounded-full blur-xl animate-glow-pulse" style={{animationDelay: '1s'}} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;