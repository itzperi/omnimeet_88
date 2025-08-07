import { Button } from "@/components/ui/button";

const CallToAction = () => {
  return (
    <section className="py-24 bg-gradient-hero relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--accent)/0.1),transparent_70%)]" />
      
      <div className="container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-4xl lg:text-6xl font-bold leading-tight">
            Super-charge your 
            <span className="text-accent block">learning process!</span>
          </h2>
          
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Join thousands of students who have transformed their educational journey 
            with AI-powered learning assistance. Start your free trial today.
          </p>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8 py-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">40%</div>
              <div className="text-muted-foreground">Reduction in study time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">60%</div>
              <div className="text-muted-foreground">Improvement in exam scores</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">80%</div>
              <div className="text-muted-foreground">Increase in retention</div>
            </div>
          </div>

          <Button variant="accent" size="lg" className="text-lg px-12 py-6 rounded-xl animate-glow-pulse">
            Try Free
          </Button>

          <div className="pt-8">
            <blockquote className="text-lg italic text-muted-foreground">
              "This is like copilot for learning"
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;