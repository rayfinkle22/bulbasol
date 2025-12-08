import { HeroSection } from "@/components/HeroSection";
import { SnailGame } from "@/components/SnailGame";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <HeroSection />
        <SnailGame />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
