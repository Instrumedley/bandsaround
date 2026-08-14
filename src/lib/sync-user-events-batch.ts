import {
  getCachedBandsintownArtist,
  saveCachedBandsintownArtist,
} from "@/lib/bandsintown-artist-cache";
import {
  appendSyncLog,
  getEventSyncJob,
  saveEventSyncJob,
  type EventSyncJob,
  type EventSyncMode,
} from "@/lib/event-sync-job-store";
import {
  buildStoredEventsSummary,
  getUserEvents,
  mergeUserEventsUpdate,
  type CachedArtistEvents,
} from "@/lib/event-store";
import { sleep } from "@/lib/ingestion/bandsintown-event-mapper";
import {
  CLOUDFLARE_RETRY_DELAYS_MS,
  EVENTS_BATCH_DELAY_MS_MAX,
  EVENTS_BATCH_DELAY_MS_MIN,
  EVENTS_STALE_DAYS,
  randomDelayMs,
  SEARCH_DELAY_MS_MAX,
  SEARCH_DELAY_MS_MIN,
  SYNC_EVENTS_BATCH_SIZE,
  SYNC_RESOLVE_BATCH_SIZE,
} from "@/lib/ingestion/sync-config";
import {
  fetchEventsFromArtistPage,
  searchBandsintownArtist,
} from "@/lib/ingestion/bandsintown-web";
import { getTasteProfile } from "@/lib/taste-profile-store";
import { normalizeArtistName } from "@/lib/normalize-artist-name";
import { DEFAULT_EVENT_WINDOW_MONTHS } from "@/lib/sync-user-events";

function addMonths(baseDate: Date, months: number): Date {
  const result = new Date(baseDate);
  result.setMonth(result.getMonth() + months);
  return result;
}

function stripArtistPageUrl(href: string): string {
  const url = new URL(href);
  return `${url.origin}${url.pathname}`;
}

function isCacheStale(scrapedAt: string, forceRefresh: boolean): boolean {
  if (forceRefresh) {
    return true;
  }

  const ageMs = Date.now() - new Date(scrapedAt).getTime();
  return ageMs > EVENTS_STALE_DAYS * 24 * 60 * 60 * 1000;
}

function isTransientBandsintownError(message: string): boolean {
  return /504|503|502|429|403|cloudflare|gateway time-out|gateway timeout|blocked|time-out|timeout/i.test(
    message,
  );
}

async function withTransientRetry<T>(
  job: EventSyncJob,
  label: string,
  action: () => Promise<T>,
): Promise<{ result: T; job: EventSyncJob }> {
  let nextJob = job;

  for (let attempt = 0; attempt <= CLOUDFLARE_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const result = await action();
      return { result, job: nextJob };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const retryDelay = CLOUDFLARE_RETRY_DELAYS_MS[attempt];

      if (!isTransientBandsintownError(message) || retryDelay === undefined) {
        throw error;
      }

      nextJob = appendSyncLog(
        nextJob,
        "warn",
        `${label}: transient Bandsintown/Cloudflare error. Waiting ${Math.round(retryDelay / 1000)}s before retry ${attempt + 1}/${CLOUDFLARE_RETRY_DELAYS_MS.length}…`,
      );
      await saveEventSyncJob(nextJob);
      await sleep(retryDelay);
    }
  }

  throw new Error(`${label}: retries exhausted`);
}

export type SyncStepResult = {
  job: EventSyncJob;
  done: boolean;
  nextDelayMs: number;
  eventsCount: number;
};

async function ensureUserEventsRecord(userId: string, artistsQueried: number) {
  const dateFrom = new Date();
  const dateTo = addMonths(dateFrom, DEFAULT_EVENT_WINDOW_MONTHS);
  const existing = await getUserEvents(userId);

  if (existing) {
    return existing;
  }

  return mergeUserEventsUpdate(userId, {
    dateFrom: dateFrom.toISOString().slice(0, 10),
    dateTo: dateTo.toISOString().slice(0, 10),
    artistsQueried,
    artistEventsCache: {},
    events: [],
    artistsWithEvents: 0,
    rawEventsTotal: 0,
  });
}

function canResumeJob(previous: EventSyncJob | null, mode: EventSyncMode): previous is EventSyncJob {
  if (!previous) {
    return false;
  }

  return (
    previous.mode === mode &&
    (previous.status === "failed" || previous.status === "cancelled") &&
    (mode === "resolve-urls"
      ? previous.resolveCursor < previous.totalArtists
      : previous.eventsCursor < previous.totalArtists)
  );
}

