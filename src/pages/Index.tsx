import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { SnailGame3rdPerson } from "@/components/SnailGame3rdPerson";
import { DexChart } from "@/components/DexChart";
import { Footer } from "@/components/Footer";
import { FloatingLeaves } from "@/components/FloatingLeaves";
import { SnailChatbot } from "@/components/SnailChatbot";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <FloatingLeaves />
      <Header />
      <main className="flex-1 relative z-10">
        <HeroSection />
        <SnailGame3rdPerson />
        <DexChart />
      </main>
      <Footer />
      <SnailChatbot />
    </div>
  );
};

export default Index;
