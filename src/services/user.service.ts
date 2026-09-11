import { prisma } from "@/lib/prisma";
import { normalizeUsername } from "@/lib/utils";
import { googleDriveService } from "./google-drive.service";
import { UserDTO, UserTrackingLogDTO, SignupRequest, LoginRequest, SocialAuthRequest } from "@/types";
import { ClientTrackingData } from "@/lib/tracking";
import { hashPassword, verifyPassword } from "@/lib/password";

export class UserService {
  /**
   * Normalizes a username for consistent unique matching.
   */
  normalizeName(name: string): string {
    return normalizeUsername(name);
  }

  /**
   * Formats a Prisma User record into a UserDTO.
   */
  private mapToDTO(user: any): UserDTO {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      authProvider: user.authProvider || "CREDENTIALS",
      avatarUrl: user.avatarUrl,
      normalizedName: user.normalizedName,
      googleDriveFolderId: user.googleDriveFolderId,
      firstLoginAt: user.firstLoginAt ? user.firstLoginAt.toISOString() : null,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      loginCount: user.loginCount ?? 1,
      lastIpAddress: user.lastIpAddress,
      lastUserAgent: user.lastUserAgent,
      lastDevice: user.lastDevice,
      lastBrowser: user.lastBrowser,
      lastOs: user.lastOs,
      country: user.country,
      city: user.city,
      timezone: user.timezone,
      referrer: user.referrer,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  /**
   * Signs up a new user with Name, Email, and Password.
   */
  async signupWithCredentials(
    payload: SignupRequest,
    trackingData?: ClientTrackingData
  ): Promise<UserDTO> {
    const trimmedName = payload.name.trim();
    const cleanEmail = payload.email.trim().toLowerCase();

    if (!trimmedName) throw new Error("Full name is required.");
    if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("A valid email address is required.");
    if (!payload.password || payload.password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    // Check if email already registered
    const existingByEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingByEmail) {
      throw new Error("An account with this email address already exists. Please log in.");
    }

    // Generate unique normalized name
    let normalizedName = this.normalizeName(trimmedName);
    if (!normalizedName) {
      normalizedName = this.normalizeName(cleanEmail.split("@")[0]);
    }

    const existingByName = await prisma.user.findUnique({
      where: { normalizedName },
    });
    if (existingByName) {
      normalizedName = `${normalizedName}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Hash password securely
    const passwordHash = await hashPassword(payload.password);

    // Initialize Google Drive folder
    let driveFolderId: string | null = null;
    try {
      driveFolderId = await googleDriveService.createUserFolder(trimmedName);
    } catch (err) {
      console.error("[UserService] Failed to create Google Drive folder:", err);
    }

    const now = new Date();
    const created = await prisma.user.create({
      data: {
        name: trimmedName,
        email: cleanEmail,
        passwordHash,
        authProvider: "CREDENTIALS",
        normalizedName,
        googleDriveFolderId: driveFolderId,
        firstLoginAt: now,
        lastLoginAt: now,
        loginCount: 1,
        lastIpAddress: trackingData?.ipAddress,
        lastUserAgent: trackingData?.userAgent,
        lastDevice: trackingData?.device,
        lastBrowser: trackingData?.browser,
        lastOs: trackingData?.os,
        country: trackingData?.country,
        city: trackingData?.city,
        timezone: trackingData?.timezone,
        referrer: trackingData?.referrer,
      },
    });

    // Record Activity Log for Signup
    try {
      await prisma.userTrackingLog.create({
        data: {
          userId: created.id,
          action: "SIGNUP",
          ipAddress: trackingData?.ipAddress,
          userAgent: trackingData?.userAgent,
          device: trackingData?.device,
          browser: trackingData?.browser,
          os: trackingData?.os,
          country: trackingData?.country,
          city: trackingData?.city,
          timezone: trackingData?.timezone,
          screenResolution: trackingData?.screenResolution,
          referrer: trackingData?.referrer,
          metadata: JSON.stringify({
            authProvider: "CREDENTIALS",
            email: cleanEmail,
            folderCreated: !!driveFolderId,
          }),
        },
      });
    } catch (logErr) {
      console.error("[UserService] Failed to create signup tracking log:", logErr);
    }

    console.log(
      `[USER_TRACKING: SIGNUP] Registered user "${created.name}" (${cleanEmail}) | IP: ${trackingData?.ipAddress || "N/A"} | Device: ${trackingData?.device || "Desktop"} | Browser: ${trackingData?.browser || "N/A"}`
    );

    return this.mapToDTO(created);
  }

  /**
   * Logs in an existing user with Email and Password.
   */
  async loginWithCredentials(
    payload: LoginRequest,
    trackingData?: ClientTrackingData
  ): Promise<UserDTO> {
    const cleanEmail = payload.email.trim().toLowerCase();
    if (!cleanEmail) throw new Error("Email is required.");
    if (!payload.password) throw new Error("Password is required.");

    // Find user by email or normalized name
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      // Check fallback by normalized username
      const normalized = this.normalizeName(cleanEmail);
      if (normalized) {
        user = await prisma.user.findUnique({
          where: { normalizedName: normalized },
        });
      }
    }

    if (!user) {
      throw new Error("No account found with this email or username.");
    }

    if (!user.passwordHash) {
      throw new Error(
        `This account was created with ${user.authProvider || "social login"}. Please sign in using that method.`
      );
    }

    // Verify Password
    const isValid = await verifyPassword(payload.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid password. Please try again.");
    }

    // Update login tracking
    const now = new Date();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: now,
        loginCount: { increment: 1 },
        lastIpAddress: trackingData?.ipAddress || user.lastIpAddress,
        lastUserAgent: trackingData?.userAgent || user.lastUserAgent,
        lastDevice: trackingData?.device || user.lastDevice,
        lastBrowser: trackingData?.browser || user.lastBrowser,
        lastOs: trackingData?.os || user.lastOs,
        country: trackingData?.country || user.country,
        city: trackingData?.city || user.city,
        timezone: trackingData?.timezone || user.timezone,
        referrer: trackingData?.referrer || user.referrer,
      },
    });

    // Record Activity Log
    try {
      await prisma.userTrackingLog.create({
        data: {
          userId: user.id,
          action: "LOGIN",
          ipAddress: trackingData?.ipAddress,
          userAgent: trackingData?.userAgent,
          device: trackingData?.device,
          browser: trackingData?.browser,
          os: trackingData?.os,
          country: trackingData?.country,
          city: trackingData?.city,
          timezone: trackingData?.timezone,
          screenResolution: trackingData?.screenResolution,
          referrer: trackingData?.referrer,
          metadata: JSON.stringify({
            authProvider: "CREDENTIALS",
            loginNumber: updated.loginCount,
          }),
        },
      });
    } catch (logErr) {
      console.error("[UserService] Failed to create login tracking log:", logErr);
    }

    console.log(
      `[USER_TRACKING: LOGIN] User "${updated.name}" (${updated.email || updated.normalizedName}) | Login #${updated.loginCount} | IP: ${trackingData?.ipAddress || "N/A"} | Device: ${trackingData?.device || "Desktop"}`
    );

    return this.mapToDTO(updated);
  }

  /**
   * Logs in or registers a user via Social Provider (Google / GitHub / Demo).
   */
  async loginWithSocial(
    payload: SocialAuthRequest,
    trackingData?: ClientTrackingData
  ): Promise<UserDTO> {
    const providerUpper = payload.provider.toUpperCase();
    const cleanEmail = payload.email?.trim().toLowerCase() || `${payload.provider}-user-${Math.floor(1000 + Math.random() * 9000)}@${payload.provider}.com`;
    const displayName = payload.name?.trim() || `${payload.provider.charAt(0).toUpperCase() + payload.provider.slice(1)} User`;

    // Check if user exists by email
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (user) {
      // Existing User Login
      const now = new Date();
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: now,
          loginCount: { increment: 1 },
          avatarUrl: payload.avatarUrl || user.avatarUrl,
          lastIpAddress: trackingData?.ipAddress || user.lastIpAddress,
          lastUserAgent: trackingData?.userAgent || user.lastUserAgent,
          lastDevice: trackingData?.device || user.lastDevice,
          lastBrowser: trackingData?.browser || user.lastBrowser,
          lastOs: trackingData?.os || user.lastOs,
          country: trackingData?.country || user.country,
          city: trackingData?.city || user.city,
          timezone: trackingData?.timezone || user.timezone,
          referrer: trackingData?.referrer || user.referrer,
        },
      });

