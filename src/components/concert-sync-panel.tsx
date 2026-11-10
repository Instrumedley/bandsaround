"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type SyncLogEntry = {
  at: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
};

type SyncJobMode = "resolve-urls" | "refresh-events";

type SyncJob = {
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
  mode: SyncJobMode;
  phase: "resolve" | "events" | "done";
  totalArtists: number;
  resolveCursor: number;
  eventsCursor: number;
  eventsFound: number;
  logs: SyncLogEntry[];
  error?: string;
};

type ConcertSyncPanelProps = {
  disabled?: boolean;
};

function formatLogTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

function logLevelClass(level: SyncLogEntry["level"]): string {
  if (level === "error") {
    return "text-rose-200";
  }
  if (level === "warn") {
    return "text-amber-200";
  }
  if (level === "success") {
    return "font-semibold text-brand-accent";
  }
  return "text-brand-cream/95";
}

function phaseLabel(job: SyncJob): string {
  if (job.mode === "resolve-urls" || job.phase === "resolve") {
    return `Collecting artist URLs (${job.resolveCursor}/${job.totalArtists})`;
  }
  if (job.phase === "events") {
    return `Scraping tour dates (${job.eventsCursor}/${job.totalArtists})`;
  }
  return "Finishing up";
}

export function ConcertSyncPanel({ disabled = false }: ConcertSyncPanelProps) {
  const router = useRouter();
  const [job, setJob] = useState<SyncJob | null>(null);
  const [eventsCount, setEventsCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [activeMode, setActiveMode] = useState<SyncJobMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const refreshStatus = useCallback(async () => {
    const response = await fetch("/api/events/sync/status", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      job: SyncJob | null;
      eventsCount: number;
    };

    if (data.job) {
      setJob(data.job);
    }
    setEventsCount(data.eventsCount);
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [job?.logs.length]);

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });

  const runSyncLoop = useCallback(
    async (mode: SyncJobMode) => {
      cancelRef.current = false;
      setIsRunning(true);
      setActiveMode(mode);
      setError(null);

      try {
        const startResponse = await fetch("/api/events/sync/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode }),
        });

        const startData = (await startResponse.json()) as {
          job?: SyncJob;
          error?: string;
        };

        if (!startResponse.ok || !startData.job) {
          throw new Error(startData.error ?? "Failed to start sync");
        }

        setJob(startData.job);

        while (!cancelRef.current) {
          const pollInterval = window.setInterval(() => {
            void refreshStatus();
          }, 2000);

          let stepResponse: Response;
          try {
            stepResponse = await fetch("/api/events/sync/step", {
              method: "POST",
            });
          } finally {
            window.clearInterval(pollInterval);
          }
          const stepData = (await stepResponse.json()) as {
            job?: SyncJob;
            done?: boolean;
            nextDelayMs?: number;
            eventsCount?: number;
            error?: string;
          };

          if (!stepResponse.ok || !stepData.job) {
            throw new Error(stepData.error ?? "Sync step failed");
          }

          setJob(stepData.job);
          if (typeof stepData.eventsCount === "number") {
            setEventsCount(stepData.eventsCount);
          }

          router.refresh();

          if (stepData.done || stepData.job.status !== "running") {
            break;
          }

          const delayMs = stepData.nextDelayMs ?? 6_000;
          setJob((current) =>
            current
              ? {
                  ...current,
                  logs: [
                    ...current.logs,
                    {
                      at: new Date().toISOString(),
                      level: "info",
                      message: `Pausing ${Math.round(delayMs / 1000)}s before next batch…`,
                    },
                  ],
                }
              : current,
          );

          await sleep(delayMs);
        }
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : "Sync failed";
        setError(message);
      } finally {
        setIsRunning(false);
        setActiveMode(null);
        await refreshStatus();
        router.refresh();
      }
    },
    [refreshStatus, router],
  );

  const handleCancel = useCallback(async () => {
    cancelRef.current = true;
    await fetch("/api/events/sync/cancel", { method: "POST" });
    await refreshStatus();
    setIsRunning(false);
    setActiveMode(null);
  }, [refreshStatus]);

  const progressPercent = job
    ? Math.round(
        ((job.mode === "resolve-urls" || job.phase === "resolve"
          ? job.resolveCursor
          : job.eventsCursor) /
          Math.max(job.totalArtists, 1)) *
          100,
      )
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || isRunning}
          onClick={() => void runSyncLoop("resolve-urls")}
          className="rounded-md border border-brand-accent-dim/50 bg-brand-accent-dim/25 px-4 py-2 text-sm font-semibold text-brand-cream hover:bg-brand-accent-dim/35 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning && activeMode === "resolve-urls" ? "Collecting URLs…" : "Collect artist URLs"}
        </button>
        <button
          type="button"
          disabled={disabled || isRunning}
          onClick={() => void runSyncLoop("refresh-events")}
          className="rounded-md border border-brand-accent/40 bg-brand-accent/20 px-4 py-2 text-sm font-semibold text-brand-accent hover:bg-brand-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning && activeMode === "refresh-events" ? "Refreshing concerts…" : "Refresh concerts"}
        </button>
        {isRunning ? (
          <button
            type="button"
            onClick={() => void handleCancel()}
            className="rounded-md border border-rose-500/40 bg-rose-600/10 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-600/20"
          >
            Cancel
          </button>
        ) : null}
      </div>

      <p className="text-xs text-brand-muted">
        Step 1: collect artist page URLs (one-time per artist). Step 2: refresh concerts from those
        cached URLs only.
      </p>

      {isRunning && job ? (
        <div className="space-y-2 rounded-md border border-brand-accent/30 bg-brand-ink/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-brand-accent">
            <p>{phaseLabel(job)}</p>
            <p>{eventsCount} Europe shows so far</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-elevated">
            <div
              className="h-full rounded-full bg-brand-accent transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          Sync error: {error}
        </p>
      ) : null}

      {job?.status === "completed" ? (
        <p className="rounded-md border border-brand-accent/40 bg-brand-accent/10 px-3 py-2 text-sm text-brand-cream">
          {job.mode === "resolve-urls"
            ? `URL collection complete (${job.resolveCursor}/${job.totalArtists} artists processed).`
            : `Concert refresh complete: ${job.eventsFound} Europe shows cached.`}
        </p>
      ) : null}

      {job?.logs.length ? (
        <div className="rounded-md border border-brand-border/90 bg-brand-ink/80 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-brand-dim">Sync log</p>
          <div ref={logContainerRef} className="max-h-48 space-y-1 overflow-y-auto font-mono text-xs">
            {job.logs.map((entry, index) => (
              <p key={`${entry.at}-${index}`} className={logLevelClass(entry.level)}>
                <span className="text-brand-dim/90">{formatLogTime(entry.at)}</span> {entry.message}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
