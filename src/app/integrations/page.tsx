"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/ui/header";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import {
  Server,
  Folder,
  Github,
  Terminal,
  Play,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Search,
  FileText,
  Sparkles,
  Layers,
  Lock,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Code2,
  Radio,
  Cpu,
  Globe,
  Database,
} from "lucide-react";

interface RemoteServer {
  id: string;
  name: string;
  url: string;
  status: "connected" | "error" | "warning" | "disconnected";
  errorMessage?: string;
  message?: string;
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema?: any;
  }>;
}

interface StatusData {
  googleDrive: {
    configured: boolean;
    rootFolderId: string | null;
    mcpFolderId: string | null;
    hasRefreshToken: boolean;
  };
  github: {
    configured: boolean;
    authenticated: boolean;
    username?: string;
    name?: string;
    avatarUrl?: string;
    publicRepos?: number;
    privateRepos?: number;
    error?: string;
  };
  remoteServers: {
    total: number;
    servers: any[];
  };
  system: {
    database: boolean;
    workspaceDocuments: number;
    n8nWebhook: boolean;
    geminiFallback: boolean;
  };
}

const BUILTIN_TOOLS = [
  // Drive tools
  {
    category: "Google Drive",
    serverId: "local",
    name: "list_drive_files",
    description: "List files directly from Google Drive without manual upload",
    sampleArgs: { maxResults: 10, fileType: "pdf" },
  },
  {
    category: "Google Drive",
    serverId: "local",
    name: "get_drive_status",
    description: "Check Google Drive OAuth and folder connection status",
    sampleArgs: {},
  },
  {
    category: "Google Drive",
    serverId: "local",
    name: "search_drive",
    description: "Search Drive files by name query",
    sampleArgs: { query: "invoice" },
  },
  {
    category: "Google Drive",
    serverId: "local",
    name: "ask_about_drive",
    description: "Ask AI a question using Google Drive documents directly",
    sampleArgs: { question: "What are the main takeaways from my documents?" },
  },
  // GitHub tools
  {
    category: "GitHub",
    serverId: "local",
    name: "github_get_status",
    description: "Check GitHub connection status and account details",
    sampleArgs: {},
  },
  {
    category: "GitHub",
    serverId: "local",
    name: "github_list_repos",
    description: "List user or organization repositories",
    sampleArgs: { maxResults: 10, visibility: "all" },
  },
  {
    category: "GitHub",
    serverId: "local",
    name: "github_get_file",
    description: "Read file contents from any GitHub repository and branch",
    sampleArgs: { owner: "facebook", repo: "react", path: "package.json" },
  },
  {
    category: "GitHub",
    serverId: "local",
    name: "ask_about_github",
    description: "Ask AI a question about a GitHub repository's code",
    sampleArgs: {
      owner: "facebook",
      repo: "react",
      question: "What packages does this repository use?",
      paths: ["package.json"],
    },
  },
  // Database tools
  {
    category: "Database",
    serverId: "local",
    name: "list_documents",
    description: "List documents stored in local PostgreSQL workspace",
    sampleArgs: {},
  },
  {
    category: "Database",
    serverId: "local",
    name: "get_document_stats",
    description: "Count documents by status (READY, PROCESSING, FAILED)",
    sampleArgs: {},
  },
  {
    category: "Database",
    serverId: "local",
    name: "list_conversations",
    description: "List all chat conversations",
    sampleArgs: {},
  },
];

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<"remote" | "drive" | "github" | "playground">("remote");
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Remote servers state
  const [remoteServers, setRemoteServers] = useState<RemoteServer[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerUrl, setNewServerUrl] = useState("");
  const [newServerHeader, setNewServerHeader] = useState("");
  const [addingServer, setAddingServer] = useState(false);
  const [addServerError, setAddServerError] = useState<string | null>(null);
  const [expandedServerId, setExpandedServerId] = useState<string | null>(null);

  // GitHub state
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [customToken, setCustomToken] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  const [tokenFeedback, setTokenFeedback] = useState<string | null>(null);

  // Drive state
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);

  // Playground state
  const [selectedTool, setSelectedTool] = useState(BUILTIN_TOOLS[0]);
  const [playgroundArgs, setPlaygroundArgs] = useState(
    JSON.stringify(BUILTIN_TOOLS[0].sampleArgs, null, 2)
  );
  const [executingTool, setExecutingTool] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);

  // Fetch overall status
  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/mcp/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to load status:", err);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Fetch remote servers
  const fetchRemoteServers = async () => {
    setLoadingServers(true);
    try {
      const res = await fetch("/api/mcp/servers");
      if (res.ok) {
        const data = await res.json();
        setRemoteServers(data.servers || []);
      }
    } catch (err) {
      console.error("Failed to load remote servers:", err);
    } finally {
      setLoadingServers(false);
    }
  };

  // Fetch GitHub repos
  const fetchGithubRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/mcp/github");
      if (res.ok) {
        const data = await res.json();
        setGithubRepos(data.repositories || []);
      }
    } catch (err) {
      console.error("Failed to load GitHub repos:", err);
    } finally {
      setLoadingRepos(false);
    }
  };

  // Fetch Drive files
  const fetchDriveFiles = async () => {
    setLoadingDriveFiles(true);
    try {
      const res = await fetch("/api/mcp/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName: "list_drive_files",
          arguments: { maxResults: 15 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDriveFiles(data.result?.files || []);
      }
    } catch (err) {
      console.error("Failed to load drive files:", err);
    } finally {
      setLoadingDriveFiles(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchRemoteServers();
  }, []);

  // Handle Add Remote Server
  const handleAddRemoteServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddServerError(null);
    setAddingServer(true);

    try {
      let headersObj: Record<string, string> | undefined;
      if (newServerHeader.trim()) {
        try {
          headersObj = JSON.parse(newServerHeader.trim());
        } catch {
          // If plain text token, format as Authorization
          headersObj = { Authorization: `Bearer ${newServerHeader.trim()}` };
        }
      }

      const res = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newServerName.trim(),
          url: newServerUrl.trim(),
          headers: headersObj,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add remote server");
      }

      setShowAddServerModal(false);
      setNewServerName("");
      setNewServerUrl("");
      setNewServerHeader("");
      fetchRemoteServers();
      fetchStatus();
    } catch (err: any) {
      setAddServerError(err.message || "Failed to connect to remote server");
    } finally {
      setAddingServer(false);
    }
  };

  // Handle Delete Remote Server
  const handleDeleteServer = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this remote MCP server?")) return;
    try {
      const res = await fetch(`/api/mcp/servers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchRemoteServers();
        fetchStatus();
      }
    } catch (err) {
      console.error("Failed to delete server:", err);
    }
  };

  // Save GitHub token
  const handleSaveGithubToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingToken(true);
    setTokenFeedback(null);

    try {
      const res = await fetch("/api/mcp/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: customToken.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to verify token");
      }

      setTokenFeedback(`Connected as @${data.user?.login}`);
      setTimeout(() => {
        setShowTokenModal(false);
        setCustomToken("");
        setTokenFeedback(null);
        fetchStatus();
        fetchGithubRepos();
      }, 1000);
    } catch (err: any) {
      setTokenFeedback(`Error: ${err.message}`);
    } finally {
      setSavingToken(false);
    }
  };

  // Handle Tool Selection in Playground
  const handleSelectTool = (tool: any) => {
    setSelectedTool(tool);
    setPlaygroundArgs(JSON.stringify(tool.sampleArgs || {}, null, 2));
    setExecutionResult(null);
  };

  // Execute Tool in Playground
  const handleExecutePlayground = async () => {
    setExecutingTool(true);
    setExecutionResult(null);
    setExecutionTime(null);

    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(playgroundArgs);
      } catch {
        alert("Invalid JSON in parameters. Please check syntax.");
        setExecutingTool(false);
        return;
      }

      const res = await fetch("/api/mcp/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId: selectedTool.serverId || "local",
          toolName: selectedTool.name,
          arguments: parsedArgs,
        }),
      });

      const data = await res.json();
      setExecutionResult(data);
      if (data.executionTimeMs) {
        setExecutionTime(data.executionTimeMs);
      }
    } catch (err: any) {
      setExecutionResult({ error: err.message || "Execution request failed" });
    } finally {
      setExecutingTool(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 2000);
  };

  // Collect all available tools for Playground selector
  const allPlaygroundTools = [
    ...BUILTIN_TOOLS,
    ...remoteServers.flatMap((s) =>
      (s.tools || []).map((t) => ({
        category: `Remote: ${s.name}`,
        serverId: s.id,
        name: t.name,
        description: t.description || "Remote MCP tool",
        sampleArgs: {},
      }))
    ),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Universal MCP Hub & Connectors
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">MCP & Remote Integrations</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Connect external remote MCP servers (via SSE), cloud providers (Google Drive, GitHub),
              and query your documents without manual uploads.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" />
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-slate-400">Remote MCPs</div>
                <div className="text-xs font-semibold">{remoteServers.length} Connected</div>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-500" />
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-slate-400">Google Drive</div>
                <div className="text-xs font-semibold">
                  {status?.googleDrive.configured ? "Ready" : "Not Set"}
                </div>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
              <Github className="w-4 h-4 text-purple-500" />
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-slate-400">GitHub</div>
                <div className="text-xs font-semibold">
                  {status?.github.authenticated ? `@${status.github.username}` : "Anonymous"}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchStatus();
                fetchRemoteServers();
              }}
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStatus ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 sm:space-x-2 border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("remote")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "remote"
                ? "border-sky-500 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Remote MCP Servers</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {remoteServers.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("drive");
              if (driveFiles.length === 0) fetchDriveFiles();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "drive"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Google Drive Direct</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("github");
              if (githubRepos.length === 0) fetchGithubRepos();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "github"
                ? "border-purple-500 text-purple-600 dark:text-purple-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Github className="w-4 h-4" />
            <span>GitHub Connector</span>
          </button>

          <button
            onClick={() => setActiveTab("playground")}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "playground"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Tool Playground</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Test
            </span>
          </button>
        </div>

        {/* ─── TAB 1: REMOTE MCP SERVERS ────────────────────────────────────── */}
        {activeTab === "remote" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Connected Remote MCP Servers</h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Connect any remote MCP endpoint over Server-Sent Events (SSE). Their tools are automatically forwarded to Claude and Cursor.
                </p>
              </div>
              <Button onClick={() => setShowAddServerModal(true)} className="gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Connect Server</span>
              </Button>
            </div>

            {loadingServers ? (
              <div className="py-12 flex justify-center items-center">
                <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
              </div>
            ) : remoteServers.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 mx-auto flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No Remote MCP Servers Connected</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                  Add remote SSE MCP endpoints (e.g., cloud services, external databases, or APIs) to make their tools available across your entire AI workspace.
                </p>
                <Button onClick={() => setShowAddServerModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Connect Your First Remote MCP</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {remoteServers.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                          <Server className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base">{srv.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                srv.status === "connected"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  srv.status === "connected" ? "bg-emerald-500" : "bg-rose-500"
                                }`}
                              />
                              {srv.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{srv.url}</div>
                          {srv.errorMessage && (
                            <div className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{srv.errorMessage}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="text-xs font-semibold text-slate-500">
                          {(srv.tools || []).length} tools discovered
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedServerId(expandedServerId === srv.id ? null : srv.id)
                          }
                          className="gap-1 text-xs"
                        >
                          <span>{expandedServerId === srv.id ? "Hide Tools" : "View Tools"}</span>
                          {expandedServerId === srv.id ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteServer(srv.id)}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Tools List */}
                    {expandedServerId === srv.id && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Available Tools on {srv.name}:
                        </div>
                        {(srv.tools || []).length === 0 ? (
                          <div className="text-xs text-slate-400">No tools discovered from this server.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(srv.tools || []).map((tool, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                                    {tool.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                                    {tool.description || "No description provided"}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    handleSelectTool({
                                      category: `Remote: ${srv.name}`,
                                      serverId: srv.id,
                                      name: tool.name,
                                      description: tool.description,
                                      sampleArgs: {},
                                    });
                                    setActiveTab("playground");
                                  }}
                                  className="text-xs h-7 gap-1"
                                >
                                  <Play className="w-3 h-3" />
                                  <span>Test</span>
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: GOOGLE DRIVE ──────────────────────────────────────────── */}
        {activeTab === "drive" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Google Drive Direct Connection</h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Query Google Docs, Google Sheets, PDFs, and files directly on demand without manual uploads.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      status?.googleDrive.configured
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {status?.googleDrive.configured ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Connected</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Not Connected</span>
                      </>
                    )}
                  </span>

                  {!status?.googleDrive.configured ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        window.location.href = "/api/auth/google?returnTo=/integrations";
                      }}
                      className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white"
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>Connect Google Drive</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (confirm("Are you sure you want to disconnect Google Drive?")) {
                          await fetch("/api/drive/status", { method: "POST" });
                          fetchStatus();
                          setDriveFiles([]);
                        }
                      }}
                      className="gap-1.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchDriveFiles}
                    disabled={loadingDriveFiles}
                    className="gap-1.5 text-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDriveFiles ? "animate-spin" : ""}`} />
                    <span>Fetch Drive Files</span>
                  </Button>
                </div>
              </div>

              {!status?.googleDrive.configured && (
                <div className="mt-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                  <div className="font-bold mb-1">Connect your Google Drive:</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Click the <strong>Connect Google Drive</strong> button above to grant read-only access. Files are queried and parsed strictly in memory without being stored on our local server disk.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      window.location.href = "/api/auth/google?returnTo=/integrations";
                    }}
                    className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white"
                  >
                    <span>Authorize with Google</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Drive Files List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Recent Google Drive Files:
              </h3>
              {loadingDriveFiles ? (
                <div className="py-8 flex justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                  No Drive files fetched yet. Click "Fetch Drive Files" above to query your Drive.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {driveFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-2.5">
                        <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="overflow-hidden">
                          <div className="text-xs font-bold truncate" title={file.name}>
                            {file.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{file.size}</div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Readable
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleSelectTool({
                              category: "Google Drive",
                              serverId: "local",
                              name: "read_drive_file",
                              description: "Extract text from file",
                              sampleArgs: { fileId: file.id },
                            });
                            setActiveTab("playground");
                          }}
                          className="h-6 text-[11px] px-2 gap-1 text-amber-600 dark:text-amber-400"
                        >
                          <Play className="w-3 h-3" />
                          <span>Inspect Content</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: GITHUB ────────────────────────────────────────────────── */}
        {activeTab === "github" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <Github className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">GitHub Remote Integration</h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Browse repositories, read source code, search issues, and ask questions about your repos.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      status?.github.authenticated
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                    }`}
                  >
                    {status?.github.authenticated ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Connected: @{status.github.username}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Public Mode (Anonymous)</span>
                      </>
                    )}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTokenModal(true)}
                    className="gap-1.5 text-xs"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{status?.github.authenticated ? "Update Token" : "Set Access Token"}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Repositories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Accessible Repositories:
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchGithubRepos}
                  disabled={loadingRepos}
                  className="text-xs gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingRepos ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </Button>
              </div>

              {loadingRepos ? (
                <div className="py-8 flex justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : githubRepos.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                  No repositories fetched. Click "Refresh" to load public or account repositories.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {githubRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate text-purple-600 dark:text-purple-400">
                            {repo.fullName}
                          </span>
                          {repo.isPrivate && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                              Private
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                          {repo.description || "No description provided"}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-mono">
                          ⭐ {repo.stars || 0}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleSelectTool({
                              category: "GitHub",
                              serverId: "local",
                              name: "github_get_file",
                              description: "Read repo file",
                              sampleArgs: {
                                owner: repo.owner || repo.fullName.split("/")[0],
                                repo: repo.name,
                                path: "README.md",
                              },
                            });
                            setActiveTab("playground");
                          }}
                          className="h-6 text-[11px] px-2 gap-1 text-purple-600 dark:text-purple-400"
                        >
                          <Play className="w-3 h-3" />
                          <span>Inspect README</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 4: TOOL PLAYGROUND ───────────────────────────────────────── */}
        {activeTab === "playground" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Tool Selector */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Select Tool to Run:
                </div>
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {allPlaygroundTools.map((tool, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectTool(tool)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex flex-col gap-0.5 ${
                        selectedTool.name === tool.name && selectedTool.serverId === tool.serverId
                          ? "bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 font-semibold"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold">{tool.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500 font-sans">
                          {tool.category}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 truncate">{tool.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Parameter Editor & Live Result */}
            <div className="lg:col-span-8 space-y-4">
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Tool Execution
                    </span>
                    <h3 className="font-mono text-base font-bold text-sky-600 dark:text-sky-400">
                      {selectedTool.name}
                    </h3>
                    <p className="text-xs text-slate-500">{selectedTool.description}</p>
                  </div>

                  <Button
                    onClick={handleExecutePlayground}
                    disabled={executingTool}
                    className="gap-2 shadow-lg shadow-sky-500/20"
                  >
                    {executingTool ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                    <span>{executingTool ? "Executing..." : "Execute Tool"}</span>
                  </Button>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    Tool Arguments (JSON):
                  </label>
                  <textarea
                    value={playgroundArgs}
                    onChange={(e) => setPlaygroundArgs(e.target.value)}
                    rows={5}
                    className="w-full p-3 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Execution Result Box */}
                {executionResult && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Result Output
                        </span>
                        {executionTime && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            ⚡ {executionTime}ms
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(executionResult, null, 2))}
                        className="text-xs h-7 gap-1"
                      >
                        {copiedResult ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedResult ? "Copied!" : "Copy JSON"}</span>
                      </Button>
                    </div>

                    <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto max-h-96 border border-slate-800">
                      {JSON.stringify(executionResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL: Add Remote MCP Server ─────────────────────────────────── */}
        {showAddServerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold">Connect Remote MCP Server</h3>
              </div>

              <p className="text-xs text-slate-500">
                Enter the remote Server-Sent Events (SSE) endpoint of any MCP server. The hub will connect, discover all available tools, and forward them seamlessly.
              </p>

              {addServerError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addServerError}</span>
                </div>
              )}

              <form onSubmit={handleAddRemoteServer} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Server Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. My Remote Tools, Postgres MCP"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Remote SSE Endpoint URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://my-remote-mcp.com/sse or http://localhost:8080/sse"
                    value={newServerUrl}
                    onChange={(e) => setNewServerUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Optional Authorization Header / API Key
                  </label>
                  <input
                    type="text"
                    placeholder="Bearer token or { &quot;X-API-Key&quot;: &quot;...&quot; }"
                    value={newServerHeader}
                    onChange={(e) => setNewServerHeader(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddServerModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" isLoading={addingServer} className="gap-1.5">
                    <span>Connect & Discover</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: Set GitHub Token ──────────────────────────────────────── */}
        {showTokenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center">
                  <Github className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold">Configure GitHub Access Token</h3>
              </div>

              <p className="text-xs text-slate-500">
                Enter a GitHub Personal Access Token (classic or fine-grained) with <code className="font-mono">repo</code> scope to allow the MCP server to inspect private repositories and search code.
              </p>

              {tokenFeedback && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{tokenFeedback}</span>
                </div>
              )}

              <form onSubmit={handleSaveGithubToken} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Personal Access Token (PAT)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTokenModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" isLoading={savingToken} className="gap-1.5">
                    <span>Verify & Save</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
