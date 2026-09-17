import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const configPath = path.join(process.cwd(), ".mcp-servers.json");

function getSavedConfigs(): any[] {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch {
    // Ignore error
  }
  return [];
}

function saveConfigs(configs: any[]) {
  fs.writeFileSync(configPath, JSON.stringify(configs, null, 2), "utf-8");
}

export async function GET() {
  const configs = getSavedConfigs();
  const results = [];

  for (const conf of configs) {
    try {
      // Test remote connection & discover tools with a fast 4s timeout
      const urlObj = new URL(conf.url);
      const transport = new SSEClientTransport(urlObj, {
        eventSourceInit: { headers: conf.headers || {} } as any,
        requestInit: { headers: conf.headers || {} },
      });

      const client = new Client(
        { name: "web-ui-checker", version: "1.0.0" },
        { capabilities: {} }
      );

      const connectPromise = client.connect(transport);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 4000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      const toolsRes = await client.listTools();
      await client.close();

      results.push({
        id: conf.id,
        name: conf.name,
        url: conf.url,
        status: "connected",
        tools: (toolsRes.tools || []).map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
        createdAt: conf.createdAt,
      });
    } catch (err: any) {
      results.push({
        id: conf.id,
        name: conf.name,
        url: conf.url,
        status: "error",
        errorMessage: err.message || "Failed to reach remote MCP server",
        tools: conf.cachedTools || [],
        createdAt: conf.createdAt,
      });
    }
  }

  return NextResponse.json({ servers: results });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url, headers } = body;

    if (!name || !url) {
      return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });
    }

    // Validate URL format
    const urlObj = new URL(url);

    // Test live connection to verify it is an active MCP endpoint
    let discoveredTools: any[] = [];
    let connectionError: string | null = null;

    try {
      const transport = new SSEClientTransport(urlObj, {
        eventSourceInit: { headers: headers || {} } as any,
        requestInit: { headers: headers || {} },
      });

      const client = new Client(
        { name: "web-ui-tester", version: "1.0.0" },
        { capabilities: {} }
      );

      const connectPromise = client.connect(transport);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout after 8 seconds")), 8000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      const toolsRes = await client.listTools();
      discoveredTools = (toolsRes.tools || []).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));
      await client.close();
    } catch (err: any) {
      connectionError = err.message || "Could not connect to remote SSE server";
    }

    const id = `remote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newConfig = {
      id,
      name,
      url,
      headers: headers || {},
      cachedTools: discoveredTools,
      createdAt: new Date().toISOString(),
    };

    const existing = getSavedConfigs().filter((c) => c.url !== url);
    existing.push(newConfig);
    saveConfigs(existing);

    return NextResponse.json({
      server: {
        ...newConfig,
        status: connectionError ? "warning" : "connected",
        message: connectionError
          ? `Server saved, but live test reported: ${connectionError}`
          : `Successfully connected! Discovered ${discoveredTools.length} tools.`,
        tools: discoveredTools,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing server ID" }, { status: 400 });
    }

    const saved = getSavedConfigs().filter((c) => c.id !== id);
    saveConfigs(saved);

    return NextResponse.json({ success: true, message: "Remote server removed" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
  }
}
