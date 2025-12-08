import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { SnailGame } from "@/components/SnailGame";
import { DexChart } from "@/components/DexChart";
import { Footer } from "@/components/Footer";
import { FloatingLeaves } from "@/components/FloatingLeaves";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <FloatingLeaves />
      <Header />
      <main className="flex-1 relative z-10">
        <HeroSection />
        <SnailGame />
        <DexChart />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