export async function startEventSyncJob(
  userId: string,
  options: { mode: EventSyncMode; forceRefresh?: boolean },
): Promise<EventSyncJob> {
  const tasteProfile = await getTasteProfile(userId);
  if (!tasteProfile || tasteProfile.artists.length === 0) {
    throw new Error("TASTE_PROFILE_MISSING");
  }

  const existing = await getEventSyncJob(userId);
  if (existing?.status === "running") {
    const staleMs = Date.now() - new Date(existing.updatedAt).getTime();
    if (staleMs < 3 * 60 * 1000) {
      return existing;
    }
  }

  await ensureUserEventsRecord(userId, tasteProfile.artists.length);

  const resumeFrom = canResumeJob(existing, options.mode) ? existing : null;

  let job: EventSyncJob = {
    userId,
    status: "running",
    mode: options.mode,
    phase: options.mode === "refresh-events" ? "events" : "resolve",
    startedAt: resumeFrom?.startedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalArtists: tasteProfile.artists.length,
    resolveCursor: resumeFrom?.resolveCursor ?? 0,
    eventsCursor: resumeFrom?.eventsCursor ?? 0,
    artistsResolved: resumeFrom?.artistsResolved ?? 0,
    artistsScraped: resumeFrom?.artistsScraped ?? 0,
    eventsFound: resumeFrom?.eventsFound ?? 0,
    forceRefresh: Boolean(options.forceRefresh),
    logs: resumeFrom?.logs ?? [],
  };

  if (resumeFrom) {
    job = appendSyncLog(
      job,
      "info",
      options.mode === "resolve-urls"
        ? `Resuming artist URL collection from ${job.resolveCursor + 1}/${job.totalArtists}.`
        : `Resuming concert refresh from ${job.eventsCursor + 1}/${job.totalArtists}.`,
    );
  } else if (options.mode === "resolve-urls") {
    job = appendSyncLog(
      job,
      "info",
      "Collecting Bandsintown artist page URLs. Cached URLs are reused; only missing artists are searched.",
    );
  } else {
    job = appendSyncLog(
      job,
      "info",
      "Refreshing concerts from cached artist URLs only. Run “Collect artist URLs” first for any new taste-profile artists.",
    );
  }

  await saveEventSyncJob(job);
  return job;
}

function finishResolvePhase(job: EventSyncJob): SyncStepResult {
  let nextJob = appendSyncLog(
    job,
    "info",
    `Artist URL collection finished (${job.resolveCursor}/${job.totalArtists} taste-profile artists processed).`,
  );
  nextJob = {
    ...nextJob,
    status: "completed",
    phase: "done",
    updatedAt: new Date().toISOString(),
  };
  return {
    job: nextJob,
    done: true,
    nextDelayMs: 0,
    eventsCount: 0,
  };
}

