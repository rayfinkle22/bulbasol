import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Send } from "lucide-react";
import { toast } from "sonner";
import snailImage from "@/assets/snail.png";
import { useMarketData, formatMarketCap, formatVolume, formatAge } from "@/hooks/useMarketData";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/snail-chat`;

const QUICK_REPLIES = [
  { label: "📊 Price check", message: "What's the current price and how's the market looking?" },
  { label: "🔥 Is it pumping?", message: "Is $SNAIL pumping right now? What's the momentum?" },
  { label: "💰 How to buy?", message: "How do I buy $SNAIL tokens?" },
  { label: "🐢 Who's Franklin?", message: "Tell me about Franklin the Turtle and your friendship!" },
];

export const SnailChatbot = () => {
  const [isOpen, setIsOpen] = useState(true); // Auto-open on first visit
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Heyyy friend! 🐌 I'm Snagent, your $SNAIL AI buddy. I've been riding on Franklin's shell since day one - slow and steady, you know? What can I help you with today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const marketData = useMarketData();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamChat = async (userMessages: Message[]) => {
    // Prepare comprehensive market data context
    const tokenData = {
      priceUsd: marketData.priceUsd,
      priceNative: marketData.priceNative,
      marketCap: marketData.marketCap ? formatMarketCap(marketData.marketCap) : null,
      priceChange: marketData.priceChange,
      volume: {
        m5: marketData.volume.m5 ? formatVolume(marketData.volume.m5) : null,
        h1: marketData.volume.h1 ? formatVolume(marketData.volume.h1) : null,
        h6: marketData.volume.h6 ? formatVolume(marketData.volume.h6) : null,
        h24: marketData.volume.h24 ? formatVolume(marketData.volume.h24) : null,
      },
      liquidityUsd: marketData.liquidityUsd ? formatVolume(marketData.liquidityUsd) : null,
      txns24h: marketData.txns24h,
      txns1h: marketData.txns1h,
      tokenAge: marketData.pairCreatedAt ? formatAge(marketData.pairCreatedAt) : null,
    };

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: userMessages, tokenData }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to get response");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && prev.length > 1) {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = { role: "user", content: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat(newMessages.slice(1)); // Skip initial greeting
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Snagent got lost in his shell!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent event from bubbling up (fixes spacebar issue)
    e.stopPropagation();
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  const showQuickReplies = messages.length === 1 && !isLoading;

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-primary hover:bg-primary/90 shadow-lg flex items-center justify-center transition-transform hover:scale-110 retro-border"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-primary-foreground" />
        ) : (
          <img src={snailImage} alt="Chat with Snagent" className="w-10 h-10 object-contain" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[32rem] bg-card rounded-2xl retro-border shadow-2xl flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-primary p-3 flex items-center gap-3">
            <img src={snailImage} alt="Snagent" className="w-10 h-10 object-contain" />
            <div>
              <h3 className="font-display text-primary-foreground font-bold">Snagent</h3>
              <p className="text-xs text-primary-foreground/70">Your $SNAIL AI Agent 🐌</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background/50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-secondary-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {/* Quick Replies */}
            {showQuickReplies && (
              <div className="flex flex-wrap gap-2 pt-2">
                {QUICK_REPLIES.map((qr, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(qr.message)}
                    className="px-3 py-1.5 text-xs bg-accent/20 hover:bg-accent/40 text-accent-foreground rounded-full border border-accent/30 transition-colors"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}
            
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-secondary text-secondary-foreground px-3 py-2 rounded-2xl rounded-bl-sm text-sm">
                  <span className="animate-pulse">🐌 slooowly thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-card">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Snagent anything..."
                className="flex-1 px-3 py-2 rounded-full bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              />
              <Button
                size="icon"
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                className="rounded-full"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