      try {
        await prisma.userTrackingLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            ipAddress: trackingData?.ipAddress,
            userAgent: trackingData?.userAgent,
            device: trackingData?.device,
            browser: trackingData?.browser,
            os: trackingData?.os,
            country: trackingData?.country,
            city: trackingData?.city,
            timezone: trackingData?.timezone,
            referrer: trackingData?.referrer,
            metadata: JSON.stringify({
              authProvider: providerUpper,
              socialLogin: true,
            }),
          },
        });
      } catch (logErr) {
        console.error("[UserService] Failed to create social login log:", logErr);
      }

      return this.mapToDTO(updated);
    }

    // New User Signup via Social
    let normalizedName = this.normalizeName(displayName);
    const existingByName = await prisma.user.findUnique({
      where: { normalizedName },
    });
    if (existingByName) {
      normalizedName = `${normalizedName}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    let driveFolderId: string | null = null;
    try {
      driveFolderId = await googleDriveService.createUserFolder(displayName);
    } catch (err) {
      console.error("[UserService] Failed to create Google Drive folder:", err);
    }

    const now = new Date();
    const created = await prisma.user.create({
      data: {
        name: displayName,
        email: cleanEmail,
        authProvider: providerUpper,
        avatarUrl: payload.avatarUrl,
        normalizedName,
        googleDriveFolderId: driveFolderId,
        firstLoginAt: now,
        lastLoginAt: now,
        loginCount: 1,
        lastIpAddress: trackingData?.ipAddress,
        lastUserAgent: trackingData?.userAgent,
        lastDevice: trackingData?.device,
        lastBrowser: trackingData?.browser,
        lastOs: trackingData?.os,
        country: trackingData?.country,
        city: trackingData?.city,
        timezone: trackingData?.timezone,
        referrer: trackingData?.referrer,
      },
    });

    try {
      await prisma.userTrackingLog.create({
        data: {
          userId: created.id,
          action: "SIGNUP",
          ipAddress: trackingData?.ipAddress,
          userAgent: trackingData?.userAgent,
          device: trackingData?.device,
          browser: trackingData?.browser,
          os: trackingData?.os,
          country: trackingData?.country,
          city: trackingData?.city,
          timezone: trackingData?.timezone,
          referrer: trackingData?.referrer,
          metadata: JSON.stringify({
            authProvider: providerUpper,
            socialLogin: true,
          }),
        },
      });
    } catch (logErr) {
      console.error("[UserService] Failed to create social signup log:", logErr);
    }

    return this.mapToDTO(created);
  }

  /**
   * Checks if a user already exists in PostgreSQL by normalized name.
   */
  async checkUser(name: string): Promise<{ exists: boolean; userId?: string; user?: UserDTO }> {
    const normalizedName = this.normalizeName(name);
    if (!normalizedName) {
      return { exists: false };
    }

    const user = await prisma.user.findUnique({
      where: { normalizedName },
    });

    if (!user) {
      return { exists: false };
    }

    return {
      exists: true,
      userId: user.id,
      user: this.mapToDTO(user),
    };
  }

  /**
   * Creates or logs in a user in PostgreSQL with complete client tracking details.
   * - If user is NEW: Creates user, creates Google Drive folder, logs SIGNUP tracking event.
   * - If user EXISTS: Updates last login timestamp, IP, device, increments loginCount, logs LOGIN tracking event.
   */
  async createUser(name: string, trackingData?: ClientTrackingData): Promise<UserDTO> {
    const trimmedName = name.trim();
    const normalizedName = this.normalizeName(name);

    if (!normalizedName) {
      throw new Error("Name cannot be empty");
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { normalizedName },
    });

    if (existing) {
      // Existing User Login Tracking
      const now = new Date();
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          lastLoginAt: now,
          loginCount: { increment: 1 },
          lastIpAddress: trackingData?.ipAddress || existing.lastIpAddress,
          lastUserAgent: trackingData?.userAgent || existing.lastUserAgent,
          lastDevice: trackingData?.device || existing.lastDevice,
          lastBrowser: trackingData?.browser || existing.lastBrowser,
          lastOs: trackingData?.os || existing.lastOs,
          country: trackingData?.country || existing.country,
          city: trackingData?.city || existing.city,
          timezone: trackingData?.timezone || existing.timezone,
          referrer: trackingData?.referrer || existing.referrer,
        },
      });

      // Record Activity Log
      try {
        await prisma.userTrackingLog.create({
          data: {
            userId: existing.id,
            action: "LOGIN",
            ipAddress: trackingData?.ipAddress,
            userAgent: trackingData?.userAgent,
            device: trackingData?.device,
            browser: trackingData?.browser,
            os: trackingData?.os,
            country: trackingData?.country,
            city: trackingData?.city,
            timezone: trackingData?.timezone,
            screenResolution: trackingData?.screenResolution,
            referrer: trackingData?.referrer,
            metadata: JSON.stringify({
              language: trackingData?.language,
              loginNumber: updated.loginCount,
            }),
          },
        });
      } catch (logErr) {
        console.error("[UserService] Failed to create login tracking log:", logErr);
      }

      console.log(
        `[USER_TRACKING: LOGIN] User "${existing.name}" (Count: ${updated.loginCount}) | IP: ${trackingData?.ipAddress || "N/A"} | Device: ${trackingData?.device || "Desktop"} | OS: ${trackingData?.os || "N/A"} | Browser: ${trackingData?.browser || "N/A"} | Timezone: ${trackingData?.timezone || "N/A"}`
      );

      return this.mapToDTO(updated);
    }

    // New User Signup Tracking & Setup
    let driveFolderId: string | null = null;
    try {
      driveFolderId = await googleDriveService.createUserFolder(trimmedName);
    } catch (err) {
      console.error("[UserService] Failed to create Google Drive folder:", err);
    }

    const now = new Date();
    const created = await prisma.user.create({
      data: {
        name: trimmedName,
        normalizedName,
        googleDriveFolderId: driveFolderId,
        firstLoginAt: now,
        lastLoginAt: now,
        loginCount: 1,
        lastIpAddress: trackingData?.ipAddress,
        lastUserAgent: trackingData?.userAgent,
        lastDevice: trackingData?.device,
        lastBrowser: trackingData?.browser,
        lastOs: trackingData?.os,
        country: trackingData?.country,
        city: trackingData?.city,
        timezone: trackingData?.timezone,
        referrer: trackingData?.referrer,
      },
    });

    // Record Activity Log for Signup
    try {
      await prisma.userTrackingLog.create({
        data: {
          userId: created.id,
          action: "SIGNUP",
          ipAddress: trackingData?.ipAddress,
          userAgent: trackingData?.userAgent,
          device: trackingData?.device,
          browser: trackingData?.browser,
          os: trackingData?.os,
          country: trackingData?.country,
          city: trackingData?.city,
          timezone: trackingData?.timezone,
          screenResolution: trackingData?.screenResolution,
          referrer: trackingData?.referrer,
          metadata: JSON.stringify({
            language: trackingData?.language,
            folderCreated: !!driveFolderId,
          }),
        },
      });
    } catch (logErr) {
      console.error("[UserService] Failed to create signup tracking log:", logErr);
    }

    console.log(
      `[USER_TRACKING: SIGNUP] New User Registered: "${created.name}" | IP: ${trackingData?.ipAddress || "N/A"} | Device: ${trackingData?.device || "Desktop"} | OS: ${trackingData?.os || "N/A"} | Browser: ${trackingData?.browser || "N/A"} | Timezone: ${trackingData?.timezone || "N/A"} | Referrer: ${trackingData?.referrer || "Direct"}`
    );

    return this.mapToDTO(created);
  }

  /**
   * Retrieves a user by their UUID.
   */
  async getUserById(id: string): Promise<UserDTO | null> {
    if (!id) return null;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;
    return this.mapToDTO(user);
  }

  /**
   * Retrieves user tracking logs.
   */
  async getUserTrackingLogs(userId: string): Promise<UserTrackingLogDTO[]> {
    if (!userId) return [];

    const logs = await prisma.userTrackingLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      action: log.action,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      device: log.device,
      browser: log.browser,
      os: log.os,
      country: log.country,
      city: log.city,
      timezone: log.timezone,
      screenResolution: log.screenResolution,
      referrer: log.referrer,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    }));
  }
}

export const userService = new UserService();
