
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js";
import axios from "axios";
import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router";
import {
    Sparkles,
    MessageSquare,
    Plus,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Search,
    Globe,
    ArrowRight,
    BookOpen,
    Terminal,
    Compass,
    FileText,
    Loader2,
    SlidersHorizontal,
    Info,
    HelpCircle
} from "lucide-react";

// --- Typings ---
interface Message {
    id?: number | string;
    content: string;
    role: "User" | "Assistant";
    createdAt?: string;
}

interface Source {
    title: string;
    url: string;
}

interface Conversation {
    id: string;
    title: string | null;
    followUps?: string[];
    messages?: Message[];
}

// --- Suggestion Templates ---
const SUGGESTIONS = [
    {
        icon: Globe,
        text: "Explain quantum computing in simple terms",
        desc: "Break down qubits and superposition",
        color: "from-emerald-500/20 to-teal-500/20 text-emerald-400"
    },
    {
        icon: Terminal,
        text: "What are the key updates in React 19 and Bun?",
        desc: "Compare compiler changes and performance",
        color: "from-cyan-500/20 to-blue-500/20 text-cyan-400"
    },
    {
        icon: Compass,
        text: "Summarize major milestones in space exploration",
        desc: "From Apollo 11 to Mars rovers and SLS",
        color: "from-indigo-500/20 to-purple-500/20 text-indigo-400"
    },
    {
        icon: BookOpen,
        text: "Brainstorm creative names for a science newsletter",
        desc: "Focus on physics, complexity and discovery",
        color: "from-pink-500/20 to-rose-500/20 text-pink-400"
    }
];

