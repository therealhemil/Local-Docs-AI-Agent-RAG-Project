import { NextRequest, NextResponse } from "next/server";
import {
  getDriveStatus,
  listDriveFiles,
  searchDrive,
  readDriveFile,
  askAboutDrive,
} from "../../../../../mcp-server/tools/drive";
import {
  githubGetStatus,
  githubListRepos,
  githubGetFile,
  githubSearchCode,
  askAboutGithub,
} from "../../../../../mcp-server/tools/github";
import {
  listDocuments,
  getDocumentInfo,
  getDocumentStats,
} from "../../../../../mcp-server/tools/documents";
import {
  listConversations,
  getConversation,
} from "../../../../../mcp-server/tools/conversations";
import { askQuestion } from "../../../../../mcp-server/tools/ask";
import { getUserInfo } from "../../../../../mcp-server/tools/users";
import { remoteMCPManager } from "../../../../../mcp-server/lib/remote-mcp";
import { getCurrentSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getCurrentSession(req);
    const userId = session?.userId || process.env.MCP_DEFAULT_USER_ID || "anonymous";

    const body = await req.json();
    const { serverId, toolName, arguments: toolArgs = {} } = body;

    if (!toolName) {
      return NextResponse.json({ error: "toolName is required" }, { status: 400 });
    }

    let result: any = null;

    // 1. If targeting a remote MCP server
    if (serverId && serverId !== "local") {
      result = await remoteMCPManager.executeTool(serverId, toolName, toolArgs);
      return NextResponse.json({
        success: true,
        toolName,
        serverId,
        executionTimeMs: Date.now() - startTime,
        result,
      });
    }

    // 2. Dispatch to built-in local & cloud tools
    switch (toolName) {
      // ── Google Drive ──
      case "get_drive_status":
        result = await getDriveStatus();
        break;
      case "list_drive_files":
        result = await listDriveFiles(toolArgs);
        break;
      case "search_drive":
        result = await searchDrive(toolArgs);
        break;
      case "read_drive_file":
        result = await readDriveFile(toolArgs);
        break;
      case "ask_about_drive":
        result = await askAboutDrive({ ...toolArgs, userId });
        break;

      // ── GitHub ──
      case "github_get_status":
        result = await githubGetStatus(toolArgs.customToken);
        break;
      case "github_list_repos":
        result = await githubListRepos(toolArgs);
        break;
      case "github_get_file":
        result = await githubGetFile(toolArgs);
        break;
      case "github_search_code":
        result = await githubSearchCode(toolArgs);
        break;
      case "ask_about_github":
        result = await askAboutGithub(toolArgs);
        break;

      // ── Database & Workspace ──
      case "list_documents":
        result = await listDocuments(toolArgs.userId || userId);
        break;
      case "get_document_info":
        result = await getDocumentInfo(toolArgs.userId || userId, toolArgs.documentId);
        break;
      case "get_document_stats":
        result = await getDocumentStats(toolArgs.userId || userId);
        break;
      case "list_conversations":
        result = await listConversations(toolArgs.userId || userId);
        break;
      case "get_conversation":
        result = await getConversation(toolArgs.userId || userId, toolArgs.conversationId);
        break;
      case "ask_question":
        result = await askQuestion({ ...toolArgs, userId: toolArgs.userId || userId });
        break;
      case "get_user_info":
        result = await getUserInfo(toolArgs.userId || userId);
        break;

      default:
        throw new Error(`Unrecognized tool: ${toolName}`);
    }

    return NextResponse.json({
      success: true,
      toolName,
      executionTimeMs: Date.now() - startTime,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        executionTimeMs: Date.now() - startTime,
        error: error.message || "Execution failed",
      },
      { status: 500 }
    );
  }
}
