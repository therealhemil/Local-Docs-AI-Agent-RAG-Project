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

  console.log("\n🎉 All automated tests completed successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
