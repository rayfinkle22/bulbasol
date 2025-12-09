import { Header } from "@/components/Header";
import { SnailGame } from "@/components/SnailGame";
import { Footer } from "@/components/Footer";
import { FloatingLeaves } from "@/components/FloatingLeaves";

const LegacyGame = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <FloatingLeaves />
      <Header />
      <main className="flex-1 relative z-10">
        <div className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-muted/50 border-2 border-muted-foreground/30 rounded-xl p-4 mb-8">
              <h1 className="font-display text-2xl text-muted-foreground mb-2">🎮 Legacy Game</h1>
              <p className="font-body text-muted-foreground">
                This is the original 2D top-down version of Snail Shooter. 
                Check out the new 3D version on the home page!
              </p>
            </div>
          </div>
        </div>
        <SnailGame />
      </main>
      <Footer />
    </div>
  );
};

export default LegacyGame;
