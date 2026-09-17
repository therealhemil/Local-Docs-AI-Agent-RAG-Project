import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

function getActiveToken() {
  return (
    process.env.GITHUB_TOKEN ||
    process.env.GITHUB_PERSONAL_ACCESS_TOKEN ||
    process.env.GITHUB_PAT
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo");
  const owner = searchParams.get("owner");
  const filePath = searchParams.get("path");
  const token = getActiveToken();

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Local-Docs-AI-Agent",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    // If requesting specific repo file content
    if (owner && repo && filePath) {
      const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
      const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`, {
        headers,
        timeout: 10000,
      });

      if (Array.isArray(res.data)) {
        return NextResponse.json({ type: "directory", items: res.data });
      }

      let content = "";
      if (res.data.encoding === "base64" && res.data.content) {
        content = Buffer.from(res.data.content, "base64").toString("utf-8");
      }
      return NextResponse.json({ type: "file", file: res.data, content });
    }

    // Default: List repos and profile
    let userProfile = null;
    if (token) {
      try {
        const userRes = await axios.get("https://api.github.com/user", { headers, timeout: 5000 });
        userProfile = userRes.data;
      } catch {
        // Token might be invalid or restricted
      }
    }

    const reposUrl = token
      ? "https://api.github.com/user/repos?sort=updated&per_page=30"
      : "https://api.github.com/repositories?per_page=20";

    const reposRes = await axios.get(reposUrl, { headers, timeout: 8000 });

    const repos = (Array.isArray(reposRes.data) ? reposRes.data : []).map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login,
      description: r.description,
      isPrivate: r.private,
      stars: r.stargazers_count,
      language: r.language,
      htmlUrl: r.html_url,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({
      authenticated: Boolean(token && userProfile),
      user: userProfile
        ? {
            login: userProfile.login,
            name: userProfile.name,
            avatarUrl: userProfile.avatar_url,
            publicRepos: userProfile.public_repos,
            privateRepos: userProfile.total_private_repos || 0,
          }
        : null,
      repositories: repos,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.message || error.message },
      { status: error.response?.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Test token with GitHub API
    const testRes = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Local-Docs-AI-Agent",
      },
      timeout: 8000,
    });

    // Save token to .env.local
    const envLocalPath = path.join(process.cwd(), ".env.local");
    let envContent = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, "utf-8") : "";

    if (envContent.includes("GITHUB_TOKEN=")) {
      envContent = envContent.replace(/GITHUB_TOKEN=.*/, `GITHUB_TOKEN=${token.trim()}`);
    } else {
      envContent += `\nGITHUB_TOKEN=${token.trim()}\n`;
    }

    fs.writeFileSync(envLocalPath, envContent, "utf-8");
    process.env.GITHUB_TOKEN = token.trim();

    return NextResponse.json({
      success: true,
      message: `Successfully connected GitHub account: @${testRes.data.login}`,
      user: {
        login: testRes.data.login,
        name: testRes.data.name,
        avatarUrl: testRes.data.avatar_url,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Invalid token: ${error.response?.data?.message || error.message}` },
      { status: 400 }
    );
  }
}
