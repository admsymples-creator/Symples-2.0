"use client";

import { useEffect } from "react";

const CHUNK_ERROR_KEY = "chunk-load-reload-attempt";
const MAX_RELOAD_ATTEMPTS = 1;

function isChunkLoadError(message: string): boolean {
  return (
    message.includes("Failed to load chunk") ||
    message.includes("Loading chunk") ||
    message.includes("ChunkLoadError")
  );
}

export function ChunkLoadErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event.message ?? "";
      if (!isChunkLoadError(msg)) return;

      const attempts = parseInt(sessionStorage.getItem(CHUNK_ERROR_KEY) ?? "0", 10);
      if (attempts >= MAX_RELOAD_ATTEMPTS) {
        sessionStorage.removeItem(CHUNK_ERROR_KEY);
        return;
      }
      sessionStorage.setItem(CHUNK_ERROR_KEY, String(attempts + 1));
      window.location.reload();
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event.reason?.message ?? event.reason ?? "");
      if (!isChunkLoadError(msg)) return;

      const attempts = parseInt(sessionStorage.getItem(CHUNK_ERROR_KEY) ?? "0", 10);
      if (attempts >= MAX_RELOAD_ATTEMPTS) {
        sessionStorage.removeItem(CHUNK_ERROR_KEY);
        return;
      }
      sessionStorage.setItem(CHUNK_ERROR_KEY, String(attempts + 1));
      window.location.reload();
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
