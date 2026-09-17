import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import * as fs from "fs";
import * as path from "path";

export interface RemoteServerConfig {
  id: string;
  name: string;
  url: string;
  headers?: Record<string, string>;
  createdAt: string;
}

export interface RemoteToolDefinition {
  serverId: string;
  serverName: string;
  name: string;
  description?: string;
  inputSchema?: any;
}

export interface RemoteServerStatus {
  id: string;
  name: string;
  url: string;
  status: "connected" | "error" | "connecting" | "disconnected";
  errorMessage?: string;
  toolCount: number;
  tools: RemoteToolDefinition[];
  connectedAt?: string;
}

class RemoteMCPManager {
  private configPath: string;
  private activeClients = new Map<
    string,
    {
      client: Client;
      transport: SSEClientTransport;
      tools: RemoteToolDefinition[];
      status: "connected" | "error" | "connecting" | "disconnected";
      errorMessage?: string;
      connectedAt?: string;
    }
  >();

  constructor() {
    const root = path.resolve(__dirname, "../..");
    this.configPath = path.join(root, ".mcp-servers.json");
  }

  /**
   * Load saved remote server configs from disk
   */
  getSavedConfigs(): RemoteServerConfig[] {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (err) {
      console.error("[RemoteMCPManager] Error reading config file:", err);
    }
    return [];
  }

  private saveConfigs(configs: RemoteServerConfig[]) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(configs, null, 2), "utf-8");
    } catch (err) {
      console.error("[RemoteMCPManager] Error writing config file:", err);
    }
  }

  /**
   * Initialize and connect all saved servers on startup
   */
  async initAll() {
    const configs = this.getSavedConfigs();
    for (const conf of configs) {
      try {
        await this.connect(conf, false);
      } catch (err: any) {
        console.warn(`[RemoteMCPManager] Could not auto-connect ${conf.name} (${conf.url}):`, err.message);
      }
    }
  }

  /**
   * Connect to a remote MCP server via SSE
   */
  async connect(
    config: Omit<RemoteServerConfig, "id" | "createdAt"> & { id?: string },
    persist = true
  ): Promise<RemoteServerStatus> {
    const id = config.id || `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullConfig: RemoteServerConfig = {
      id,
      name: config.name,
      url: config.url,
      headers: config.headers,
      createdAt: new Date().toISOString(),
    };

    // Clean up existing connection if re-connecting
    if (this.activeClients.has(id)) {
      await this.disconnect(id, false);
    }

    const transportHeaders: Record<string, string> = {
      ...config.headers,
    };

    try {
      const urlObj = new URL(config.url);
      const transport = new SSEClientTransport(urlObj, {
        eventSourceInit: {
          headers: transportHeaders,
        } as any,
        requestInit: {
          headers: transportHeaders,
        },
      });

      const client = new Client(
        {
          name: "local-docs-assistant-client",
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      // Connect with 15s timeout
      const connectPromise = client.connect(transport);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout (15s)")), 15000)
      );

      await Promise.race([connectPromise, timeoutPromise]);

      // Discover remote tools
      const toolsResponse = await client.listTools();
      const discoveredTools: RemoteToolDefinition[] = (toolsResponse.tools || []).map((t) => ({
        serverId: id,
        serverName: config.name,
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));

      this.activeClients.set(id, {
        client,
        transport,
        tools: discoveredTools,
        status: "connected",
        connectedAt: new Date().toISOString(),
      });

      if (persist) {
        const saved = this.getSavedConfigs().filter((c) => c.id !== id);
        saved.push(fullConfig);
        this.saveConfigs(saved);
      }

      return {
        id,
        name: config.name,
        url: config.url,
        status: "connected",
        toolCount: discoveredTools.length,
        tools: discoveredTools,
        connectedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      const errorMessage = err.message || String(err);
      this.activeClients.set(id, {
        client: null as any,
        transport: null as any,
        tools: [],
        status: "error",
        errorMessage,
      });

      if (persist) {
        const saved = this.getSavedConfigs().filter((c) => c.id !== id);
        saved.push(fullConfig);
        this.saveConfigs(saved);
      }

      return {
        id,
        name: config.name,
        url: config.url,
        status: "error",
        errorMessage,
        toolCount: 0,
        tools: [],
      };
    }
  }

  /**
   * Disconnect and optionally remove a remote server
   */
  async disconnect(id: string, removeFromConfig = true): Promise<boolean> {
    const existing = this.activeClients.get(id);
    if (existing) {
      try {
        if (existing.client) {
          await existing.client.close();
        }
      } catch (err) {
        console.warn(`[RemoteMCPManager] Error closing client for ${id}:`, err);
      }
      this.activeClients.delete(id);
    }

    if (removeFromConfig) {
      const saved = this.getSavedConfigs().filter((c) => c.id !== id);
      this.saveConfigs(saved);
    }

    return true;
  }

  /**
   * List all configured remote servers and their live connection status
   */
  async listServers(): Promise<RemoteServerStatus[]> {
    const configs = this.getSavedConfigs();
    const results: RemoteServerStatus[] = [];

    for (const conf of configs) {
      const active = this.activeClients.get(conf.id);
      if (active && active.status === "connected") {
        results.push({
          id: conf.id,
          name: conf.name,
          url: conf.url,
          status: "connected",
          toolCount: active.tools.length,
          tools: active.tools,
          connectedAt: active.connectedAt,
        });
      } else if (active && active.status === "error") {
        results.push({
          id: conf.id,
          name: conf.name,
          url: conf.url,
          status: "error",
          errorMessage: active.errorMessage,
          toolCount: 0,
          tools: [],
        });
      } else {
        results.push({
          id: conf.id,
          name: conf.name,
          url: conf.url,
          status: "disconnected",
          toolCount: 0,
          tools: [],
        });
      }
    }

    return results;
  }

  /**
   * Get all tools aggregated across all active remote servers
   */
  getAllRemoteTools(): RemoteToolDefinition[] {
    const all: RemoteToolDefinition[] = [];
    Array.from(this.activeClients.values()).forEach((item) => {
      if (item.status === "connected" && item.tools) {
        all.push(...item.tools);
      }
    });
    return all;
  }

  /**
   * Execute a tool on a specific remote server
   */
  async executeTool(serverId: string, toolName: string, args: any = {}) {
    const entry = this.activeClients.get(serverId);
    if (!entry || entry.status !== "connected" || !entry.client) {
      // If server is saved but not active in memory, attempt auto-reconnect
      const config = this.getSavedConfigs().find((c) => c.id === serverId);
      if (config) {
        const reconnected = await this.connect(config, false);
        if (reconnected.status !== "connected") {
          throw new Error(`Remote MCP server "${config.name}" is not reachable: ${reconnected.errorMessage}`);
        }
      } else {
        throw new Error(`Remote MCP server with ID "${serverId}" not found or not connected.`);
      }
    }

    const liveEntry = this.activeClients.get(serverId)!;
    const result = await liveEntry.client.callTool({
      name: toolName,
      arguments: args,
    });

    return result;
  }
}

export const remoteMCPManager = new RemoteMCPManager();
