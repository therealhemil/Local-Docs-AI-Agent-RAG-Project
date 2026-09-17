import axios from "axios";
import { answerWithContext } from "../lib/ai";

function getGitHubToken(): string | undefined {
  return (
    process.env.GITHUB_TOKEN ||
    process.env.GITHUB_PERSONAL_ACCESS_TOKEN ||
    process.env.GITHUB_PAT ||
    undefined
  );
}

function getHeaders(customToken?: string) {
  const token = customToken || getGitHubToken();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Local-Docs-AI-Agent-MCP/1.0",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function githubGetStatus(customToken?: string) {
  const token = customToken || getGitHubToken();

  try {
    if (token) {
      const res = await axios.get("https://api.github.com/user", {
        headers: getHeaders(token),
        timeout: 10000,
      });

      return {
        connected: true,
        authenticated: true,
        username: res.data.login,
        name: res.data.name,
        avatarUrl: res.data.avatar_url,
        publicRepos: res.data.public_repos,
        totalPrivateRepos: res.data.total_private_repos || 0,
        scopes: res.headers["x-oauth-scopes"] || "unknown",
      };
    } else {
      // Anonymous rate limit check
      const res = await axios.get("https://api.github.com/rate_limit", {
        headers: getHeaders(),
        timeout: 10000,
      });

      return {
        connected: true,
        authenticated: false,
        message: "Connected anonymously (60 req/hr). Add GITHUB_TOKEN to .env.local for full private repo access and 5000 req/hr.",
        rateLimit: res.data.resources.core,
      };
    }
  } catch (err: any) {
    return {
      connected: false,
      authenticated: false,
      error: err.response?.data?.message || err.message,
    };
  }
}

export async function githubListRepos(params?: {
  username?: string;
  visibility?: "all" | "public" | "private";
  maxResults?: number;
  customToken?: string;
}) {
  const { username, visibility = "all", maxResults = 30, customToken } = params || {};
  const token = customToken || getGitHubToken();

  const url = username
    ? `https://api.github.com/users/${username}/repos`
    : token
    ? "https://api.github.com/user/repos"
    : "https://api.github.com/repositories";

  try {
    const res = await axios.get(url, {
      headers: getHeaders(token),
      params: {
        per_page: maxResults,
        sort: "updated",
        direction: "desc",
        ...(visibility !== "all" ? { visibility } : {}),
      },
      timeout: 15000,
    });

    const repos = (Array.isArray(res.data) ? res.data : []).map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login,
      description: r.description,
      isPrivate: r.private,
      stars: r.stargazers_count,
      language: r.language,
      defaultBranch: r.default_branch,
      updatedAt: r.updated_at,
      htmlUrl: r.html_url,
    }));

    return {
      total: repos.length,
      repositories: repos,
    };
  } catch (err: any) {
    throw new Error(`GitHub list repos failed: ${err.response?.data?.message || err.message}`);
  }
}

export async function githubGetFile(params: {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
  customToken?: string;
}) {
  const { owner, repo, path: filePath, ref, customToken } = params;
  const token = customToken || getGitHubToken();

  try {
    const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`;

    const res = await axios.get(url, {
      headers: getHeaders(token),
      params: ref ? { ref } : {},
      timeout: 15000,
    });

    if (Array.isArray(res.data)) {
      // It's a directory
      return {
        type: "directory",
        path: cleanPath,
        files: res.data.map((item: any) => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
          downloadUrl: item.download_url,
        })),
      };
    }

    // It's a file
    let content = "";
    if (res.data.encoding === "base64" && res.data.content) {
      content = Buffer.from(res.data.content, "base64").toString("utf-8");
    } else if (res.data.download_url) {
      const rawRes = await axios.get(res.data.download_url);
      content = typeof rawRes.data === "string" ? rawRes.data : JSON.stringify(rawRes.data);
    }

    return {
      type: "file",
      name: res.data.name,
      path: res.data.path,
      size: res.data.size,
      sha: res.data.sha,
      htmlUrl: res.data.html_url,
      content: content.slice(0, 80000), // Cap at 80KB for MCP responses
    };
  } catch (err: any) {
    throw new Error(`GitHub get file failed: ${err.response?.data?.message || err.message}`);
  }
}

export async function githubSearchCode(params: {
  query: string;
  repo?: string;
  maxResults?: number;
  customToken?: string;
}) {
  const { query, repo, maxResults = 10, customToken } = params;
  const token = customToken || getGitHubToken();

  try {
    const q = repo ? `${query} repo:${repo}` : query;
    const res = await axios.get("https://api.github.com/search/code", {
      headers: getHeaders(token),
      params: { q, per_page: maxResults },
      timeout: 15000,
    });

    return {
      total: res.data.total_count,
      items: (res.data.items || []).map((item: any) => ({
        name: item.name,
        path: item.path,
        repository: item.repository?.full_name,
        htmlUrl: item.html_url,
      })),
    };
  } catch (err: any) {
    throw new Error(`GitHub search code failed: ${err.response?.data?.message || err.message}`);
  }
}

export async function askAboutGithub(params: {
  question: string;
  owner: string;
  repo: string;
  paths?: string[];
  ref?: string;
  customToken?: string;
}) {
  const { question, owner, repo, paths = ["README.md"], ref, customToken } = params;

  const collectedDocs: string[] = [];
  const successfulFiles: string[] = [];

  for (const p of paths.slice(0, 5)) {
    try {
      const fileData = await githubGetFile({ owner, repo, path: p, ref, customToken });
      if (fileData.type === "file" && fileData.content) {
        collectedDocs.push(`=== ${p} (from ${owner}/${repo}) ===\n${fileData.content}`);
        successfulFiles.push(p);
      }
    } catch (err) {
      // Continue to next path
    }
  }

  if (collectedDocs.length === 0) {
    return {
      answer: `Could not retrieve file content from repository ${owner}/${repo} for paths [${paths.join(", ")}]. Check if the repository and paths exist.`,
      files: [],
      via: "none",
    };
  }

  const context = collectedDocs.join("\n\n");
  const result = await answerWithContext({
    question,
    context,
    fileNames: successfulFiles.map((f) => `${owner}/${repo}/${f}`),
  });

  return {
    answer: result.answer,
    via: result.via,
    repository: `${owner}/${repo}`,
    filesRead: successfulFiles,
  };
}
