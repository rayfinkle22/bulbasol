import snailImage from "@/assets/snail.png";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[50vh] flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-10 left-10 w-16 h-16 rounded-full bg-accent/20 animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute top-20 right-16 w-12 h-12 rounded-full bg-primary/20 animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-16 left-1/4 w-10 h-10 rounded-full bg-accent/20 animate-float" style={{ animationDelay: '2s' }} />
      
      {/* Main content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* Hero banner placeholder with snail */}
        <div className="mb-6 relative">
          <div className="w-full max-w-md mx-auto aspect-video rounded-2xl retro-border bg-gradient-to-b from-sky-300 to-primary/30 flex items-center justify-center overflow-hidden">
            <div className="text-center p-4">
              <img 
                src={snailImage} 
                alt="Snail from Franklin" 
                className="w-32 h-32 sm:w-40 sm:h-40 object-contain mx-auto animate-wiggle drop-shadow-lg"
              />
              <p className="text-foreground/60 font-body text-sm mt-2">Hero Banner Coming Soon</p>
            </div>
          </div>
        </div>
        
        {/* Title with Franklin-style outline */}
        <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold text-accent text-outline mb-3">
          $SNAIL
        </h1>
        
        {/* Tagline */}
        <p className="font-body text-xl sm:text-2xl md:text-3xl text-foreground mb-6">
          Franklin's Best Friend on the Blockchain 🐢
        </p>
        
        {/* Catchphrase */}
        <p className="font-body text-lg text-muted-foreground italic">
          "Slow and steady wins the race... to the moon!" 🌙
        </p>
      </div>
    </section>
  );
};
