import { SocialLinks } from "./SocialLinks";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[60vh] flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-accent/10 animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute top-20 right-20 w-16 h-16 rounded-full bg-primary/10 animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-20 left-1/4 w-12 h-12 rounded-full bg-accent/10 animate-float" style={{ animationDelay: '2s' }} />
      
      {/* Main content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* Hero banner placeholder */}
        <div className="mb-8 relative">
          <div className="w-full max-w-2xl mx-auto aspect-video rounded-2xl retro-border bg-card/50 flex items-center justify-center overflow-hidden">
            <div className="text-center p-8">
              <div className="text-8xl mb-4 animate-wiggle">🐌</div>
              <p className="text-muted-foreground font-body text-lg">Hero Banner Coming Soon</p>
            </div>
          </div>
        </div>
        
        {/* Title */}
        <h1 className="font-display text-6xl md:text-8xl font-bold text-glow text-accent mb-4 animate-fade-in">
          $SNAIL
        </h1>
        
        {/* Tagline */}
        <p className="font-body text-2xl md:text-3xl text-foreground/80 mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          Franklin's Best Friend on the Blockchain
        </p>
        
        {/* Snail catchphrase */}
        <p className="font-body text-xl text-muted-foreground mb-10 animate-slide-up italic" style={{ animationDelay: '0.3s' }}>
          "Slow and steady wins the race... to the moon!" 🌙
        </p>
        
        {/* Social links */}
        <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <SocialLinks />
        </div>
      </div>
    </section>
  );
};
