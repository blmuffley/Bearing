/**
 * Loading skeleton for the assessment detail page.
 *
 * Displays placeholder cards with pulse animations that match the dark
 * Bearing brand theme while the real data is being fetched.
 */
export default function AssessmentDetailLoading() {
  return (
    <main className="min-h-screen bg-obsidian px-6 py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Page header skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-dark-gray" />
          <div className="h-4 w-40 animate-pulse rounded-md bg-dark-gray/60" />
        </div>

        {/* Top row: health gauge + revenue summary */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Health gauge placeholder */}
          <div className="rounded-2xl border border-dark-gray bg-dark-gray/50 p-6">
            <div className="mb-4 h-4 w-28 animate-pulse rounded bg-dark-gray" />
            <div className="mx-auto flex h-40 w-40 items-center justify-center">
              <div className="h-36 w-36 animate-pulse rounded-full border-8 border-dark-gray bg-dark-gray/30" />
            </div>
            <div className="mt-4 mx-auto h-4 w-20 animate-pulse rounded bg-dark-gray" />
          </div>

          {/* Revenue summary placeholder */}
          <div className="rounded-2xl border border-dark-gray bg-dark-gray/50 p-6">
            <div className="mb-4 h-4 w-36 animate-pulse rounded bg-dark-gray" />
            <div className="h-10 w-48 animate-pulse rounded-lg bg-dark-gray mb-6" />
            <div className="space-y-3">
              <div className="h-3 w-full animate-pulse rounded bg-dark-gray/60" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-dark-gray/60" />
              <div className="h-3 w-4/6 animate-pulse rounded bg-dark-gray/60" />
            </div>
          </div>
        </div>

        {/* Domain score cards */}
        <div>
          <div className="mb-4 h-4 w-32 animate-pulse rounded bg-dark-gray" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-dark-gray bg-dark-gray/50 p-5"
              >
                <div className="mb-3 h-3 w-16 animate-pulse rounded bg-dark-gray" />
                <div className="h-8 w-12 animate-pulse rounded-lg bg-dark-gray mb-2" />
                <div className="h-2 w-full animate-pulse rounded-full bg-dark-gray/40" />
              </div>
            ))}
          </div>
        </div>

        {/* Findings table placeholder */}
        <div className="rounded-2xl border border-dark-gray bg-dark-gray/50 p-6">
          <div className="mb-6 h-4 w-24 animate-pulse rounded bg-dark-gray" />

          {/* Table header */}
          <div className="mb-4 grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded bg-dark-gray/60"
              />
            ))}
          </div>

          {/* Table rows */}
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-6 gap-4"
              >
                <div className="col-span-2 h-4 animate-pulse rounded bg-dark-gray/40" />
                <div className="h-4 animate-pulse rounded bg-dark-gray/30" />
                <div className="h-4 animate-pulse rounded bg-dark-gray/30" />
                <div className="h-4 animate-pulse rounded bg-dark-gray/30" />
                <div className="h-4 animate-pulse rounded bg-dark-gray/20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
