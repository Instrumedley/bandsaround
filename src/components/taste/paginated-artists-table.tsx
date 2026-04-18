"use client";

import { useMemo, useState } from "react";

export type ArtistTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
};

type PaginatedArtistsTableProps = {
  title: string;
  description?: string;
  footnote?: string;
  columns: ArtistTableColumn[];
  rows: Record<string, string | number>[];
  pageSize?: number;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
};

export function PaginatedArtistsTable({
  title,
  description,
  footnote,
  columns,
  rows,
  pageSize = 50,
  loading = false,
  error = null,
  emptyMessage = "No artists found.",
}: PaginatedArtistsTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  const currentPage = Math.min(Math.max(1, page), totalPages);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  function goPrev() {
    setPage((p) => Math.max(1, Math.min(p, totalPages) - 1));
  }

  function goNext() {
    setPage((p) => Math.min(totalPages, Math.min(p, totalPages) + 1));
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-400">Loading artists…</p>
      ) : null}

      {error && !loading ? (
        <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{emptyMessage}</p>
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          <div className="mt-3 overflow-x-auto rounded-md border border-slate-800">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-3 py-2 font-medium text-slate-300 ${
                        col.align === "right" ? "text-right tabular-nums" : ""
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr
                    key={`${currentPage}-${i}`}
                    className="border-b border-slate-800/80 last:border-b-0"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2 text-slate-200 ${
                          col.align === "right" ? "text-right tabular-nums" : ""
                        }`}
                      >
                        {row[col.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, rows.length)} of {rows.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={goPrev}
                className="rounded border border-slate-600 px-2 py-1 text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="tabular-nums">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={goNext}
                className="rounded border border-slate-600 px-2 py-1 text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}

      {footnote ? <p className="mt-3 text-xs text-slate-500">{footnote}</p> : null}
    </div>
  );
}
