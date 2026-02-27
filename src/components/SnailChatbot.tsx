import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Send, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { useMarketData, formatMarketCap, formatVolume, formatAge } from "@/hooks/useMarketData";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/snail-chat`;

const QUICK_REPLIES = [
  { label: "📊 Market cap?", message: "What's the current market cap for BulbaSol?" },
  { label: "🔥 Is it pumping?", message: "Is BulbaSol pumping right now? What's the momentum?" },
  { label: "💰 How to buy?", message: "How do I buy BulbaSol tokens?" },
  { label: "🌿 Who's Bulbasaur?", message: "Tell me about Bulbasaur the Pokémon!" },
  { label: "🎮 How to play?", message: "How do I play the Snail Shooter game? What are the controls?" },
  { label: "🏆 High scores?", message: "Who has the highest scores on the leaderboard?" },
];

export const SnailChatbot = () => {
  const [isOpen, setIsOpen] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 640;
  });
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey trainer! 🌿 I'm Bulba, your BulbaSol AI buddy. I know everything about Bulbasaur and the BulbaSol token. What can I help you with today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const marketData = useMarketData();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamChat = async (userMessages: Message[]) => {
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
      await streamChat(newMessages.slice(1));
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Bulba got tangled in vines!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  const showQuickReplies = messages.length === 1 && !isLoading;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 retro-border"
        style={{ backgroundColor: 'hsl(200 70% 50%)' }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-primary-foreground" />
        ) : (
          <span className="text-2xl">🌿</span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[32rem] rounded-2xl retro-border shadow-2xl flex flex-col overflow-hidden animate-scale-in" style={{ backgroundColor: 'hsl(200 60% 92%)' }}>
          <div className="p-3 flex items-center gap-2" style={{ backgroundColor: 'hsl(200 70% 50%)' }}>
            <span className="text-2xl">🌿</span>
            <div className="flex-1">
              <h3 className="font-display text-primary-foreground font-bold">Bulba the AI Agent</h3>
              <p className="text-xs text-primary-foreground/70">Your BulbaSol AI Agent 🌿</p>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => setFontSize(prev => Math.max(12, prev - 2))}
                className="w-6 h-6 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/30 flex items-center justify-center transition-colors border border-primary-foreground/20"
                aria-label="Decrease font size"
              >
                <Minus className="w-3 h-3 text-primary-foreground" />
              </button>
              <button
                onClick={() => setFontSize(prev => Math.min(22, prev + 2))}
                className="w-6 h-6 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/30 flex items-center justify-center transition-colors border border-primary-foreground/20"
                aria-label="Increase font size"
              >
                <Plus className="w-3 h-3 text-primary-foreground" />
              </button>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/30 flex items-center justify-center transition-colors border border-primary-foreground/20"
              aria-label="Close chat"
            >
              <X className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ backgroundColor: 'hsl(200 50% 85%)' }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-white ${
                    msg.role === "user"
                      ? "rounded-br-sm"
                      : "rounded-bl-sm"
                  }`}
                  style={{ 
                    fontSize: `${fontSize}px`,
                    color: 'hsl(210 30% 15%)',
                    backgroundColor: msg.role === "user" ? 'hsl(200 70% 50%)' : 'hsl(200 40% 75%)',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {showQuickReplies && (
              <div className="flex flex-wrap gap-2 pt-2">
                {QUICK_REPLIES.map((qr, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(qr.message)}
                    className="px-3 py-1.5 bg-accent/20 hover:bg-accent/40 text-accent-foreground rounded-full border border-accent/30 transition-colors"
                    style={{ fontSize: `${fontSize - 2}px` }}
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}
            
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div 
                  className="px-3 py-2 rounded-2xl rounded-bl-sm" 
                  style={{ backgroundColor: 'hsl(200 40% 75%)', color: 'hsl(210 30% 15%)', fontSize: `${fontSize}px` }}
                >
                  <span className="animate-pulse">🌿 growing a response...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t" style={{ borderColor: 'hsl(200 40% 70%)', backgroundColor: 'hsl(200 60% 92%)' }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Bulba anything..."
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
