"use client";

import { useState, useEffect, useCallback } from "react";

export interface DriveStatus {
  connected: boolean;
  userDriveConnected: boolean;
  email?: string | null;
  updatedAt?: string | null;
  rootFolderId?: string | null;
}

export function useDrive() {
  const [status, setStatus] = useState<DriveStatus>({
    connected: false,
    userDriveConnected: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/drive/status");
      if (res.ok) {
        const data = await res.json();
        setStatus({
          connected: Boolean(data.connected),
          userDriveConnected: Boolean(data.userDriveConnected),
          email: data.email || null,
          updatedAt: data.updatedAt || null,
          rootFolderId: data.rootFolderId || null,
        });
      }
    } catch (err) {
      console.error("[useDrive] Error fetching drive status:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Check if user just redirected back from Google OAuth callback
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("drive_connected") === "true") {
        fetchStatus();
        url.searchParams.delete("drive_connected");
        url.searchParams.delete("drive_email");
        window.history.replaceState({}, document.title, url.toString());
      }
    }
  }, [fetchStatus]);

  const connectDrive = (returnTo?: string) => {
    const dest = returnTo || (typeof window !== "undefined" ? window.location.pathname : "/assistant");
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(dest)}`;
  };

  const disconnectDrive = async () => {
    try {
      setIsDisconnecting(true);
      const res = await fetch("/api/drive/status", { method: "POST" });
      if (res.ok) {
        setStatus({
          connected: false,
          userDriveConnected: false,
          email: null,
          updatedAt: null,
        });
      }
    } catch (err) {
      console.error("[useDrive] Error disconnecting drive:", err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return {
    ...status,
    isLoading,
    isDisconnecting,
    connectDrive,
    disconnectDrive,
    refreshStatus: fetchStatus,
  };
}
