"use client";
import { useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

type PendingAction = {
  action: "log" | "remove";
  logs?: unknown[];
  itemsToRemove?: unknown[];
  confirmationMessage?: string;
};



export default function Chat() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [isDoneLogging, setIsDoneLogging] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);

  const listRef = useRef<HTMLDivElement | null>(null);

  // Rotating example messages
  const exampleMessages = [
    "I had 2 eggs and toast for breakfast",
    "Give me an idea of something healthy with yogurt",
    "What's a good high-protein lunch option?",
    "I ate a chicken salad for lunch",
    "Suggest a quick dinner recipe under 500 calories",
    "How many calories are in a medium apple?",
    "I had coffee with cream and sugar this morning",
    "What's a good post-workout snack?",
    "I made pasta with marinara sauce for dinner",
    "Give me breakfast ideas for someone who doesn't like eggs"
  ];

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

  // Rotate example messages every 4 seconds
  useEffect(() => {
    if (isDoneLogging) return;
    
    const interval = setInterval(() => {
      setExampleIndex((prev) => (prev + 1) % exampleMessages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [exampleMessages.length, isDoneLogging]);

  async function sendMessage() {
    if (!input.trim() || isDoneLogging) return;
    const toSend = input.trim();
    setMessages((m) => [...m, { role: "user", content: toSend }]);
    setInput("");
    setLoading(true);
    try {
      const conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));
      console.log("🔍 Sending conversation history:", conversationHistory);
      
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: toSend,
          conversationHistory: conversationHistory
        }),
      });
      const data = await res.json();
      const reply: string = data?.reply ?? "";
      
      // Always log debug info to console if available
      console.log('🔍 FULL API RESPONSE:', data);
      
      if (data.debug) {
        console.group('🔍 CHAT DEBUG INFO');
        console.log('📝 Original Message:', data.debug.originalMessage);
        console.log('🤖 LLM Response:', data.debug.llmResponse);
        console.log('📊 Parsed JSON:', data.debug.parsedJson);
        console.log('✅ Model Output Success:', data.debug.modelOutputSuccess);
        console.log('📋 Model Output Data:', data.debug.modelOutputData);
        console.log('💬 Final Reply:', data.debug.finalReply);
        console.log('🎯 Action:', data.debug.action);
        console.log('❓ Needs Confirmation:', data.debug.needsConfirmation);
        console.log('📦 Logs Length:', data.debug.logsLength);
        console.log('🔄 Conversation History Length:', data.debug.conversationHistoryLength);
        
        // Highlight issues
        if (!data.debug.modelOutputSuccess) {
          console.warn('⚠️ ISSUE: Model output parsing failed');
        }
        if (!data.debug.finalReply || data.debug.finalReply.trim() === "") {
          console.warn('⚠️ ISSUE: Final reply is empty');
        }
        console.groupEnd();
      } else {
        // If no debug info available, still log the basic response
        console.group('🔍 CHAT RESPONSE');
        console.log('📝 Original Message:', toSend);
        console.log('💬 Final Reply:', reply);
        console.log('🎯 Action:', data.action);
        console.log('❓ Needs Confirmation:', data.needsConfirmation);
        console.log('📦 Logs Length:', data.logs?.length || 0);
        console.warn('⚠️ NO DEBUG INFO AVAILABLE - check if deployment propagated');
        console.groupEnd();
      }
      
      // Handle confirmation flow
      if (data.needsConfirmation) {
        setPendingAction({
          action: data.action === "remove" ? "remove" : "log",
          logs: data.logs,
          itemsToRemove: data.itemsToRemove,
          confirmationMessage: reply, // Store the detailed confirmation message
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
            {pendingAction.action === "log" && (
              <div>
                <div className="font-medium">Confirm adding these items?</div>
              </div>
            )}
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
                    // Clear conversation context after successful food logging to start fresh
                    setMessages([{ role: "assistant", content: data.message }]);
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
          placeholder={isDoneLogging ? "Logging complete for today" : `e.g. ${exampleMessages[exampleIndex]}`}
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


