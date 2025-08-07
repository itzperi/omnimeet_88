import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Navigation = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-lg">O</span>
            </div>
            <span className="text-xl font-bold text-foreground">OmniMeet</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            <Button 
              variant="nav" 
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </Button>
            <Button 
              variant="nav" 
              size="sm"
              onClick={() => navigate('/live-lecture')}
            >
              Live Lecture
            </Button>
            <Button 
              variant="nav" 
              size="sm"
              onClick={() => navigate('/video-assistance')}
            >
              Video Assistance
            </Button>
            <Button 
              variant="nav" 
              size="sm"
              onClick={() => navigate('/pdf-assistance')}
            >
              PDF Assistance
            </Button>
            <Button variant="nav" size="sm">
              Pricing & FAQ
            </Button>
          </div>

          {/* Sign In Button */}
          <Button variant="accent" size="sm" className="rounded-full">
            Sign In
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;