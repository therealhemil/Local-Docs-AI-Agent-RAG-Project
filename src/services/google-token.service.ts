import { google } from "googleapis";
import type { OAuth2Client, Credentials } from "google-auth-library";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface UserGoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number | null;
  scope?: string;
  email?: string;
  updatedAt: string;
}

export class GoogleTokenService {
  private tokenStorageDir = path.join(process.cwd(), ".drive-storage", ".tokens");
  private algorithm = "aes-256-gcm";

  constructor() {
    if (!fs.existsSync(this.tokenStorageDir)) {
      try {
        fs.mkdirSync(this.tokenStorageDir, { recursive: true });
      } catch {
        // Directory might already exist or will be created on save
      }
    }
  }

  /**
   * Derives a consistent 32-byte encryption key from JWT_SECRET.
   */
  private getEncryptionKey(): Buffer {
    const secret = process.env.JWT_SECRET || "ai-document-assistant-super-secret-jwt-key-2026";
    return crypto.createHash("sha256").update(secret).digest();
  }

  /**
   * Encrypts plain text with AES-256-GCM.
   */
  private encrypt(plainText: string): string {
    const iv = crypto.randomBytes(12);
    const key = this.getEncryptionKey();
    const cipher = crypto.createCipheriv(this.algorithm, key, iv) as crypto.CipherGCM;
    
    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();

    // Format: iv:tag:encrypted
    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
  }

  /**
   * Decrypts encrypted text with AES-256-GCM.
   */
  private decrypt(cipherText: string): string {
    const parts = cipherText.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid cipher text format");
    }

    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const key = this.getEncryptionKey();

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  private getUserTokenFilePath(userId: string): string {
    const sanitizedId = crypto.createHash("sha256").update(userId).digest("hex");
    return path.join(this.tokenStorageDir, `${sanitizedId}.enc`);
  }

  /**
   * Creates an OAuth2 client with environment credentials.
   */
  public getOAuth2Client(): OAuth2Client {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

    if (!clientId || !clientSecret) {
      throw new Error(
        "Google OAuth credentials missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables."
      );
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Generates the Google OAuth 2.0 authorization URL with read-only Drive scopes.
   */
  public generateConsentUrl(state?: string): string {
    const oauth2Client = this.getOAuth2Client();

    const SCOPES = [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ];

    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      state: state || undefined,
    });
  }

  /**
   * Exchanges an authorization code for OAuth tokens.
   */
  public async exchangeCode(code: string): Promise<Credentials> {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Saves encrypted Google OAuth tokens for a user.
   */
  public async saveUserTokens(
    userId: string,
    tokens: {
      access_token?: string | null;
      refresh_token?: string | null;
      expiry_date?: number | null;
      scope?: string | null;
      email?: string | null;
    }
  ): Promise<void> {
    if (!userId) throw new Error("userId is required to save tokens.");

    // Merge with existing tokens to preserve refresh_token if not returned in current exchange
    const existing = await this.getUserTokens(userId);

    const updated: UserGoogleTokens = {
      accessToken: tokens.access_token || existing?.accessToken || "",
      refreshToken: tokens.refresh_token || existing?.refreshToken || undefined,
      expiryDate: tokens.expiry_date ?? existing?.expiryDate ?? null,
      scope: tokens.scope || existing?.scope || undefined,
      email: tokens.email || existing?.email || undefined,
      updatedAt: new Date().toISOString(),
    };

    if (!fs.existsSync(this.tokenStorageDir)) {
      fs.mkdirSync(this.tokenStorageDir, { recursive: true });
    }

    const encryptedData = this.encrypt(JSON.stringify(updated));
    const filePath = this.getUserTokenFilePath(userId);
    fs.writeFileSync(filePath, encryptedData, "utf8");
  }

  /**
   * Retrieves and decrypts Google OAuth tokens for a user.
   */
  public async getUserTokens(userId: string): Promise<UserGoogleTokens | null> {
    if (!userId) return null;

    const filePath = this.getUserTokenFilePath(userId);
    if (!fs.existsSync(filePath)) {
      // Fallback: Check if global system refresh token exists in environment for demo/single-user dev
      const globalRefreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
      if (globalRefreshToken) {
        return {
          accessToken: "",
          refreshToken: globalRefreshToken,
          expiryDate: null,
          updatedAt: new Date().toISOString(),
        };
      }
      return null;
    }

    try {
      const encryptedData = fs.readFileSync(filePath, "utf8");
      const decryptedData = this.decrypt(encryptedData);
      return JSON.parse(decryptedData) as UserGoogleTokens;
    } catch (error) {
      console.error(`[GoogleTokenService] Failed to decrypt tokens for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Checks if user has a valid connected Google Drive account.
   */
  public async isUserConnected(userId: string): Promise<boolean> {
    const tokens = await this.getUserTokens(userId);
    return Boolean(tokens && (tokens.accessToken || tokens.refreshToken));
  }

  /**
   * Deletes a user's stored Google Drive tokens (disconnects Drive).
   */
  public async deleteUserTokens(userId: string): Promise<void> {
    if (!userId) return;
    const filePath = this.getUserTokenFilePath(userId);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`[GoogleTokenService] Failed to remove tokens for user ${userId}:`, err);
      }
    }
  }

  /**
   * Obtains an authenticated OAuth2Client for the user, automatically refreshing the access token if expired.
   */
  public async getAuthenticatedClient(userId: string): Promise<OAuth2Client> {
    const tokens = await this.getUserTokens(userId);
    if (!tokens || (!tokens.accessToken && !tokens.refreshToken)) {
      throw new Error(
        "Google Drive is not connected for this user. Please authenticate via the Google Drive connection flow."
      );
    }

    const oauth2Client = this.getOAuth2Client();

    oauth2Client.setCredentials({
      access_token: tokens.accessToken || undefined,
      refresh_token: tokens.refreshToken || undefined,
      expiry_date: tokens.expiryDate || undefined,
    });

    // Listen for automatic token refreshes by google-auth-library
    oauth2Client.on("tokens", (newTokens) => {
      this.saveUserTokens(userId, {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expiry_date: newTokens.expiry_date,
        scope: newTokens.scope,
      }).catch((err) => {
        console.error("[GoogleTokenService] Error saving auto-refreshed tokens:", err);
      });
    });

    // Proactively refresh if token will expire within 5 minutes or is already expired
    const now = Date.now();
    const expiry = tokens.expiryDate || 0;
    const isExpiringSoon = !tokens.accessToken || (expiry > 0 && expiry - now < 5 * 60 * 1000);

    if (isExpiringSoon && tokens.refreshToken) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        await this.saveUserTokens(userId, {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || tokens.refreshToken,
          expiry_date: credentials.expiry_date,
          scope: credentials.scope,
        });
      } catch (refreshErr) {
        console.warn("[GoogleTokenService] Warning: Could not proactively refresh token:", refreshErr);
      }
    }

    return oauth2Client;
  }
}

export const googleTokenService = new GoogleTokenService();
