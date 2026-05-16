"use client";

import { useState, useEffect, useCallback } from "react";
import type { PipelineEvent } from "@/lib/types";

export function usePipelineStatus(analysisId: string | null) {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (selectedRetailers: string[], competitors?: string[]) => {
      if (!analysisId) return;

      setIsRunning(true);
      setEvents([]);
      setProgress(0);
      setError(null);
      setIsComplete(false);
      setCurrentMessage("Starting analysis...");

      // Kick off the pipeline
      await fetch("/api/pipeline/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, selectedRetailers, competitors }),
      });

      // Connect to SSE
      const eventSource = new EventSource(
        `/api/pipeline/status?analysisId=${analysisId}`
      );

      eventSource.onmessage = (e) => {
        try {
          const event: PipelineEvent = JSON.parse(e.data);
          setEvents((prev) => [...prev, event]);
          setProgress(Math.max(0, Math.min(100, event.progress)));
          setCurrentMessage(event.message);

          if (event.type === "complete") {
            setIsComplete(true);
            setIsRunning(false);
            eventSource.close();
          }
          if (event.type === "error" && event.progress === -1) {
            setError(event.message);
            setIsRunning(false);
            eventSource.close();
          }
        } catch {
          // ignore malformed events
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsRunning(false);
      };
    },
    [analysisId]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      setIsRunning(false);
    };
  }, []);

  const discoveries = events.filter((e) => e.type === "discovery");

  return {
    events,
    discoveries,
    isRunning,
    isComplete,
    progress,
    currentMessage,
    error,
    start,
  };
}
