import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Shield, Lock, Eye, Clock, Server, AlertTriangle } from "lucide-react";

const Security = () => {
  const securityFeatures = [
    {
      icon: Clock,
      title: "24-Hour Wallet Cooldown",
      description: "Each wallet address can only claim rewards once every 24 hours, preventing rapid farming attempts."
    },
    {
      icon: Server,
      title: "IP-Based Rate Limiting",
      description: "Maximum of 2 reward claims per IP address per day. This limits abuse even when using multiple wallets."
    },
    {
      icon: Eye,
      title: "Game Session Verification",
      description: "All reward claims are verified against actual game sessions stored in our database. Scores must match recorded gameplay."
    },
    {
      icon: Shield,
      title: "Anti-Cheat Score Validation",
      description: "Scores are validated against gameplay metrics (bugs killed, game duration) to detect impossibly high scores."
    },
    {
      icon: Lock,
      title: "Server-Side Validation",
      description: "All security checks happen server-side where they cannot be bypassed. Client-side code cannot be manipulated to claim unearned rewards."
    },
    {
      icon: Server,
      title: "Database-Level Protection",
      description: "Row-Level Security (RLS) policies ensure data integrity at the database level, providing an additional layer of protection."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      
      <main className="flex-1 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="font-display text-4xl md:text-5xl text-primary mb-4">
              Security Measures
            </h1>
            <p className="font-body text-lg text-muted-foreground max-w-2xl mx-auto">
              We take the security of our reward system seriously. Here's how we protect against abuse.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {securityFeatures.map((feature, index) => (
              <div 
                key={index}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
              >
                <feature.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-display text-xl text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="font-body text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Known Limitations */}
          <div className="bg-card/50 border border-border rounded-xl p-6 mb-8">
            <h2 className="font-display text-2xl text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              Known Limitations
            </h2>
            <ul className="font-body text-muted-foreground space-y-2">
              <li>• <strong>VPN Usage:</strong> Users with VPNs can potentially bypass IP-based rate limiting. However, wallet-based cooldowns still apply.</li>
              <li>• <strong>Multiple Wallets:</strong> Users can create multiple wallets, but IP limits restrict claims to 2 per day regardless of wallet count.</li>
              <li>• <strong>Bot Automation:</strong> While we have measures in place, sophisticated bots may still attempt to game the system.</li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6">
            <h2 className="font-display text-2xl text-destructive mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Important Disclaimer
            </h2>
            <div className="font-body text-muted-foreground space-y-4">
              <p>
                <strong className="text-foreground">NO WARRANTY:</strong> The security measures described on this page are provided on an "as-is" basis without warranties of any kind, either express or implied.
              </p>
              <p>
                <strong className="text-foreground">LIMITATION OF LIABILITY:</strong> $SNAIL and its developers, operators, and affiliates shall not be held liable for any direct, indirect, incidental, special, consequential, or exemplary damages resulting from:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Security breaches or exploits of the reward system</li>
                <li>Loss of tokens due to system vulnerabilities</li>
                <li>Unauthorized access to wallets or accounts</li>
                <li>Actions of malicious third parties</li>
                <li>Technical failures or bugs in the system</li>
                <li>Any other security-related incidents</li>
              </ul>
              <p>
                <strong className="text-foreground">USE AT YOUR OWN RISK:</strong> By using this platform and its reward system, you acknowledge that you understand and accept these risks. Cryptocurrency and token transactions are irreversible.
              </p>
              <p>
                <strong className="text-foreground">NOT FINANCIAL ADVICE:</strong> $SNAIL is a meme token for entertainment purposes only. Do not invest more than you can afford to lose.
              </p>
              <p className="text-sm italic pt-4 border-t border-border/50">
                This disclaimer was last updated on {new Date().toLocaleDateString()}. We reserve the right to modify our security measures and this disclaimer at any time without prior notice.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Security;
