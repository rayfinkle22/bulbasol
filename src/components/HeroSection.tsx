import heroBanner from "@/assets/hero-banner.png";

export const HeroSection = () => {
  return (
    <section className="relative flex flex-col items-center justify-center px-4 py-8 sm:py-12 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-10 left-10 w-16 h-16 rounded-full bg-accent/20 animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute top-20 right-16 w-12 h-12 rounded-full bg-primary/20 animate-float" style={{ animationDelay: '1s' }} />
      
      {/* Main content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto w-full">
        {/* Hero banner */}
        <div className="mb-6 relative">
          <div className="w-full max-w-2xl mx-auto rounded-2xl retro-border overflow-hidden">
            <img 
              src={heroBanner} 
              alt="Franklin and Snail - $SNAIL Token" 
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
        
        {/* Title with Franklin-style outline */}
        <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold text-accent text-outline mb-3">
          $SNAIL
        </h1>
        
        {/* Tagline */}
        <p className="font-body text-xl sm:text-2xl md:text-3xl text-foreground mb-4">
          Franklin&apos;s Best Friend on the Blockchain 🐢
        </p>
        
        {/* Catchphrase */}
        <p className="font-body text-lg text-muted-foreground italic">
          &quot;Slow and steady wins the race... to the moon!&quot; 🌙
        </p>
      </div>
    </section>
  );
};
