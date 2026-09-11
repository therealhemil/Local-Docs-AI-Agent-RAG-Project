export type DocumentStatus = 'UPLOADING' | 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface UserDTO {
  id: string;
  name: string;
  email?: string | null;
  authProvider?: string;
  avatarUrl?: string | null;
  normalizedName: string;
  googleDriveFolderId?: string | null;
  firstLoginAt?: string | null;
  lastLoginAt?: string | null;
  loginCount?: number;
  lastIpAddress?: string | null;
  lastUserAgent?: string | null;
  lastDevice?: string | null;
  lastBrowser?: string | null;
  lastOs?: string | null;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
  referrer?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  clientDetails?: any;
}

export interface LoginRequest {
  email: string;
  password: string;
  clientDetails?: any;
}

export interface SocialAuthRequest {
  provider: "google" | "github" | "demo";
  email?: string;
  name?: string;
  avatarUrl?: string;
  clientDetails?: any;
}

export interface UserTrackingLogDTO {
  id: string;
  userId: string;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
  screenResolution?: string | null;
  referrer?: string | null;
  metadata?: string | null;
  createdAt: string;
}

export interface DocumentSource {
  fileName: string;
  page?: number;
  excerpt?: string;
}

export interface DocumentDTO {
  id: string;
  userId: string;
  originalFileName: string;
  mimeType?: string | null;
  fileSize?: string | number | null;
  googleDriveFileId?: string | null;
  googleDriveFolderId?: string | null;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  sources?: DocumentSource[] | null;
  createdAt: string;
}

export interface ConversationDTO {
  id: string;
  userId: string;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: MessageDTO[];
}

export interface CheckUserResponse {
  exists: boolean;
  userId?: string;
  user?: UserDTO;
}

export interface ChatResponse {
  message: MessageDTO;
  sources?: DocumentSource[];
}
