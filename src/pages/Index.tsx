import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { SnailGame } from "@/components/SnailGame";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <SnailGame />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
