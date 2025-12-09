import { Header } from "@/components/Header";
import { SnailGame3rdPerson } from "@/components/SnailGame3rdPerson";
import { Footer } from "@/components/Footer";
import { FloatingLeaves } from "@/components/FloatingLeaves";

const InTesting = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <FloatingLeaves />
      <Header />
      <main className="flex-1 relative z-10">
        <div className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-yellow-500/20 border-2 border-yellow-500 rounded-xl p-4 mb-8">
              <h1 className="font-display text-2xl text-yellow-500 mb-2">🧪 Testing Zone</h1>
              <p className="font-body text-muted-foreground">
                This is where new features are tested before going live. 
                The 3rd-person shooter version of Snail Shooter is currently in development!
              </p>
            </div>
          </div>
        </div>
        <SnailGame3rdPerson />
      </main>
      <Footer />
    </div>
  );
};

export default InTesting;
