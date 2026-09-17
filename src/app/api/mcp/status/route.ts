import { NextResponse } from "next/server";
import { googleDriveService } from "@/services/google-drive.service";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
  try {
    // 1. Google Drive Status
    const isDriveConfigured =
      Boolean(process.env.GOOGLE_CLIENT_ID) &&
      Boolean(process.env.GOOGLE_CLIENT_SECRET) &&
      Boolean(process.env.GOOGLE_DRIVE_REFRESH_TOKEN);

    const driveInfo = {
      configured: isDriveConfigured,
      rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null,
      mcpFolderId: process.env.MCP_DRIVE_FOLDER_ID || null,
      hasRefreshToken: Boolean(process.env.GOOGLE_DRIVE_REFRESH_TOKEN),
    };

    // 2. GitHub Status
    const githubToken =
      process.env.GITHUB_TOKEN ||
      process.env.GITHUB_PERSONAL_ACCESS_TOKEN ||
      process.env.GITHUB_PAT;

    let githubInfo: any = {
      configured: Boolean(githubToken),
      authenticated: false,
    };

    if (githubToken) {
      try {
        const ghRes = await axios.get("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Local-Docs-AI-Agent",
          },
          timeout: 5000,
        });
        githubInfo = {
          configured: true,
          authenticated: true,
          username: ghRes.data.login,
          name: ghRes.data.name,
          avatarUrl: ghRes.data.avatar_url,
          publicRepos: ghRes.data.public_repos,
          privateRepos: ghRes.data.total_private_repos || 0,
        };
      } catch (err: any) {
        githubInfo = {
          configured: true,
          authenticated: false,
          error: err.response?.data?.message || err.message,
        };
      }
    }

    // 3. Remote MCP Servers Status (from .mcp-servers.json)
    let remoteServers: any[] = [];
    const configPath = path.join(process.cwd(), ".mcp-servers.json");
    if (fs.existsSync(configPath)) {
      try {
        remoteServers = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      } catch {
        remoteServers = [];
      }
    }

    // 4. Database & AI Webhooks
    let dbConnected = false;
    let docCount = 0;
    try {
      docCount = await prisma.document.count();
      dbConnected = true;
    } catch {
      dbConnected = false;
    }

    const n8nConfigured = Boolean(process.env.N8N_USER_MESSAGE_QUESTION_API);
    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);

    return NextResponse.json({
      googleDrive: driveInfo,
      github: githubInfo,
      remoteServers: {
        total: remoteServers.length,
        servers: remoteServers,
      },
      system: {
        database: dbConnected,
        workspaceDocuments: docCount,
        n8nWebhook: n8nConfigured,
        geminiFallback: geminiConfigured,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch status" }, { status: 500 });
  }
}
