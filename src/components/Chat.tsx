"use client";
import { useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

type PendingAction = {
  action: "log" | "remove";
  logs?: unknown[];
  itemsToRemove?: unknown[];
};

export default function Chat() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [isDoneLogging, setIsDoneLogging] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Show welcome message on first load
  useEffect(() => {
    if (!hasShownWelcome) {
      const welcomeMessage = `Hi! I'm Chip, your AI Nutrition Assistant. You can log food, get meal recommendations, or ask me questions about your nutrition goals. How can I help you today?`;
      
      setMessages([{ role: "assistant", content: welcomeMessage }]);
      setHasShownWelcome(true);
    }
  }, [hasShownWelcome]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const needsScroll = el.scrollHeight > el.clientHeight;
    if (needsScroll) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  // Listen for done-logging event
  useEffect(() => {
    const handleDoneLogging = () => {
      setIsDoneLogging(true);
    };
    
    window.addEventListener("done-logging", handleDoneLogging);
    return () => window.removeEventListener("done-logging", handleDoneLogging);
  }, []);

  async function sendMessage() {
    if (!input.trim() || isDoneLogging) return;
    const toSend = input.trim();
    setMessages((m) => [...m, { role: "user", content: toSend }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: toSend,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
        }),
      });
      const data = await res.json();
      const reply: string = data?.reply ?? "";
      
      // Handle confirmation flow
      if (data.needsConfirmation) {
        setPendingAction({
          action: data.action === "remove" ? "remove" : "log",
          logs: data.logs,
          itemsToRemove: data.itemsToRemove,
        });
      } else if (data.action === "confirm") {
        setPendingAction(null);
        try { window.dispatchEvent(new CustomEvent("nutrition:update")); } catch {}
      } else {
        setPendingAction(null);
        try { window.dispatchEvent(new CustomEvent("nutrition:update")); } catch {}
      }
      
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      setMessages((m) => [...m, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full border rounded-lg p-4 flex flex-col gap-3 h-[calc(100vh-12rem)]">
      <div ref={listRef} className="flex flex-col gap-2 flex-1 min-h-0 overflow-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "self-end bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg" : "self-start bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg"}>
            <span className="text-sm whitespace-pre-wrap">{m.content}</span>
          </div>
        ))}
        {loading && <div className="text-sm text-gray-500">Thinking…</div>}
      </div>
      {pendingAction && (
        <div className="flex gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex-1 text-sm">
            {pendingAction.action === "log" && "Confirm adding these items?"}
            {pendingAction.action === "remove" && "Confirm removing these items?"}
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  // Directly log the items without going through the chat API
                  const res = await fetch("/api/logs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                      logs: pendingAction.logs || []
                    }),
                  });
                  const data = await res.json();
                  
                  if (data.success) {
                    setMessages((m) => [...m, { role: "user", content: "yes, confirm" }, { role: "assistant", content: data.message }]);
                  } else {
                    setMessages((m) => [...m, { role: "user", content: "yes, confirm" }, { role: "assistant", content: "Error logging items. Please try again." }]);
                  }
                  
                  setPendingAction(null);
                  try { window.dispatchEvent(new CustomEvent("nutrition:update")); } catch {}
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : "Error";
                  setMessages((m) => [...m, { role: "user", content: "yes, confirm" }, { role: "assistant", content: msg }]);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Yes
            </button>
            <button
              onClick={() => {
                setMessages((m) => [...m, { role: "user", content: "no, cancel" }, { role: "assistant", content: "Cancelled." }]);
                setPendingAction(null);
              }}
              disabled={loading}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              No
            </button>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
          placeholder={isDoneLogging ? "Logging complete for today" : "e.g. I had 2 eggs and toast for breakfast"}
          disabled={isDoneLogging}
          className={`flex-1 border rounded-lg px-3 py-2 bg-transparent ${
            isDoneLogging ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
        <button 
          onClick={sendMessage} 
          disabled={loading || isDoneLogging} 
          className={`border rounded-lg px-3 py-2 bg-foreground text-background disabled:opacity-50 ${
            isDoneLogging ? 'cursor-not-allowed' : ''
          }`}
        >
          {isDoneLogging ? 'Done' : 'Send'}
        </button>
      </div>
      
    </div>
  );
}


