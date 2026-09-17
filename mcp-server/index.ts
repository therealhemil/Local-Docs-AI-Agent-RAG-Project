#!/usr/bin/env node
/**
 * AI Document Assistant — Universal MCP Server v3.0
 *
 * Supports:
 * 1. Remote MCP Servers (SSE / HTTP dynamic tool proxy & aggregator)
 * 2. Remote GitHub Integration (Repositories, Files, Code Search, Q&A)
 * 3. Remote Google Drive Integration (Docs, Sheets, PDFs, Direct Q&A)
 * 4. Local Database & Workspace RAG (Uploaded docs, conversations, users)
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// ─── Load .env files from project root ───────────────────────────────────────
const root = path.resolve(__dirname, "..");
const envLocalPath = path.join(root, ".env.local");
const envPath = path.join(root, ".env");
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false });

// ─── Managers & Tools ─────────────────────────────────────────────────────────
import { remoteMCPManager } from "./lib/remote-mcp";
import {
  githubGetStatus,
  githubListRepos,
  githubGetFile,
  githubSearchCode,
  askAboutGithub,
} from "./tools/github";
import {
  getDriveStatus,
  listDriveFiles,
  searchDrive,
  readDriveFile,
  askAboutDrive,
} from "./tools/drive";
import {
  listDocuments,
  getDocumentInfo,
  getDocumentStats,
} from "./tools/documents";
import { listConversations, getConversation } from "./tools/conversations";
import { askQuestion } from "./tools/ask";
import { getUserInfo } from "./tools/users";

function getDefaultUserId(): string {
  const id = process.env.MCP_DEFAULT_USER_ID;
  if (!id) {
    throw new Error(
      "MCP_DEFAULT_USER_ID is not set. Add it to .env.local.\n" +
        "Find it: log into the app → DevTools console → fetch('/api/users/me').then(r=>r.json()).then(d=>console.log(d.user.id))"
    );
  }
  return id;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────
const OptUserId = z.object({ userId: z.string().uuid().optional() }).optional();
const DocIdSchema = z.object({
  documentId: z.string().uuid(),
  userId: z.string().uuid().optional(),
});
const ConvoIdSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid().optional(),
});
const AskSchema = z.object({
  question: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

// Drive schemas
const DriveListSchema = z.object({
  folderId: z.string().optional(),
  maxResults: z.number().int().min(1).max(100).optional(),
  fileType: z.string().optional(),
});
const DriveSearchSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().min(1).max(50).optional(),
});
const DriveReadSchema = z.object({ fileId: z.string().min(1) });
const DriveAskSchema = z.object({
  question: z.string().min(1),
  fileIds: z.array(z.string()).optional(),
  searchQuery: z.string().optional(),
  folderId: z.string().optional(),
  userId: z.string().uuid().optional(),
});

// GitHub schemas
const GithubRepoSchema = z.object({
  username: z.string().optional(),
  visibility: z.enum(["all", "public", "private"]).optional(),
  maxResults: z.number().int().min(1).max(100).optional(),
  customToken: z.string().optional(),
});
const GithubFileSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z.string().min(1),
  ref: z.string().optional(),
  customToken: z.string().optional(),
});
const GithubSearchSchema = z.object({
  query: z.string().min(1),
  repo: z.string().optional(),
  maxResults: z.number().int().min(1).max(50).optional(),
  customToken: z.string().optional(),
});
const GithubAskSchema = z.object({
  question: z.string().min(1),
  owner: z.string().min(1),
  repo: z.string().min(1),
  paths: z.array(z.string()).optional(),
  ref: z.string().optional(),
  customToken: z.string().optional(),
});

// Remote MCP Management schemas
const RemoteAddSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
});
const RemoteCallSchema = z.object({
  serverId: z.string().min(1),
  toolName: z.string().min(1),
  arguments: z.record(z.any()).optional(),
});
const RemoteRemoveSchema = z.object({ serverId: z.string().min(1) });

// ─── Server Instance ──────────────────────────────────────────────────────────
const server = new Server(
  { name: "local-docs-assistant-hub", version: "3.0.0" },
  { capabilities: { tools: {} } }
);

// ─── List Tools Handler ───────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const baseTools = [
    // ── Remote MCP Manager Tools ──────────────────────────────────────────────
    {
      name: "mcp_list_remote_servers",
      description:
        "List all configured remote MCP servers, their connection status, and discovered tools.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "mcp_add_remote_server",
      description:
        "Connect to a remote MCP server via SSE URL and discover its tools dynamically.",
      inputSchema: {
        type: "object",
        required: ["name", "url"],
        properties: {
          name: { type: "string", description: "Display name for the remote MCP server" },
          url: { type: "string", description: "Remote SSE URL (e.g., http://localhost:8080/sse or https://...)" },
          headers: { type: "object", description: "Optional HTTP headers (e.g., Authorization: Bearer <token>)" },
        },
      },
    },
    {
      name: "mcp_call_remote_tool",
      description: "Execute a tool on any connected remote MCP server.",
      inputSchema: {
        type: "object",
        required: ["serverId", "toolName"],
        properties: {
          serverId: { type: "string", description: "Remote server ID from mcp_list_remote_servers" },
          toolName: { type: "string", description: "Name of the tool on the remote server" },
          arguments: { type: "object", description: "Arguments matching the remote tool schema" },
        },
      },
    },
    {
      name: "mcp_remove_remote_server",
      description: "Disconnect and remove a remote MCP server configuration.",
      inputSchema: {
        type: "object",
        required: ["serverId"],
        properties: {
          serverId: { type: "string", description: "Remote server ID to disconnect" },
        },
      },
    },

    // ── GitHub Remote Tools ───────────────────────────────────────────────────
    {
      name: "github_get_status",
      description: "Check GitHub connection status, rate limits, and authenticated account details.",
      inputSchema: { type: "object", properties: { customToken: { type: "string" } } },
    },
    {
      name: "github_list_repos",
      description: "List repositories from GitHub (user or organization).",
      inputSchema: {
        type: "object",
        properties: {
          username: { type: "string", description: "GitHub username (leave empty for authenticated user)" },
          visibility: { type: "string", enum: ["all", "public", "private"] },
          maxResults: { type: "number" },
          customToken: { type: "string" },
        },
      },
    },
    {
      name: "github_get_file",
      description: "Get content of a file or directory tree directly from any GitHub repository.",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "path"],
        properties: {
          owner: { type: "string", description: "Repository owner / organization" },
          repo: { type: "string", description: "Repository name" },
          path: { type: "string", description: "Path to file or folder (e.g., README.md, src/index.ts)" },
          ref: { type: "string", description: "Branch or commit hash (default main/master)" },
          customToken: { type: "string" },
        },
      },
    },
    {
      name: "github_search_code",
      description: "Search for code snippets across GitHub repositories.",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "Search query" },
          repo: { type: "string", description: "Limit search to owner/repo (optional)" },
          maxResults: { type: "number" },
          customToken: { type: "string" },
        },
      },
    },
    {
      name: "ask_about_github",
      description: "Ask the AI a question about a GitHub repository's code, structure, or documentation.",
      inputSchema: {
        type: "object",
        required: ["question", "owner", "repo"],
        properties: {
          question: { type: "string", description: "Question to ask about the repository" },
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          paths: { type: "array", items: { type: "string" }, description: "Specific files to inspect (default README.md)" },
          ref: { type: "string" },
          customToken: { type: "string" },
        },
      },
    },

    // ── Google Drive Remote Tools ─────────────────────────────────────────────
    {
      name: "get_drive_status",
      description: "Check if Google Drive is connected to the MCP server.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_drive_files",
      description: "List files directly from Google Drive without manual upload.",
      inputSchema: {
        type: "object",
        properties: {
          folderId: { type: "string" },
          maxResults: { type: "number" },
          fileType: { type: "string" },
        },
      },
    },
    {
      name: "search_drive",
      description: "Search Google Drive files by name.",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: { query: { type: "string" }, maxResults: { type: "number" } },
      },
    },
    {
      name: "read_drive_file",
      description: "Extract readable text from Google Docs, Sheets, PDFs, DOCX, or text files.",
      inputSchema: {
        type: "object",
        required: ["fileId"],
        properties: { fileId: { type: "string" } },
      },
    },
    {
      name: "ask_about_drive",
      description: "Ask AI a question about your Google Drive documents directly.",
      inputSchema: {
        type: "object",
        required: ["question"],
        properties: {
          question: { type: "string" },
          fileIds: { type: "array", items: { type: "string" } },
          searchQuery: { type: "string" },
          folderId: { type: "string" },
          userId: { type: "string" },
        },
      },
    },

    // ── Local Database & Workspace Tools ──────────────────────────────────────
    {
      name: "list_documents",
      description: "List documents uploaded to the local web workspace.",
      inputSchema: { type: "object", properties: { userId: { type: "string" } } },
    },
    {
      name: "get_document_info",
      description: "Get metadata for a specific uploaded document.",
      inputSchema: {
        type: "object",
        required: ["documentId"],
        properties: { documentId: { type: "string" }, userId: { type: "string" } },
      },
    },
    {
      name: "get_document_stats",
      description: "Count uploaded documents by status (READY, PROCESSING, FAILED).",
      inputSchema: { type: "object", properties: { userId: { type: "string" } } },
    },
    {
      name: "list_conversations",
      description: "List all chat conversations for the user.",
      inputSchema: { type: "object", properties: { userId: { type: "string" } } },
    },
    {
      name: "get_conversation",
      description: "Get full message history of a conversation.",
      inputSchema: {
        type: "object",
        required: ["conversationId"],
        properties: { conversationId: { type: "string" }, userId: { type: "string" } },
      },
    },
    {
      name: "ask_question",
      description: "Ask question about uploaded workspace documents via n8n RAG pipeline.",
      inputSchema: {
        type: "object",
        required: ["question"],
        properties: {
          question: { type: "string" },
          conversationId: { type: "string" },
          userId: { type: "string" },
        },
      },
    },
    {
      name: "get_user_info",
      description: "Get user profile and workspace activity stats.",
      inputSchema: { type: "object", properties: { userId: { type: "string" } } },
    },
  ];

  // Dynamically merge remote tools from active remote servers
  const remoteTools = remoteMCPManager.getAllRemoteTools().map((t) => ({
    name: `remote_${t.serverName.toLowerCase().replace(/[^a-z0-9_]/g, "_")}_${t.name}`,
    description: `[Remote: ${t.serverName}] ${t.description || ""}`,
    inputSchema: t.inputSchema || { type: "object", properties: {} },
  }));

  return { tools: [...baseTools, ...remoteTools] };
});

// ─── Call Tool Handler ────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const ok = (data: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  });

  const err = (message: string) => ({
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  });

  try {
    // Check if it's a dynamically forwarded remote tool: remote_<server>_<tool>
    if (name.startsWith("remote_")) {
      const allTools = remoteMCPManager.getAllRemoteTools();
      const matched = allTools.find((t) => {
        const generatedName = `remote_${t.serverName.toLowerCase().replace(/[^a-z0-9_]/g, "_")}_${t.name}`;
        return generatedName === name;
      });

      if (matched) {
        const result = await remoteMCPManager.executeTool(matched.serverId, matched.name, args);
        return result;
      }
    }

    switch (name) {
      // ── Remote MCP Manager ──────────────────────────────────────────────────
      case "mcp_list_remote_servers": {
        const servers = await remoteMCPManager.listServers();
        return ok({ total: servers.length, servers });
      }
      case "mcp_add_remote_server": {
        const p = RemoteAddSchema.parse(args);
        const result = await remoteMCPManager.connect(p, true);
        return ok(result);
      }
      case "mcp_call_remote_tool": {
        const p = RemoteCallSchema.parse(args);
        const result = await remoteMCPManager.executeTool(p.serverId, p.toolName, p.arguments || {});
        return result;
      }
      case "mcp_remove_remote_server": {
        const p = RemoteRemoveSchema.parse(args);
        await remoteMCPManager.disconnect(p.serverId, true);
        return ok({ success: true, message: `Removed remote server ${p.serverId}` });
      }

      // ── GitHub Tools ────────────────────────────────────────────────────────
      case "github_get_status": {
        const token = (args as any)?.customToken;
        return ok(await githubGetStatus(token));
      }
      case "github_list_repos": {
        const p = GithubRepoSchema.parse(args ?? {});
        return ok(await githubListRepos(p));
      }
      case "github_get_file": {
        const p = GithubFileSchema.parse(args);
        return ok(await githubGetFile(p));
      }
      case "github_search_code": {
        const p = GithubSearchSchema.parse(args);
        return ok(await githubSearchCode(p));
      }
      case "ask_about_github": {
        const p = GithubAskSchema.parse(args);
        return ok(await askAboutGithub(p));
      }

      // ── Google Drive Tools ──────────────────────────────────────────────────
      case "get_drive_status":
        return ok(await getDriveStatus());
      case "list_drive_files": {
        const p = DriveListSchema.parse(args ?? {});
        return ok(await listDriveFiles(p));
      }
      case "search_drive": {
        const p = DriveSearchSchema.parse(args);
        return ok(await searchDrive(p));
      }
      case "read_drive_file": {
        const p = DriveReadSchema.parse(args);
        return ok(await readDriveFile(p));
      }
      case "ask_about_drive": {
        const p = DriveAskSchema.parse(args);
        return ok(await askAboutDrive({ ...p, userId: p.userId ?? process.env.MCP_DEFAULT_USER_ID }));
      }

      // ── Database Tools ──────────────────────────────────────────────────────
      case "list_documents": {
        const p = OptUserId.parse(args);
        return ok(await listDocuments(p?.userId ?? getDefaultUserId()));
      }
      case "get_document_info": {
        const { documentId, userId } = DocIdSchema.parse(args);
        return ok(await getDocumentInfo(userId ?? getDefaultUserId(), documentId));
      }
      case "get_document_stats": {
        const p = OptUserId.parse(args);
        return ok(await getDocumentStats(p?.userId ?? getDefaultUserId()));
      }
      case "list_conversations": {
        const p = OptUserId.parse(args);
        return ok(await listConversations(p?.userId ?? getDefaultUserId()));
      }
      case "get_conversation": {
        const { conversationId, userId } = ConvoIdSchema.parse(args);
        return ok(await getConversation(userId ?? getDefaultUserId(), conversationId));
      }
      case "ask_question": {
        const { question, conversationId, userId } = AskSchema.parse(args);
        return ok(await askQuestion({ userId: userId ?? getDefaultUserId(), question, conversationId }));
      }
      case "get_user_info": {
        const p = OptUserId.parse(args);
        return ok(await getUserInfo(p?.userId ?? getDefaultUserId()));
      }

      default:
        return err(`Unknown tool: ${name}`);
    }
  } catch (e: any) {
    return err(e.message ?? String(e));
  }
});

// ─── Start MCP Server ─────────────────────────────────────────────────────────
async function main() {
  // Connect saved remote servers in the background
  remoteMCPManager.initAll().catch((err) => {
    process.stderr.write(`[MCP] Remote server auto-connect notice: ${err.message}\n`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[MCP] Universal AI Document Assistant & Remote MCP Hub v3.0 running\n");
}

main().catch((e) => {
  process.stderr.write(`[MCP] Fatal error: ${e}\n`);
  process.exit(1);
});
