export type DocumentStatus = 'UPLOADING' | 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface UserDTO {
  id: string;
  name: string;
  normalizedName: string;
  googleDriveFolderId?: string | null;
  createdAt: string;
  updatedAt: string;
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
