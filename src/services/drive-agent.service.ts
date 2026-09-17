import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from "@google/generative-ai";
import type { OAuth2Client } from "google-auth-library";
import { driveToolsService, DriveFileMetadata } from "./drive-tools.service";
import { googleTokenService } from "./google-token.service";

export interface ToolCallRecord {
  name: string;
  args: any;
  result: any;
}

export interface DriveAgentResponse {
  answer: string;
  sources: Array<{ fileName: string; fileId: string; mimeType?: string }>;
  toolCalls: ToolCallRecord[];
}

export class DriveAgentService {
  /**
   * Tool definitions for Gemini Function Calling
   */
  private getFunctionDeclarations(): FunctionDeclaration[] {
    return [
      {
        name: "searchDrive",
        description:
          "Search Google Drive files and documents by filename or fullText keywords. Returns metadata (id, name, mimeType, size).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description: "Search keywords or filename query to locate relevant Drive documents",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "readDriveFile",
        description:
          "Reads the full in-memory text content of a Google Drive file using its fileId and optional mimeType. Works on Docs, Sheets, PDFs, DOCX, and text.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fileId: {
              type: SchemaType.STRING,
              description: "The Google Drive file ID to read into memory",
            },
            mimeType: {
              type: SchemaType.STRING,
              description: "The MIME type of the file (e.g., application/pdf, application/vnd.google-apps.document)",
            },
          },
          required: ["fileId"],
        },
      },
    ];
  }

  /**
   * Runs the Google Drive AI Agent loop for a user query.
   */
  async runDriveAgent(params: {
    userId: string;
    authClient?: OAuth2Client;
    message: string;
    customToolsService?: typeof driveToolsService;
  }): Promise<DriveAgentResponse> {
    const { userId, message } = params;
    const toolsService = params.customToolsService || driveToolsService;

    // 1. Obtain authenticated client
    const auth = params.authClient || (await googleTokenService.getAuthenticatedClient(userId));

    const toolCalls: ToolCallRecord[] = [];
    const sourcesMap = new Map<string, { fileName: string; fileId: string; mimeType?: string }>();

    // 2. Check if Gemini API Key is available
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction:
            "You are an expert Google Drive AI Assistant. You help users answer questions by querying and reading their Google Drive files in real-time.\n\n" +
            "Protocol:\n" +
            "1. First call `searchDrive` with relevant query keywords extracted from the user's prompt to locate matching documents.\n" +
            "2. From the search results, call `readDriveFile` on only the most relevant document(s) (maximum 3 files) to extract their content into memory.\n" +
            "3. Answer the user's question accurately based on the extracted document content.\n" +
            "4. ALWAYS cite the document names you referenced in your final answer (e.g., [Document: filename]).\n" +
            "5. If no documents match or the answer is not found in the documents, state that clearly to the user.",
          tools: [{ functionDeclarations: this.getFunctionDeclarations() }],
        });

        const chat = model.startChat();
        let currentPrompt: any = message;
        let finalAnswer = "";

        // Multi-turn tool execution loop (max 5 iterations)
        for (let iteration = 0; iteration < 5; iteration++) {
          const result = await chat.sendMessage(currentPrompt);
          const response = result.response;
          const calls = response.functionCalls();

          if (!calls || calls.length === 0) {
            finalAnswer = response.text();
            break;
          }

          const functionResponses: any[] = [];

          for (const call of calls) {
            console.log(`[DriveAgent] Iteration ${iteration + 1} - Executing tool: ${call.name}`, call.args);

            if (call.name === "searchDrive") {
              const query = (call.args as any)?.query || "";
              const files = await toolsService.searchDrive(auth, query, 10);
              toolCalls.push({ name: "searchDrive", args: call.args, result: files });

              functionResponses.push({
                functionResponse: {
                  name: "searchDrive",
                  response: { files },
                },
              });
            } else if (call.name === "readDriveFile") {
              const fileId = (call.args as any)?.fileId;
              const mimeType = (call.args as any)?.mimeType;
              const fileContent = await toolsService.readDriveFile(auth, fileId, mimeType);

              sourcesMap.set(fileId, {
                fileName: fileContent.fileName,
                fileId: fileContent.fileId,
                mimeType: fileContent.mimeType,
              });

              toolCalls.push({
                name: "readDriveFile",
                args: call.args,
                result: {
                  fileName: fileContent.fileName,
                  charCount: fileContent.charCount,
                },
              });

              functionResponses.push({
                functionResponse: {
                  name: "readDriveFile",
                  response: {
                    fileId: fileContent.fileId,
                    fileName: fileContent.fileName,
                    content: fileContent.content,
                  },
                },
              });
            }
          }

          // Send function responses back to Gemini
          currentPrompt = functionResponses;
        }

        if (finalAnswer) {
          return {
            answer: finalAnswer,
            sources: Array.from(sourcesMap.values()),
            toolCalls,
          };
        }
      } catch (geminiError: any) {
        console.warn("[DriveAgent] Gemini tool execution encountered an error, running deterministic agent fallback:", geminiError);
      }
    }

    // 3. Deterministic Agent Execution Fallback (Offline / Test / Missing API key)
    console.log("[DriveAgent] Executing deterministic tool-calling flow...");
    const keywords = this.extractKeywords(message);

    // Step A: Tool searchDrive
    const searchResults = await toolsService.searchDrive(auth, keywords, 5);
    toolCalls.push({
      name: "searchDrive",
      args: { query: keywords },
      result: searchResults,
    });

    let answer = "";

    if (searchResults.length === 0) {
      answer = `I searched your Google Drive for **"${keywords}"**, but found no matching documents. Please verify that the file exists in your Drive or adjust your search keywords.`;
      return { answer, sources: [], toolCalls };
    }

    // Step B: Tool readDriveFile for top match(es)
    const topFile = searchResults[0];
    const readResult = await toolsService.readDriveFile(auth, topFile.id, topFile.mimeType);

    toolCalls.push({
      name: "readDriveFile",
      args: { fileId: topFile.id, mimeType: topFile.mimeType },
      result: { fileName: readResult.fileName, charCount: readResult.charCount },
    });

    sourcesMap.set(topFile.id, {
      fileName: readResult.fileName,
      fileId: readResult.fileId,
      mimeType: readResult.mimeType,
    });

    // Step C: Synthesize answer with citation
    const snippet = readResult.content.slice(0, 1500);
    answer = `## 📄 Google Drive Analysis: **${readResult.fileName}**\n\n` +
      `Based on the content in **${readResult.fileName}** in your Google Drive:\n\n` +
      `> ${snippet.replace(/\n+/g, "\n> ")}\n\n` +
      `*Source: [Document: ${readResult.fileName}]*`;

    return {
      answer,
      sources: Array.from(sourcesMap.values()),
      toolCalls,
    };
  }

  /**
   * Helper to extract search keywords from natural language prompts.
   */
  private extractKeywords(prompt: string): string {
    const cleaned = prompt
      .replace(/[?.,!":;()\[\]]/g, " ")
      .replace(/\b(what|where|how|why|when|who|is|was|were|are|the|a|an|in|on|of|for|about|to|from|our|my|your|their|drive|google|file|files|doc|docs|document|documents|tell|me|show|read|check|according)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned.length > 0 ? cleaned : prompt.trim();
  }
}

export const driveAgentService = new DriveAgentService();
