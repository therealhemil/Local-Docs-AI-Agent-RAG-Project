#!/usr/bin/env node
/**
 * mcp-server/scripts/auth.ts
 *
 * One-time Google OAuth2 setup for the MCP server.
 * Run:  npm run mcp:auth
 *
 * Steps:
 *  1. Opens a browser to Google's consent screen
 *  2. You approve the required Drive scopes
 *  3. Pastes the code back into the terminal
 *  4. Saves the refresh token into .env and .env.local automatically
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as readline from "readline";
import { google } from "googleapis";

const root = path.resolve(__dirname, "../..");
const envLocalPath = path.join(root, ".env.local");
const envPath = path.join(root, ".env");

// Load existing env vars
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false });

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || "urn:ietf:wg:oauth:2.0:oob";

if (!clientId || !clientSecret) {
  console.error(`
❌  GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in your .env file.

Steps to get them:
  1. Go to https://console.cloud.google.com/
  2. Create a project → Enable "Google Drive API"
  3. OAuth consent screen → External → Add your email as test user
  4. Credentials → Create OAuth Client ID → "Desktop App"
  5. Copy Client ID and Client Secret → paste into your .env file:

     GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
     GOOGLE_CLIENT_SECRET=your-client-secret
     GOOGLE_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob

  6. Run  npm run mcp:auth  again
`);
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
});

console.log("\n🔐 Google Drive OAuth Setup\n");
console.log("1. Open this URL in your browser:\n");
console.log(`   ${authUrl}\n`);
console.log("2. Sign in with your Google account and approve Drive access.");
console.log("3. Copy the authorization code shown on screen.\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("4. Paste the authorization code here: ", async (code) => {
  rl.close();

  try {
    const { tokens } = await oauth2Client.getToken(code.trim());

    if (!tokens.refresh_token) {
      console.error(
        "\n❌ No refresh token received. Try revoking access at https://myaccount.google.com/permissions and run again."
      );
      process.exit(1);
    }

    const refreshToken = tokens.refresh_token;

    // Write to .env.local (preferred)
    const targetFile = fs.existsSync(envLocalPath) ? envLocalPath : envPath;
    let content = fs.readFileSync(targetFile, "utf-8");

    if (content.includes("GOOGLE_DRIVE_REFRESH_TOKEN=")) {
      content = content.replace(
        /GOOGLE_DRIVE_REFRESH_TOKEN=.*/,
        `GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}`
      );
    } else {
      content += `\nGOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}\n`;
    }

    fs.writeFileSync(targetFile, content);

    console.log(`\n✅ Refresh token saved to ${path.basename(targetFile)}`);
    console.log("\nYou can now run:  npm run mcp\n");
    console.log(
      "In Claude Desktop, ask: \"List my Google Drive files\" to verify the connection.\n"
    );
  } catch (err: any) {
    console.error("\n❌ Failed to exchange code for token:", err.message ?? err);
    process.exit(1);
  }
});
