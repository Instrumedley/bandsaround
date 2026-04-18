export default function SettingsPage() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h1 className="text-2xl font-semibold">Account Settings</h1>
      <p className="mt-2 text-sm text-slate-300">
        Auth foundation is in place. Spotify and Last.fm linking will be implemented next.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled
          className="rounded-md border border-slate-700 bg-slate-800 px-4 py-3 text-left text-sm text-slate-300 opacity-70"
        >
          Connect Spotify (coming soon)
        </button>
        <button
          type="button"
          disabled
          className="rounded-md border border-slate-700 bg-slate-800 px-4 py-3 text-left text-sm text-slate-300 opacity-70"
        >
          Connect Last.fm (coming soon)
        </button>
      </div>
    </section>
  );
}
