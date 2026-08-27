# 🚀 AI Document Assistant — Document & Voice Intelligence MVP

A modern, production-grade web application that empowers users to upload documents (PDF, DOCX, TXT, images), synchronize them with **Google Drive**, persist metadata in **PostgreSQL**, and interact with their documents using a **ChatGPT-style conversational interface** and **voice assistant**.

---

## ✨ Key Features

1. **Seamless User Onboarding & Identity Detection**:
   - Smart username normalization (e.g. `Hemil Patel`, `hemil patel`, ` HEMIL PATEL ` resolve to the same unique identity).
   - Zero redundant re-entry: returning users with active sessions automatically open their existing workspaces, documents, and conversations.
2. **Multi-Document Upload & Cloud Storage Sync**:
   - Multi-file drag & drop with file format and size validation (up to 50MB).
   - Real-time animated progress bars and status badges (`UPLOADED`, `PROCESSING`, `READY`, `FAILED`).
   - Integrated with Google Drive workspace folders with automatic local drive simulation fallback.
3. **ChatGPT-Style Document Assistant**:
   - Multi-conversation management with automatic titles and history tracking.
   - Markdown-rendered responses, code formatting, copy actions, regeneration, and thumbs up/down feedback.
   - Document source citations (e.g., `📄 Contract.pdf — Page 8`).
4. **Voice Assistant**:
   - Dedicated voice interface modal with pulsating glowing orb and audio wave visualizer.
   - Web Speech API speech-to-text integration with live transcript preview.
   - Routes voice queries directly into the same conversation thread and backend API.
5. **Modern AI SaaS Design**:
   - Responsive layout across Desktop (Split sidebar/chat), Tablet (Collapsible drawer), and Mobile.
   - Dark Mode and Light Mode with smooth transition states.

---

## 🏗️ Architecture & Data Flow

```text
Landing Page (Hero, Features, How It Works)
     ↓
Enter Name / Automatic Session Check
     ↓
Username Detection in PostgreSQL
   ↙       ↘
Existing?  New?
   ↓        ↓
Continue   Create User + Google Drive Folder
      \     /
       \   /
   Upload Documents Page
     (PDF, DOCX, TXT, Images)
           ↓
   Google Drive Storage + Postgres Metadata
           ↓
   Open Assistant
   (ChatGPT-Style Conversation + Voice Modal)
       ↙           ↘
    Text          Voice
       \           /
        \         /
   Unified Chat API Route
           ↓
   AiService (n8n Webhook / RAG Placeholder)
```

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React icons
- **Backend**: Next.js Server Route Handlers, Clean Service Layer Architecture
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Authentication**: Signed JWT Session Tokens via HTTP-only Cookies
- **Storage**: Google Drive API (`googleapis`) with local directory fallback simulation
- **Voice**: Web Speech API (`SpeechRecognition` & `SpeechSynthesis`) + Service abstraction

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: v18.x or v20+ / v24+
- **Docker** (optional, for local PostgreSQL container)

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your parameters:

```env
# PostgreSQL Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_doc_assistant?schema=public"

# Session Security
JWT_SECRET="your-super-secret-jwt-key-32-chars-minimum"

# Google Drive (Optional: Uses simulated drive storage if omitted)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
GOOGLE_DRIVE_REFRESH_TOKEN=""
GOOGLE_DRIVE_ROOT_FOLDER_ID=""

# n8n AI & RAG Pipeline (Optional: Uses structured placeholder citations if omitted)
N8N_CHAT_WEBHOOK_URL=""
N8N_DOCUMENT_WEBHOOK_URL=""

NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### 3. Start PostgreSQL (via Docker)

```bash
docker compose up -d
```

### 4. Setup Prisma Schema & Client

```bash
# Push Prisma schema to PostgreSQL
npm run prisma:push

# Generate client
npm run prisma:generate
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/users/check` | Checks if normalized username exists in PostgreSQL |
| `POST` | `/api/users` | Creates or logs in user, initializes drive folder, sets session cookie |
| `GET` | `/api/users/me` | Returns active authenticated user from session token |
| `POST` | `/api/users/logout` | Clears session cookie |
| `POST` | `/api/documents/upload` | Multipart file upload; uploads to Google Drive and saves metadata |
| `GET` | `/api/documents` | Lists all documents for authenticated user |
| `DELETE` | `/api/documents/[id]` | Deletes document (with ownership authorization check) |
| `POST` | `/api/conversations` | Creates a new chat conversation |
| `GET` | `/api/conversations` | Lists user's conversations |
| `GET` | `/api/conversations/[id]` | Fetches conversation with full message history |
| `DELETE` | `/api/conversations/[id]` | Deletes conversation |
| `POST` | `/api/chat` | Sends question to AI pipeline (n8n ready) and records message |
| `POST` | `/api/voice/transcribe` | Voice STT transcription endpoint placeholder |
| `POST` | `/api/voice/speak` | Voice TTS speech synthesis endpoint placeholder |

---

## 🧪 Testing Checklist

- [x] **Username Normalization**: `Hemil Patel`, `hemil patel`, ` HEMIL PATEL ` resolve to the exact same unique user.
- [x] **Session Persistence**: Session cookie keeps user signed in across browser tabs and reloads.
- [x] **Document Validation**: Rejects files exceeding 50MB or unsupported mime types.
- [x] **Google Drive Service**: Seamlessly switches between official Google Drive API and local storage fallback.
- [x] **Chat Interface**: Supports Enter to send, Shift+Enter for multiline, message copying, feedback, and citation badges.
- [x] **Voice Assistant**: Fullscreen voice modal with audio waveform visualizer and speech-to-text integration.
- [x] **Dark / Light Mode**: Instant toggle with persisted theme state.
