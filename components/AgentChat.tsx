"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  Trash2,
  Target,
  MessageSquare,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Bonjour ! Je suis votre agent LinkedIn IA propulsé par OpenAI + LangChain.\\n\\nJe peux vous aider à :\\n\\n• 🔍 **Rechercher** des prospects sur LinkedIn\\n• 👤 **Visiter** des profils et analyser leur potentiel\\n• 🤝 **Envoyer** des demandes de connexion personnalisées\\n• 💬 **Envoyer** des messages directs à vos connexions\\n• 🎯 **Créer** des campagnes de prospection complètes\\n• � **Analyser** vos stats et performances\\n• � **Planifier** des relances automatiques\\n• 🧠 **Suggérer** des stratégies d'approche\\n\\n⚡ Les actions LinkedIn sont exécutées via l'extension Chrome.\\n\\nQue souhaitez-vous faire aujourd'hui ?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus automatique sur l'input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Envoyer un message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Message temporaire de l'assistant (loading)
    const loadingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: loadingId, role: "assistant", content: "", timestamp: new Date(), isLoading: true },
    ]);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            currentPage: window.location.pathname,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();

      // Remplacer le message loading par la vraie réponse
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
                id: loadingId,
                role: "assistant",
                content: data.response || data.error || "Désolé, je n'ai pas compris.",
                timestamp: new Date(),
                isLoading: false,
              }
            : msg
        )
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
                id: loadingId,
                role: "assistant",
                content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
                timestamp: new Date(),
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Effacer l'historique
  const handleClear = async () => {
    try {
      await fetch("/api/agent/chat", { method: "DELETE" });
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Conversation effacée. Comment puis-je vous aider ?",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Erreur lors de l'effacement:", error);
    }
  };

  // Suggestions rapides
  const suggestions = [
    { icon: Target, text: "Créer une campagne" },
    { icon: MessageSquare, text: "Rédiger un message" },
    { icon: TrendingUp, text: "Analyser mes stats" },
  ];

  return (
    <Card className="w-full h-[600px] flex flex-col border-0 shadow-xl bg-gradient-to-b from-white to-gray-50/50">
      <CardHeader className="border-b pb-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                Agent LinkedIn
                <Sparkles className="w-4 h-4 inline-block ml-1 text-yellow-500" />
              </CardTitle>
              <p className="text-xs text-gray-500">Propulsé par OpenAI + LangChain</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  message.role === "user"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600"
                    : "bg-gradient-to-br from-purple-500 to-pink-600"
                )}
              >
                {message.role === "user" ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Message */}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-gray-100 text-gray-900 rounded-bl-md"
                )}
              >
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-gray-500">Réflexion en cours...</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />

        {/* Suggestions rapides */}
        {messages.length < 3 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.text}
                onClick={() => {
                  setInput(suggestion.text);
                  inputRef.current?.focus();
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs transition-colors"
              >
                <suggestion.icon className="w-3 h-3" />
                {suggestion.text}
              </button>
            ))}
          </div>
        )}
      </CardContent>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Posez votre question..."
            className="flex-1 h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Appuyez sur Entrée pour envoyer • Shift + Entrée pour une nouvelle ligne
        </p>
      </div>
    </Card>
  );
}
