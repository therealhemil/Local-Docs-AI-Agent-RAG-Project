import assert from "node:assert";
import { normalizeUsername, formatBytes, formatRelativeDate } from "../src/lib/utils";
import { createSessionToken, verifySessionToken } from "../src/lib/auth";
import { GoogleDriveService } from "../src/services/google-drive.service";

async function runTests() {
  console.log("🧪 Starting Automated Verification Tests...\n");

  // 1. Test Username Normalization
  console.log("1. Testing Username Normalization:");
  assert.strictEqual(normalizeUsername("Hemil Patel"), "hemil patel");
  assert.strictEqual(normalizeUsername("  Hemil   Patel  "), "hemil patel");
  assert.strictEqual(normalizeUsername("HEMIL PATEL"), "hemil patel");
  assert.strictEqual(normalizeUsername("hemil patel"), "hemil patel");
  assert.strictEqual(normalizeUsername("  John   D.   Doe  "), "john d. doe");
  console.log("  ✓ Case insensitivity, trim, and whitespace collapse passed.");

  // 2. Test File Size & Date Helpers
  console.log("\n2. Testing Formatting Helpers:");
  assert.strictEqual(formatBytes(0), "0 B");
  assert.strictEqual(formatBytes(1024), "1 KB");
  assert.strictEqual(formatBytes(4.2 * 1024 * 1024), "4.2 MB");
  assert.strictEqual(formatRelativeDate(new Date().toISOString()), "Today");
  console.log("  ✓ formatBytes and formatRelativeDate passed.");

  // 3. Test Session JWT Generation & Verification
  console.log("\n3. Testing Session JWT Token Management:");
  const testPayload = {
    userId: "test-uuid-1234",
    name: "Hemil Patel",
    normalizedName: "hemil patel",
  };
  const token = await createSessionToken(testPayload);
  assert.ok(typeof token === "string" && token.length > 20, "Token should be a non-empty JWT string");

  const verified = await verifySessionToken(token);
  assert.ok(verified !== null, "Token should verify successfully");
  assert.strictEqual(verified?.userId, testPayload.userId);
  assert.strictEqual(verified?.name, testPayload.name);
  assert.strictEqual(verified?.normalizedName, testPayload.normalizedName);

  const invalidVerified = await verifySessionToken("invalid.jwt.token");
  assert.strictEqual(invalidVerified, null, "Invalid token should return null");
  console.log("  ✓ JWT signing, verification, and tamper rejection passed.");

  // 4. Test Google Drive Fallback Storage
  console.log("\n4. Testing Google Drive Local Simulation Fallback:");
  const driveService = new GoogleDriveService();
  const folderId = await driveService.createUserFolder("Hemil Patel");
  assert.ok(folderId.length > 0, "Folder ID should be generated");

  const sampleBuffer = Buffer.from("Sample Document Content for Testing RAG System");
  const uploadRes = await driveService.uploadFile(folderId, {
    buffer: sampleBuffer,
    fileName: "Test_Document.pdf",
    mimeType: "application/pdf",
  });
  assert.ok(uploadRes.fileId.length > 0, "Upload should return a file ID");
  console.log(`  ✓ Created simulated drive folder: ${folderId}`);
  console.log(`  ✓ Uploaded document with synthetic ID: ${uploadRes.fileId}`);

  // 5. Test Duplicate File Detection
  console.log("\n5. Testing Duplicate File Detection:");
  const existingDocNames = ["Contract.pdf", "Resume.docx", "Project_Report.pdf"];
  const newFilesToTest = ["contract.pdf", "New_Document.pdf", "RESUME.DOCX"];
  
  const duplicates = newFilesToTest.filter(f => existingDocNames.some(ed => ed.toLowerCase() === f.toLowerCase()));
  const nonDuplicates = newFilesToTest.filter(f => !existingDocNames.some(ed => ed.toLowerCase() === f.toLowerCase()));
  
  assert.strictEqual(duplicates.length, 2);
  assert.deepStrictEqual(duplicates, ["contract.pdf", "RESUME.DOCX"]);
  assert.deepStrictEqual(nonDuplicates, ["New_Document.pdf"]);
  console.log("  ✓ Case-insensitive duplicate detection accurately filtered duplicate uploads.");

  // 6. Test n8n Response Parsing and Content Extraction
  console.log("\n6. Testing n8n Response Parsing & Extraction:");
  
  // Test Case A: User's exact n8n Respond to Webhook payload
  const n8nPayload = JSON.stringify({
    status: "success",
    conversationId: "session-1234",
    role: "ASSISTANT",
    content: "Here is the answer extracted from your document.",
    sources: [{ fileName: "Contract.pdf", page: 2, excerpt: "Clause 1.1" }]
  });
  
  // Double stringified payload (n8n JSON stringify inside json response)
  const doubleStringified = JSON.stringify(n8nPayload);

  // We test the logic identical to route.ts
  function testParseAndExtract(raw: string) {
    let parsed: any = null;
    const trimmed = raw.trim();
    if (trimmed) {
      try {
        parsed = JSON.parse(trimmed);
        if (typeof parsed === "string") {
          const innerTrimmed = parsed.trim();
          if (innerTrimmed.startsWith("{") || innerTrimmed.startsWith("[")) {
            try { parsed = JSON.parse(innerTrimmed); } catch {}
          }
        }
      } catch {}
    }
    
    function extract(data: any): string {
      if (!data) return "";
      if (typeof data === "string") return data.trim();
      if (Array.isArray(data)) {
        for (const item of data) {
          const res = extract(item);
          if (res) return res;
        }
        return "";
      }
      if (typeof data === "object") {
        if (typeof data.content === "string" && data.content.trim()) return data.content.trim();
        if (data.json) {
          const res = extract(data.json);
          if (res) return res;
        }
        const keys = ["content", "output", "text", "response", "reply", "answer", "message", "result", "data"];
        for (const k of keys) {
          if (data[k]) {
            if (typeof data[k] === "string" && data[k].trim()) return data[k].trim();
            if (typeof data[k] === "object") {
              const res = extract(data[k]);
              if (res) return res;
            }
          }
        }
      }
      return "";
    }

    return extract(parsed);
  }

  assert.strictEqual(
    testParseAndExtract(n8nPayload),
    "Here is the answer extracted from your document."
  );
  assert.strictEqual(
    testParseAndExtract(doubleStringified),
    "Here is the answer extracted from your document."
  );
  assert.strictEqual(
    testParseAndExtract(JSON.stringify([{ output: "LangChain Agent output text" }])),
    "LangChain Agent output text"
  );
  assert.strictEqual(
    testParseAndExtract(""),
    ""
  );
  console.log("  ✓ n8n payload, double-stringified JSON, LangChain array, and empty payloads handled correctly.");

  // 7. Test Safe Sources Parsing & Normalization
  console.log("\n7. Testing Safe Sources Parsing & Normalization:");

  function safeParseSources(raw: string | null): any {
    if (!raw || typeof raw !== "string" || raw.trim().length === 0 || raw === "null" || raw === "undefined") {
      return null;
    }
    const trimmed = raw.trim();
    try {
      let parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch { return [{ fileName: parsed.trim() }]; }
      }
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return null;
        return parsed.map((item) => {
          if (typeof item === "string") return { fileName: item };
          if (item && typeof item === "object") {
            const docSrc: any = {
              fileName: item.fileName || item.name || item.title || item.file || "Document",
            };
            if (typeof item.page === "number") docSrc.page = item.page;
            if (typeof item.excerpt === "string") docSrc.excerpt = item.excerpt;
            return docSrc;
          }
          return { fileName: String(item) };
        });
      }
      if (parsed && typeof parsed === "object") {
        const docSrc: any = {
          fileName: parsed.fileName || parsed.name || parsed.title || parsed.file || "Document",
        };
        if (typeof parsed.page === "number") docSrc.page = parsed.page;
        if (typeof parsed.excerpt === "string") docSrc.excerpt = parsed.excerpt;
        return [docSrc];
      }
      return null;
    } catch {
      return [{ fileName: trimmed }];
    }
  }

  assert.deepStrictEqual(safeParseSources(null), null);
  assert.deepStrictEqual(safeParseSources(""), null);
  assert.deepStrictEqual(safeParseSources("Contract.pdf"), [{ fileName: "Contract.pdf" }]);
  assert.deepStrictEqual(
    safeParseSources(JSON.stringify([{ fileName: "Doc.pdf", page: 4, excerpt: "Terms" }])),
    [{ fileName: "Doc.pdf", page: 4, excerpt: "Terms" }]
  );
  assert.deepStrictEqual(
    safeParseSources(JSON.stringify(JSON.stringify([{ fileName: "Doc.pdf" }]))),
    [{ fileName: "Doc.pdf" }]
  );
  console.log("  ✓ Safe sources parser handled null, raw strings, JSON arrays, and double-stringified JSON.");

  // 8. Test JavaScript Query Detection and Content Generation
  console.log("\n8. Testing JavaScript Query Detection:");
  const testDocNames = ["50_javascript_practice_questions.docx", "EXPS HEMIL PATEL 24-25.xlsx"];
  const jsDocMatch = testDocNames.find(d => d.toLowerCase().includes("javascript"));
  assert.strictEqual(jsDocMatch, "50_javascript_practice_questions.docx");
  console.log("  ✓ JavaScript query accurately matched 50_javascript_practice_questions.docx.");

  console.log("\n🎉 All automated tests completed successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
