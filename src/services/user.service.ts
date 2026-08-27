import { prisma } from "@/lib/prisma";
import { normalizeUsername } from "@/lib/utils";
import { googleDriveService } from "./google-drive.service";
import { UserDTO } from "@/types";

export class UserService {
  /**
   * Normalizes a username for consistent unique matching.
   */
  normalizeName(name: string): string {
    return normalizeUsername(name);
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
      user: {
        id: user.id,
        name: user.name,
        normalizedName: user.normalizedName,
        googleDriveFolderId: user.googleDriveFolderId,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Creates a new user in PostgreSQL and initializes their Google Drive workspace folder.
   * If the user already exists, safely returns the existing user without duplicates.
   */
  async createUser(name: string): Promise<UserDTO> {
    const trimmedName = name.trim();
    const normalizedName = this.normalizeName(name);

    if (!normalizedName) {
      throw new Error("Name cannot be empty");
    }

    // Check if user exists first
    const existing = await prisma.user.findUnique({
      where: { normalizedName },
    });

    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        normalizedName: existing.normalizedName,
        googleDriveFolderId: existing.googleDriveFolderId,
        createdAt: existing.createdAt.toISOString(),
        updatedAt: existing.updatedAt.toISOString(),
      };
    }

    // Prepare Google Drive Folder
    let driveFolderId: string | null = null;
    try {
      driveFolderId = await googleDriveService.createUserFolder(trimmedName);
    } catch (err) {
      console.error("[UserService] Failed to create Google Drive folder:", err);
    }

    // Create user in PostgreSQL
    const created = await prisma.user.create({
      data: {
        name: trimmedName,
        normalizedName,
        googleDriveFolderId: driveFolderId,
      },
    });

    return {
      id: created.id,
      name: created.name,
      normalizedName: created.normalizedName,
      googleDriveFolderId: created.googleDriveFolderId,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
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

    return {
      id: user.id,
      name: user.name,
      normalizedName: user.normalizedName,
      googleDriveFolderId: user.googleDriveFolderId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

export const userService = new UserService();
