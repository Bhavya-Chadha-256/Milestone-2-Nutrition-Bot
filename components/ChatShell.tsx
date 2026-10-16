"use client";

import { useState, useEffect, useCallback } from "react";
import { Message } from "@/types/chat";
import { MessageList } from "./MessageList";
import { InputBox } from "./InputBox";
import { SourcesPanel } from "./SourcesPanel";
import { PredefinedQuestions } from "./PredefinedQuestions";
import { HistoryDrawer, SessionItem } from "./HistoryDrawer";
import { v4 as uuidv4 } from "uuid";

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr.replace(" ", "T") + "Z");
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function ChatShell() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load session list from backend
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        if (data.sessions) {
          setSessions(data.sessions);
        }
      }
    } catch (e) {
      console.warn("Could not load chat history list", e);
    }
  }, []);

  // Rehydrate current messages and sessionId from local storage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem("nutrition_session_id");
    const savedMessages = localStorage.getItem("nutrition_chat_messages");

    if (savedSession) {
      setSessionId(savedSession);
    }

    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (e) {
        console.warn("Failed to parse saved chat messages", e);
      }
    }

    loadSessions();
  }, [loadSessions]);

  // Persist messages to local storage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("nutrition_chat_messages", JSON.stringify(messages));
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    const userMsg: Message = { id: uuidv4(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });

      if (!res.ok) {
        let errMsg = "Something went wrong. Please try again.";
        try {
          const errData = await res.json();
          if (errData.error && errData.error.startsWith("MODEL_PARSE_ERROR")) {
            errMsg = "I couldn't format a proper response. Please rephrase.";
          }
        } catch {
          // ignore JSON parse error
        }
        throw new Error(errMsg);
      }

      const data = await res.json();

      if (data.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem("nutrition_session_id", data.session_id);
      }

      const asstMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: data.answer,
        claims: data.claims || [],
      };

      setMessages((prev) => [...prev, asstMsg]);
      // Refresh session list so recent chats update
      loadSessions();
    } catch (err: any) {
      let content = "Something went wrong. Please try again.";
      if (err.message) {
        if (err.message.includes("Failed to fetch")) {
          content = "Connection error. Please try again.";
        } else {
          content = err.message;
        }
      }
      const errorMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setShowSuggestions(true); // Predefined questions come back when a new chat starts
    localStorage.removeItem("nutrition_session_id");
    localStorage.removeItem("nutrition_chat_messages");
  };

  const handleSelectSession = async (selectedId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/history?session_id=${selectedId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          setSessionId(selectedId);
          setMessages(data.messages);
          localStorage.setItem("nutrition_session_id", selectedId);
          localStorage.setItem("nutrition_chat_messages", JSON.stringify(data.messages));
        }
      }
    } catch (e) {
      console.error("Failed to load session messages", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = (deletedId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== deletedId));
    if (sessionId === deletedId) {
      handleNewChat();
    }
  };

  const handleClearAll = () => {
    setSessions([]);
    handleNewChat();
  };

  // Collect all sources/claims for the active chat session
  const activeChatClaims = messages
    .filter((m) => m.role === "assistant" && Array.isArray(m.claims))
    .flatMap((m) => m.claims || []);

  // Last 5 chats for the quick access sidebar
  const last5Chats = sessions.slice(0, 5);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Header */}
      <header className="h-16 px-4 md:px-6 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between flex-shrink-0 z-20 backdrop-blur">
        <div className="flex items-center space-x-3 md:space-x-4">
          {/* Toggle sidebar button for smaller screens */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Recent Chats"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-zinc-950 font-bold shadow-md shadow-emerald-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-semibold tracking-tight text-zinc-100">Nutrition Bot</h1>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Milestone 2
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden xl:block">Evidence-based dietary reasoning & claim verification</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View All History Button */}
          <button
            onClick={() => {
              loadSessions();
              setHistoryOpen(true);
            }}
            title="All Chat History"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/70 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
            <span>All History</span>
            {sessions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-zinc-700 text-zinc-300 rounded-full text-[10px]">
                {sessions.length}
              </span>
            )}
          </button>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            title="Start New Chat"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-zinc-100 bg-emerald-600/90 hover:bg-emerald-500 active:bg-emerald-700 border border-emerald-500/30 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      {/* Main Workspace (3 columns: Left Sidebar Last 5 Chats | Center Main Chat | Right Sources Panel) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Last 5 Chats */}
        {sidebarOpen && (
          <aside className="w-64 flex-shrink-0 bg-zinc-925/95 border-r border-zinc-800 flex flex-col transition-all z-10">
            <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Last 5 Chats
                </span>
                <span className="px-1.5 py-0.2 text-[10px] rounded bg-zinc-800 text-emerald-400 font-mono">
                  {last5Chats.length}
                </span>
              </div>
              <button
                onClick={handleNewChat}
                title="New Chat"
                className="text-zinc-400 hover:text-emerald-400 p-1 rounded hover:bg-zinc-800 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {last5Chats.length === 0 ? (
                <div className="py-8 px-3 text-center text-zinc-500 text-xs">
                  <p>No recent chats.</p>
                  <p className="text-[11px] mt-1 text-zinc-600">Start a new conversation to see it here.</p>
                </div>
              ) : (
                last5Chats.map((s) => {
                  const isActive = s.id === sessionId;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSession(s.id)}
                      className={`group relative rounded-lg px-2.5 py-2 cursor-pointer transition-all border ${
                        isActive
                          ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                          : "bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/60 hover:border-zinc-700 text-zinc-300"
                      }`}
                    >
                      <p className="text-xs font-medium line-clamp-1 pr-5">
                        {s.title}
                      </p>
                      <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-zinc-500">
                        <span>{formatDate(s.created_at)}</span>
                        <span>•</span>
                        <span>{s.message_count} {s.message_count === 1 ? "msg" : "msgs"}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(s.id);
                        }}
                        title="Delete chat"
                        className="absolute top-2 right-1.5 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 p-1 rounded transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {sessions.length > 5 && (
              <div className="p-2 border-t border-zinc-800/80 bg-zinc-900/40">
                <button
                  onClick={() => {
                    loadSessions();
                    setHistoryOpen(true);
                  }}
                  className="w-full py-1.5 px-2 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
                  <span>View older chats ({sessions.length - 5} more, max 150)</span>
                </button>
              </div>
            )}
          </aside>
        )}

        {/* Center: Chat Window */}
        <main className="flex flex-col flex-1 h-full bg-zinc-950 border-r border-zinc-800/80 transition-all min-w-0">
          <MessageList messages={messages} loading={loading} />

          {/* Predefined Questions above the chat bar (with cross button, reappears on new chat) */}
          {showSuggestions && (
            <PredefinedQuestions
              onSelect={handleSend}
              onClose={() => setShowSuggestions(false)}
            />
          )}

          <InputBox onSend={handleSend} disabled={loading} />
        </main>

        {/* Right: Sources for this particular chat (visible at all times when accessed) */}
        <aside className="hidden md:flex flex-col lg:w-[30%] md:w-[35%] w-full h-full bg-zinc-925/90 flex-shrink-0 transition-all">
          <SourcesPanel claims={activeChatClaims} />
        </aside>
      </div>

      {/* Full History Drawer Modal */}
      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        sessions={sessions}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
