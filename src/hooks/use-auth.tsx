"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { UserDTO, CheckUserResponse } from "@/types";

interface AuthContextType {
  user: UserDTO | null;
  isLoading: boolean;
  checkUsername: (name: string) => Promise<CheckUserResponse>;
  loginOrCreateUser: (name: string) => Promise<UserDTO>;
  signupWithEmail: (name: string, email: string, password: string) => Promise<UserDTO>;
  loginWithEmail: (email: string, password: string) => Promise<UserDTO>;
  loginWithSocial: (
    provider: "google" | "github" | "demo",
    details?: { email?: string; name?: string; avatarUrl?: string }
  ) => Promise<UserDTO>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to load authenticated user:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const checkUsername = async (name: string): Promise<CheckUserResponse> => {
    const res = await fetch("/api/users/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to check username");
    }

    return res.json();
  };

  const getClientMeta = () => {
    if (typeof window === "undefined") return {};
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      referrer: document.referrer || window.location.origin,
      language: navigator.language,
    };
  };

  const signupWithEmail = async (name: string, email: string, password: string): Promise<UserDTO> => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        clientDetails: getClientMeta(),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create account");
    }

    const data = await res.json();
    setUser(data.user);
    return data.user;
  };

  const loginWithEmail = async (email: string, password: string): Promise<UserDTO> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        clientDetails: getClientMeta(),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to log in");
    }

    const data = await res.json();
    setUser(data.user);
    return data.user;
  };

  const loginWithSocial = async (
    provider: "google" | "github" | "demo",
    details?: { email?: string; name?: string; avatarUrl?: string }
  ): Promise<UserDTO> => {
    const res = await fetch("/api/auth/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        email: details?.email,
        name: details?.name,
        avatarUrl: details?.avatarUrl,
        clientDetails: getClientMeta(),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `${provider} authentication failed`);
    }

    const data = await res.json();
    setUser(data.user);
    return data.user;
  };

  const loginOrCreateUser = async (name: string): Promise<UserDTO> => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        clientDetails: getClientMeta(),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to initialize user workspace");
    }

    const data = await res.json();
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await fetch("/api/users/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout request error:", err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        checkUsername,
        loginOrCreateUser,
        signupWithEmail,
        loginWithEmail,
        loginWithSocial,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