export default function Dashboard() {
    const navigate = useNavigate();
    
    // --- States ---
    const [user, setUser] = useState<User | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [sources, setSources] = useState<Source[]>([]);
    const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
    
    // UI layout states
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [focusMode, setFocusMode] = useState<"All" | "Academic" | "Writing" | "Code">("All");
    const [isFocusDropdownOpen, setIsFocusDropdownOpen] = useState(false);
    const [copilotEnabled, setCopilotEnabled] = useState(false);
    
    // Inputs & Streaming
    const [searchQuery, setSearchQuery] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // --- Authentication and Initial Data Fetch ---
    useEffect(() => {
        async function checkAuthAndFetch() {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error || !user) {
                navigate("/auth");
                return;
            }
            setUser(user);
            fetchConversationsList();
        }
        checkAuthAndFetch();
    }, [navigate]);

    // Scroll to bottom on new messages or active streaming
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isStreaming]);

    // Fetch conversation list
    async function fetchConversationsList() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            
            const response = await axios.get("http://localhost:3000/conversations", {
                headers: { Authorization: session.access_token }
            });
            setConversations(response.data || []);
        } catch (err) {
            console.error("Error fetching conversations:", err);
        }
    }

    // Load a single conversation from sidebar
    async function loadConversation(id: string) {
        setLoadingHistory(true);
        setError(null);
        setActiveConversationId(id);
        setSources([]);
        setFollowUpSuggestions([]);
        setIsMobileSidebarOpen(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await axios.get(`http://localhost:3000/conversation/${id}`, {
                headers: { Authorization: session.access_token }
            });
            
            const conv = response.data;
            if (conv) {
                // Sort messages in chronological order
                const sorted = (conv.messages || []).sort(
                    (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
                setMessages(sorted);
                setFollowUpSuggestions(conv.followUps || []);
            }
        } catch (err: any) {
            console.error("Error loading conversation detail:", err);
            setError("Failed to load conversation history.");
        } finally {
            setLoadingHistory(false);
        }
    }

    // Reset thread state to New Search
    function startNewThread() {
        setActiveConversationId(null);
        setMessages([]);
        setSources([]);
        setFollowUpSuggestions([]);
        setSearchQuery("");
        setError(null);
        setIsMobileSidebarOpen(false);
        setTimeout(() => textareaRef.current?.focus(), 100);
    }

    // --- Search Submission & Stream Handling ---
    async function handleSearch(queryText: string) {
        if (!queryText.trim() || isStreaming) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate("/auth");
            return;
        }
        
        const token = session.access_token;
        setSearchQuery(""); // Clear the input box
        setError(null);
        setFollowUpSuggestions([]);

        const userMsg: Message = { content: queryText, role: "User" };
        const assistantMsg: Message = { content: "", role: "Assistant" };

        let currentConvId = activeConversationId;
        
        if (!currentConvId) {
            // New thread
            setMessages([userMsg, assistantMsg]);
        } else {
            // Follow up query
            setMessages(prev => [...prev, userMsg, assistantMsg]);
        }

        setSources([]);
        setIsStreaming(true);

        try {
            const isFollowUp = !!currentConvId;
            const url = isFollowUp 
                ? "http://localhost:3000/purpexility_ask/follow_ups" 
                : "http://localhost:3000/purpexility_ask";
            
            const body = isFollowUp 
                ? { conversationId: currentConvId, query: queryText } 
                : { query: queryText };

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Server request failed with status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error("Empty response stream");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let fullText = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.trim().startsWith("data:")) {
                        try {
                            const jsonStr = line.slice(5).trim();
                            const parsed = JSON.parse(jsonStr);

                            if (parsed.type === "SOURCES") {
                                setSources(parsed.content || []);
                            } else if (parsed.type === "TEXT_DELTA") {
                                fullText += parsed.content;
                                setMessages(prev => {
                                    const next = [...prev];
                                    if (next.length > 0) {
                                        next[next.length - 1] = {
                                            ...next[next.length - 1],
                                            content: fullText
                                        };
                                    }
                                    return next;
                                });
                            } else if (parsed.type === "FOLLOW_UPS") {
                                setFollowUpSuggestions(parsed.content || []);
                            } else if (parsed.type === "CONVERSATION_ID") {
                                currentConvId = parsed.content;
                                setActiveConversationId(parsed.content);
                            } else if (parsed.type === "ERROR") {
                                setError(parsed.content || "An error occurred.");
                            }
                        } catch (e) {
                            console.error("JSON parsing error in chunk:", e);
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error("Streaming error:", err);
            setError(err.message || "Failed to process search query.");
        } finally {
            setIsStreaming(false);
            fetchConversationsList(); // refresh history list
        }
    }

    // Triggered when hitting Enter inside search area
    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSearch(searchQuery);
        }
    }

    // --- Component Formatter ---
    function FormattedMessage({ content }: { content: string }) {
        if (!content) {
            return (
                <div className="flex items-center gap-2 text-emerald-400 font-sans mt-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm opacity-85">Formulating response...</span>
                </div>
            );
        }

        const parts = content.split(/(```[\s\S]*?```)/g);

        return (
            <div className="space-y-4 leading-relaxed text-zinc-200 font-sans text-[15px] sm:text-base">
                {parts.map((part, index) => {
                    if (part.startsWith("```")) {
                        const lines = part.split("\n");
                        const lang = lines[0].replace("```", "").trim() || "code";
                        const code = lines.slice(1, -1).join("\n");
                        return (
                            <div key={index} className="my-4 rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden font-mono text-sm shadow-md transition-all duration-300 hover:border-zinc-700/40">
                                <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 border-b border-zinc-800 text-xs text-zinc-400 select-none">
                                    <span className="flex items-center gap-1.5 uppercase font-semibold font-sans tracking-wide">
                                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                                        {lang}
                                    </span>
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(code)}
                                        className="hover:text-zinc-200 transition-colors cursor-pointer"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <pre className="p-4 overflow-x-auto"><code className="text-emerald-400 font-medium">{code}</code></pre>
                            </div>
                        );
                    } else {
                        const paragraphs = part.split("\n\n");
                        return paragraphs.map((para, paraIdx) => {
                            const trimmed = para.trim();
                            if (!trimmed) return null;

                            // Headings
                            if (trimmed.startsWith("### ")) {
                                return (
                                    <h4 key={`${index}-${paraIdx}`} className="text-base sm:text-lg font-bold text-zinc-100 mt-5 mb-2 flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-emerald-500/80 rounded" />
                                        {renderTextSegments(trimmed.slice(4))}
                                    </h4>
                                );
                            }
                            if (trimmed.startsWith("## ")) {
                                return (
                                    <h3 key={`${index}-${paraIdx}`} className="text-lg sm:text-xl font-bold text-zinc-50 mt-6 mb-3 flex items-center gap-2">
                                        <div className="w-1.5 h-5 bg-emerald-500 rounded" />
                                        {renderTextSegments(trimmed.slice(3))}
                                    </h3>
                                );
                            }
                            if (trimmed.startsWith("# ")) {
                                return (
                                    <h2 key={`${index}-${paraIdx}`} className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-zinc-50 to-zinc-300 bg-clip-text text-transparent mt-8 mb-4">
                                        {renderTextSegments(trimmed.slice(2))}
                                    </h2>
                                );
                            }

                            // Blockquote
                            if (trimmed.startsWith("> ")) {
                                return (
                                    <blockquote key={`${index}-${paraIdx}`} className="border-l-4 border-emerald-500/60 pl-4 py-2 italic bg-emerald-500/5 my-4 rounded-r-xl text-zinc-400">
                                        {renderTextSegments(trimmed.slice(2))}
                                    </blockquote>
                                );
                            }

                            // Bullet lists
                            if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
                                const lines = trimmed.split("\n");
                                return (
                                    <ul key={`${index}-${paraIdx}`} className="list-none space-y-2 my-3 pl-1">
                                        {lines.map((line, lineIdx) => {
                                            const cleanLine = line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
                                            return (
                                                <li key={lineIdx} className="text-zinc-300 flex items-start gap-2">
                                                    <span className="text-emerald-500 shrink-0 select-none mt-1.5 text-xs">•</span>
                                                    <span>{renderTextSegments(cleanLine)}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                );
                            }

                            // Normal paragraph
                            return (
                                <p key={`${index}-${paraIdx}`} className="text-zinc-300 leading-relaxed font-sans text-sm sm:text-base">
                                    {renderTextSegments(trimmed)}
                                </p>
                            );
                        });
                    }
                })}
            </div>
        );
    }

    // Render inner content helpers
    function renderTextSegments(text: string) {
        const regex = /(\*\*.*?\*\*|`.*?`|\[\d+\])/g;
        const parts = text.split(regex);

        return parts.map((part, idx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={idx} className="font-semibold text-zinc-100">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith("`") && part.endsWith("`")) {
                return <code key={idx} className="px-1.5 py-0.5 rounded bg-zinc-950/60 border border-zinc-800 text-emerald-400 font-mono text-xs sm:text-sm">{part.slice(1, -1)}</code>;
            }
            const citationMatch = part.match(/^\[(\d+)\]$/);
            if (citationMatch) {
                const num = parseInt(citationMatch[1]);
                return (
                    <span
                        key={idx}
                        onClick={() => {
                            const element = document.getElementById(`source-tile-${num - 1}`);
                            if (element) {
                                element.scrollIntoView({ behavior: "smooth", block: "center" });
                                element.classList.add("ring-2", "ring-emerald-400", "scale-[1.03]", "shadow-[0_0_20px_rgba(16,185,129,0.4)]");
                                setTimeout(() => {
                                    element.classList.remove("ring-2", "ring-emerald-400", "scale-[1.03]", "shadow-[0_0_20px_rgba(16,185,129,0.4)]");
                                }, 2000);
                            }
                        }}
                        className="inline-flex items-center justify-center w-[17px] h-[17px] text-[9px] font-bold rounded-full bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 cursor-pointer mx-0.5 transition-all select-none vertical-align-middle hover:scale-105 active:scale-95"
                        title={`View Source ${num}`}
                    >
                        {num}
                    </span>
                );
            }
            return part;
        });
    }

    // --- Sidebar Component ---
    function SidebarContent() {
        return (
            <div className="h-full flex flex-col justify-between p-4 bg-[#0d0f15]/95 backdrop-blur-2xl">
                {/* Header branding */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 p-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                <Sparkles className="w-full h-full text-zinc-950" />
                            </div>
                            <span className="font-bold text-lg bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-400 bg-clip-text text-transparent tracking-tight">
                                DeepFind
                            </span>
                        </div>
                        {/* Close drawer on mobile */}
                        <button
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className="md:hidden p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-100 transition-all cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* New Thread Button */}
                    <button
                        onClick={startNewThread}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-200 hover:text-zinc-100 font-medium text-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    >
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span>New Thread</span>
                    </button>
                </div>

                {/* Scroller list of previous chats */}
                <div className="flex-1 my-6 overflow-y-auto pr-1 space-y-1.5 scroller">
                    <div className="text-zinc-500 text-xs font-semibold px-2 pb-1.5 uppercase tracking-wider select-none">
                        Search History
                    </div>
                    {conversations.length === 0 ? (
                        <div className="text-zinc-600 text-xs text-center py-8 font-medium">
                            No threads started yet.
                        </div>
                    ) : (
                        conversations.map((conv) => {
                            const isActive = conv.id === activeConversationId;
                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => loadConversation(conv.id)}
                                    className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left text-xs transition-all duration-200 cursor-pointer ${
                                        isActive
                                            ? "bg-zinc-800/50 border border-zinc-700/50 text-emerald-400 font-semibold"
                                            : "border border-transparent text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 hover:border-zinc-800/30"
                                    }`}
                                >
                                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isActive ? "text-emerald-400" : "text-zinc-500"}`} />
                                    <span className="truncate flex-1 leading-normal">
                                        {conv.title || "Untitled Search"}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer user profiles and logout */}
                <div className="pt-3 border-t border-zinc-900 space-y-3">
                    {user && (
                        <div className="flex items-center gap-2.5 px-1.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 select-none">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-zinc-400 truncate font-medium">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            navigate("/auth");
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all cursor-pointer font-medium"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        );
    }

    // --- Main Layout ---
    return (
        <div className="min-h-screen bg-[#090B11] text-zinc-100 flex relative overflow-hidden font-sans select-none">
            {/* Background Ambient Orbs */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
            <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[140px] pointer-events-none" />
            
            {/* Radial grid overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#090B11_80%),linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:100%_100%,28px_28px,28px_28px] pointer-events-none" />

            {/* Sidebar Desktop */}
            <div className={`hidden md:block transition-all duration-300 h-screen shrink-0 border-r border-zinc-800/80 z-20 ${
                isSidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
            }`}>
                <SidebarContent />
            </div>

            {/* Mobile Sidebar overlay drawer */}
            {isMobileSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
                    <div className="relative w-64 h-full z-55 animate-slide-in">
                        <SidebarContent />
                    </div>
                </div>
            )}

            {/* Main Chat/Console Area */}
            <div className="flex-1 h-screen flex flex-col relative z-10 overflow-hidden">
                {/* Navigation Header Bar */}
                <header className="h-14 border-b border-zinc-900/60 bg-zinc-950/20 backdrop-blur-md px-4 flex items-center justify-between select-none">
                    <div className="flex items-center gap-2">
                        {/* Desktop sidebar toggle button */}
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="hidden md:flex p-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-800 hover:text-zinc-100 text-zinc-400 transition-all cursor-pointer"
                            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                        >
                            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        {/* Mobile sidebar toggle button */}
                        <button
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="md:hidden p-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
                        >
                            <Menu className="w-4 h-4" />
                        </button>

                        {/* Active Title or Indicator */}
                        <span className="text-xs text-zinc-500 font-semibold px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/40 uppercase tracking-wider ml-1">
                            {activeConversationId ? "Current Thread" : "Deep Search Engine"}
                        </span>
                    </div>

                    {/* Logo/Branding for header if sidebar collapsed or on mobile */}
                    {(!isSidebarOpen || isMobileSidebarOpen) && (
                        <div className="flex items-center gap-1.5 select-none md:hidden">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span className="font-bold text-sm bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                                DeepFind
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        {/* Decorative Info Button */}
                        <button 
                            className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-100 transition-all cursor-pointer"
                            onClick={() => alert("DeepFind AI: Real-time search engine powered by Tavily and LLMs.")}
                        >
                            <Info className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {/* Content Stream Scroller */}
                <main className="flex-1 overflow-y-auto px-4 py-8 scroller flex justify-center">
                    <div className="w-full max-w-3xl flex flex-col justify-between min-h-full">
                        
                        {/* Conversation History / Result View */}
                        {messages.length > 0 ? (
                            <div className="space-y-8 pb-32">
                                {messages.map((msg, idx) => {
                                    const isUser = msg.role === "User";
                                    return (
                                        <div key={idx} className="space-y-3 animate-fade-in">
                                            {/* Header indicator */}
                                            <div className="flex items-center gap-2 select-none">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                    isUser 
                                                        ? "bg-zinc-800 text-zinc-300 border border-zinc-700/50" 
                                                        : "bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                                                }`}>
                                                    {isUser ? "Q" : "A"}
                                                </div>
                                                <span className={`text-xs font-semibold uppercase tracking-wider ${isUser ? "text-zinc-400" : "text-emerald-400"}`}>
                                                    {isUser ? "Question" : "DeepFind Answer"}
                                                </span>
                                            </div>

                                            {/* Message Content Container */}
                                            <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                                                isUser 
                                                    ? "bg-zinc-900/30 border-zinc-800/80 text-zinc-100 text-base" 
                                                    : "bg-zinc-900/60 border-zinc-800/60 backdrop-blur-lg"
                                            }`}>
                                                {isUser ? (
                                                    <p className="whitespace-pre-wrap leading-relaxed select-text font-medium text-zinc-100 text-base">
                                                        {msg.content}
                                                    </p>
                                                ) : (
                                                    <div className="select-text">
                                                        {/* Show sources card block ONLY for assistant responses (for active streams or the latest responses) */}
                                                        {idx === messages.length - 1 && sources.length > 0 && (
                                                            <div className="mb-4">
                                                                <SourcesList sources={sources} />
                                                            </div>
                                                        )}
                                                        
                                                        {/* Formatted Text */}
                                                        <FormattedMessage content={msg.content} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Error message display */}
                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm leading-relaxed animate-slide-in">
                                        <p className="font-semibold mb-1 text-red-300">Request Error</p>
                                        <p className="opacity-90">{error}</p>
                                    </div>
                                )}

                                {/* Loading state skeleton for fetching history */}
                                {loadingHistory && (
                                    <div className="flex items-center justify-center py-20 text-zinc-400 gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Loading history...</span>
                                    </div>
                                )}

                                {/* Related Follow-up Suggestions list */}
                                {!isStreaming && followUpSuggestions.length > 0 && (
                                    <div className="space-y-2 mt-6 animate-fade-in">
                                        <div className="text-zinc-500 text-xs font-semibold px-1 uppercase tracking-wider flex items-center gap-1.5">
                                            <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>Related Questions</span>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {followUpSuggestions.map((suggestion, sIdx) => (
                                                <button
                                                    key={sIdx}
                                                    onClick={() => handleSearch(suggestion)}
                                                    className="w-full flex items-center justify-between p-3 text-left text-sm rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-850 hover:border-zinc-700/80 text-zinc-300 hover:text-zinc-100 transition-all group duration-200 cursor-pointer"
                                                >
                                                    <span className="truncate pr-4">{suggestion}</span>
                                                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        ) : (
                            // Landing Dashboard state
                            <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full pb-16 animate-fade-in select-none">
                                {/* Centered greetings */}
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-3.5 shadow-[0_0_30px_rgba(16,185,129,0.25)] mb-5 hover:scale-105 transition-transform">
                                        <Sparkles className="w-full h-full text-zinc-950" />
                                    </div>
                                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                                        DeepFind
                                    </h1>
                                    <p className="text-zinc-400 text-sm sm:text-base mt-2">
                                        Where knowledge begins. Search anything with real-time web context.
                                    </p>
                                </div>

                                {/* Main Console Search Box */}
                                <div className="rounded-2xl border border-zinc-800/85 bg-zinc-900/30 backdrop-blur-xl p-3 flex flex-col gap-3.5 hover:border-zinc-750 transition-all duration-300 shadow-[0_15px_40px_rgba(0,0,0,0.45)] focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/5 mb-8">
                                    <div className="relative">
                                        <textarea
                                            ref={textareaRef}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Ask anything..."
                                            className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 outline-none text-base border-none resize-none pt-1.5 pb-2 px-1 focus:ring-0 scroller"
                                            rows={2}
                                            disabled={isStreaming}
                                        />
                                    </div>

                                    {/* Console Controls bottom row */}
                                    <div className="flex items-center justify-between border-t border-zinc-900/80 pt-2 px-1">
                                        {/* Left Side: Focus button selector */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsFocusDropdownOpen(!isFocusDropdownOpen)}
                                                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all text-xs font-semibold select-none cursor-pointer"
                                            >
                                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                                <span>Focus: {focusMode}</span>
                                            </button>

                                            {/* Dropdown popup */}
                                            {isFocusDropdownOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setIsFocusDropdownOpen(false)} />
                                                    <div className="absolute left-0 bottom-9 z-50 w-44 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-xl animate-scale-in">
                                                        {(["All", "Academic", "Writing", "Code"] as const).map((mode) => (
                                                            <button
                                                                key={mode}
                                                                onClick={() => {
                                                                    setFocusMode(mode);
                                                                    setIsFocusDropdownOpen(false);
                                                                }}
                                                                className={`w-full text-left py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                                                                    focusMode === mode
                                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                                                                }`}
                                                            >
                                                                <span>{mode} Mode</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Right Side: Copilot slider, and Send Button */}
                                        <div className="flex items-center gap-4">
                                            {/* Visual Mock toggle Copilot */}
                                            <div className="flex items-center gap-2 select-none">
                                                <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Copilot</span>
                                                <button
                                                    onClick={() => setCopilotEnabled(!copilotEnabled)}
                                                    className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                                                        copilotEnabled ? "bg-emerald-500" : "bg-zinc-800"
                                                    }`}
                                                >
                                                    <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
                                                        copilotEnabled ? "translate-x-3" : "translate-x-0"
                                                    }`} />
                                                </button>
                                            </div>

                                            {/* Submit arrow button */}
                                            <button
                                                onClick={() => handleSearch(searchQuery)}
                                                disabled={!searchQuery.trim() || isStreaming}
                                                className={`p-2 rounded-xl border transition-all ${
                                                    searchQuery.trim() && !isStreaming
                                                        ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 border-transparent shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95"
                                                        : "bg-zinc-900/40 text-zinc-600 border-zinc-800/80"
                                                } transition-all cursor-pointer`}
                                            >
                                                <ArrowRight className="w-4 h-4 shrink-0" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Clickable Suggestions Deck */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {SUGGESTIONS.map((sug, sIdx) => {
                                        const Icon = sug.icon;
                                        return (
                                            <button
                                                key={sIdx}
                                                onClick={() => handleSearch(sug.text)}
                                                className="p-3 text-left rounded-xl border border-zinc-800/65 bg-zinc-900/20 hover:bg-zinc-900/45 hover:border-zinc-700/60 transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div className={`p-1.5 rounded-lg bg-gradient-to-tr ${sug.color} shrink-0`}>
                                                        <Icon className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="text-zinc-200 text-sm font-semibold group-hover:text-zinc-100 transition-colors">
                                                        {sug.text}
                                                    </span>
                                                </div>
                                                <p className="text-zinc-500 text-xs pl-8 group-hover:text-zinc-400 transition-colors">
                                                    {sug.desc}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Floating Bottom Console for ongoing conversation (Chat layout) */}
                {messages.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#090B11] via-[#090B11]/95 to-transparent flex justify-center z-10 border-t border-transparent select-none">
                        <div className="w-full max-w-3xl rounded-xl border border-zinc-800/85 bg-zinc-950/60 backdrop-blur-xl p-2.5 flex items-center gap-2 hover:border-zinc-750 transition-all duration-200 shadow-xl focus-within:border-emerald-500/40">
                            <textarea
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask a follow-up..."
                                className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-500 outline-none text-sm border-none resize-none pt-1 focus:ring-0 scroller"
                                rows={1}
                                disabled={isStreaming}
                            />
                            {/* Send arrow */}
                            <button
                                onClick={() => handleSearch(searchQuery)}
                                disabled={!searchQuery.trim() || isStreaming}
                                className={`p-2 rounded-xl border shrink-0 transition-all ${
                                    searchQuery.trim() && !isStreaming
                                        ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 border-transparent shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:scale-105"
                                        : "bg-zinc-900/40 text-zinc-600 border-zinc-800/80"
                                } transition-all cursor-pointer`}
                            >
                                {isStreaming ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <ArrowRight className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}