async function processResolveBatch(job: EventSyncJob): Promise<SyncStepResult> {
  const tasteProfile = await getTasteProfile(job.userId);
  if (!tasteProfile) {
    throw new Error("TASTE_PROFILE_MISSING");
  }

  if (job.resolveCursor >= job.totalArtists) {
    const finished = finishResolvePhase(job);
    await saveEventSyncJob(finished.job);
    return finished;
  }

  const batch = tasteProfile.artists.slice(
    job.resolveCursor,
    job.resolveCursor + SYNC_RESOLVE_BATCH_SIZE,
  );

  let nextJob = job;

  for (const artist of batch) {
    const cached = await getCachedBandsintownArtist(artist.name);
    if (cached) {
      nextJob = appendSyncLog(
        nextJob,
        "info",
        `Using cached URL for ${artist.name} → ${cached.artistPageUrl}`,
      );
      nextJob = {
        ...nextJob,
        artistsResolved: nextJob.artistsResolved + 1,
        resolveCursor: nextJob.resolveCursor + 1,
      };
      continue;
    }

    nextJob = appendSyncLog(nextJob, "info", `Searching Bandsintown for ${artist.name}…`);

    try {
      const { result: match, job: jobAfterRetry } = await withTransientRetry(
        nextJob,
        `Search for ${artist.name}`,
        () => searchBandsintownArtist(artist.name),
      );
      nextJob = jobAfterRetry;

      if (!match) {
        nextJob = appendSyncLog(nextJob, "warn", `No Bandsintown match found for ${artist.name}.`);
        nextJob = { ...nextJob, resolveCursor: nextJob.resolveCursor + 1 };
        continue;
      }

      const artistPageUrl = stripArtistPageUrl(match.href);
      await saveCachedBandsintownArtist({
        spotifyName: artist.name,
        normalizedName: normalizeArtistName(artist.name),
        bandsintownName: match.name,
        bandsintownId: match.id,
        artistPageUrl,
        resolvedAt: new Date().toISOString(),
      });

      nextJob = appendSyncLog(
        nextJob,
        "info",
        `Resolved ${artist.name} → ${artistPageUrl}`,
      );
      nextJob = {
        ...nextJob,
        artistsResolved: nextJob.artistsResolved + 1,
        resolveCursor: nextJob.resolveCursor + 1,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown search error";
      nextJob = appendSyncLog(
        nextJob,
        "error",
        `Search failed for ${artist.name}: ${message}. Skipping and continuing.`,
      );
      nextJob = { ...nextJob, resolveCursor: nextJob.resolveCursor + 1 };
    }
  }

  nextJob = appendSyncLog(
    nextJob,
    "info",
    `Artist URLs: ${nextJob.resolveCursor}/${nextJob.totalArtists} processed.`,
  );
  nextJob = { ...nextJob, updatedAt: new Date().toISOString() };
  await saveEventSyncJob(nextJob);

  if (nextJob.resolveCursor >= nextJob.totalArtists) {
    const finished = finishResolvePhase(nextJob);
    await saveEventSyncJob(finished.job);
    return finished;
  }

  return {
    job: nextJob,
    done: false,
    nextDelayMs: randomDelayMs(SEARCH_DELAY_MS_MIN, SEARCH_DELAY_MS_MAX),
    eventsCount: (await getUserEvents(job.userId))?.events.length ?? 0,
  };
}

async function processEventsBatch(job: EventSyncJob): Promise<SyncStepResult> {
  const tasteProfile = await getTasteProfile(job.userId);
  if (!tasteProfile) {
    throw new Error("TASTE_PROFILE_MISSING");
  }

  const dateFrom = new Date();
  const dateTo = addMonths(dateFrom, DEFAULT_EVENT_WINDOW_MONTHS);
  const userEvents = await ensureUserEventsRecord(job.userId, tasteProfile.artists.length);
  const artistEventsCache: Record<string, CachedArtistEvents> = {
    ...(userEvents.artistEventsCache ?? {}),
  };

  if (job.eventsCursor >= job.totalArtists) {
    const summary = buildStoredEventsSummary({
      artistEventsCache,
      dateFrom: dateFrom.toISOString().slice(0, 10),
      dateTo: dateTo.toISOString().slice(0, 10),
      artistsQueried: tasteProfile.artists.length,
    });

    await mergeUserEventsUpdate(job.userId, {
      ...summary,
      dateFrom: dateFrom.toISOString().slice(0, 10),
      dateTo: dateTo.toISOString().slice(0, 10),
      artistsQueried: tasteProfile.artists.length,
      artistEventsCache,
    });

    let nextJob = appendSyncLog(
      job,
      "info",
      `Concert refresh complete. ${summary.events.length} Europe shows from ${summary.artistsWithEvents}/${tasteProfile.artists.length} artists.`,
    );
    nextJob = {
      ...nextJob,
      status: "completed",
      phase: "done",
      eventsFound: summary.events.length,
      updatedAt: new Date().toISOString(),
    };
    await saveEventSyncJob(nextJob);

    return {
      job: nextJob,
      done: true,
      nextDelayMs: 0,
      eventsCount: summary.events.length,
    };
  }

  const batch = tasteProfile.artists.slice(
    job.eventsCursor,
    job.eventsCursor + SYNC_EVENTS_BATCH_SIZE,
  );

  let nextJob = appendSyncLog(
    job,
    "info",
    batch.length > 0
      ? `Processing artist ${job.eventsCursor + 1}/${job.totalArtists}: ${batch[0]?.name ?? "?"}.`
      : `No artists left to scrape.`,
  );
  await saveEventSyncJob(nextJob);

  for (const artist of batch) {
    const normalizedName = normalizeArtistName(artist.name);
    const cachedEntry = artistEventsCache[normalizedName];

    if (cachedEntry && !isCacheStale(cachedEntry.scrapedAt, job.forceRefresh)) {
      nextJob = appendSyncLog(
        nextJob,
        "info",
        `Using cached events for ${artist.name} (${cachedEntry.events.length} shows).`,
      );
      nextJob = {
        ...nextJob,
        artistsScraped: nextJob.artistsScraped + 1,
        eventsCursor: nextJob.eventsCursor + 1,
      };
      await saveEventSyncJob(nextJob);
      continue;
    }

    const cachedArtist = await getCachedBandsintownArtist(artist.name);
    if (!cachedArtist) {
      nextJob = appendSyncLog(
        nextJob,
        "warn",
        `Skipping ${artist.name}: no cached Bandsintown URL. Run “Collect artist URLs” first.`,
      );
      nextJob = { ...nextJob, eventsCursor: nextJob.eventsCursor + 1 };
      await saveEventSyncJob(nextJob);
      continue;
    }

    nextJob = appendSyncLog(
      nextJob,
      "info",
      `Scraping tour dates for ${artist.name} from ${cachedArtist.artistPageUrl}…`,
    );
    await saveEventSyncJob(nextJob);

    try {
      const { result, job: jobAfterRetry } = await withTransientRetry(
        nextJob,
        `Scrape for ${artist.name}`,
        () =>
          fetchEventsFromArtistPage({
            artist: { name: artist.name, rank: artist.rank },
            artistPageUrl: cachedArtist.artistPageUrl,
            dateFrom,
            dateTo,
          }),
      );
      nextJob = jobAfterRetry;

      artistEventsCache[normalizedName] = {
        artistName: artist.name,
        normalizedName,
        events: result.events,
        rawEventsCount: result.rawEventsCount,
        scrapedAt: new Date().toISOString(),
      };

      nextJob = appendSyncLog(
        nextJob,
        result.events.length > 0 ? "info" : "warn",
        `${artist.name}: ${result.events.length} Europe show(s) kept (${result.rawEventsCount} raw in window).`,
      );
      nextJob = {
        ...nextJob,
        artistsScraped: nextJob.artistsScraped + 1,
        eventsCursor: nextJob.eventsCursor + 1,
      };
      await saveEventSyncJob(nextJob);

      const partialSummary = buildStoredEventsSummary({
        artistEventsCache,
        dateFrom: dateFrom.toISOString().slice(0, 10),
        dateTo: dateTo.toISOString().slice(0, 10),
        artistsQueried: tasteProfile.artists.length,
      });
      await mergeUserEventsUpdate(job.userId, {
        ...partialSummary,
        dateFrom: dateFrom.toISOString().slice(0, 10),
        dateTo: dateTo.toISOString().slice(0, 10),
        artistsQueried: tasteProfile.artists.length,
        artistEventsCache,
      });
      nextJob = { ...nextJob, eventsFound: partialSummary.events.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scrape error";
      nextJob = appendSyncLog(
        nextJob,
        "error",
        `Scrape failed for ${artist.name}: ${message}. Skipping and continuing.`,
      );
      nextJob = { ...nextJob, eventsCursor: nextJob.eventsCursor + 1 };
      await saveEventSyncJob(nextJob);
    }
  }

  const summary = buildStoredEventsSummary({
    artistEventsCache,
    dateFrom: dateFrom.toISOString().slice(0, 10),
    dateTo: dateTo.toISOString().slice(0, 10),
    artistsQueried: tasteProfile.artists.length,
  });

  await mergeUserEventsUpdate(job.userId, {
    ...summary,
    dateFrom: dateFrom.toISOString().slice(0, 10),
    dateTo: dateTo.toISOString().slice(0, 10),
    artistsQueried: tasteProfile.artists.length,
    artistEventsCache,
  });

  nextJob = {
    ...nextJob,
    eventsFound: summary.events.length,
    updatedAt: new Date().toISOString(),
  };
  nextJob = appendSyncLog(
    nextJob,
    "info",
    `Progress: ${nextJob.eventsCursor}/${nextJob.totalArtists} artists scraped, ${summary.events.length} Europe shows so far.`,
  );
  await saveEventSyncJob(nextJob);

  if (nextJob.eventsCursor >= nextJob.totalArtists) {
    let finishedJob = appendSyncLog(
      nextJob,
      "info",
      `Concert refresh complete. ${summary.events.length} Europe shows from ${summary.artistsWithEvents}/${tasteProfile.artists.length} artists.`,
    );
    finishedJob = {
      ...finishedJob,
      status: "completed",
      phase: "done",
      eventsFound: summary.events.length,
    };
    await saveEventSyncJob(finishedJob);
    return {
      job: finishedJob,
      done: true,
      nextDelayMs: 0,
      eventsCount: summary.events.length,
    };
  }

  return {
    job: nextJob,
    done: false,
    nextDelayMs: randomDelayMs(EVENTS_BATCH_DELAY_MS_MIN, EVENTS_BATCH_DELAY_MS_MAX),
    eventsCount: summary.events.length,
  };
}

export async function runEventSyncStep(userId: string): Promise<SyncStepResult> {
  const job = await getEventSyncJob(userId);
  if (!job || job.status !== "running") {
    throw new Error("SYNC_NOT_RUNNING");
  }

  if (job.phase === "resolve") {
    return processResolveBatch(job);
  }

  if (job.phase === "events") {
    return processEventsBatch(job);
  }

  return {
    job,
    done: true,
    nextDelayMs: 0,
    eventsCount: (await getUserEvents(userId))?.events.length ?? 0,
  };
}

export async function cancelEventSyncJob(userId: string): Promise<EventSyncJob | null> {
  const job = await getEventSyncJob(userId);
  if (!job) {
    return null;
  }

  const cancelled = appendSyncLog(
    {
      ...job,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    },
    "warn",
    "Sync cancelled.",
  );
  await saveEventSyncJob(cancelled);
  return cancelled;
}
