import { Link } from 'react-router-dom'

export default function About() {
  return (
    <section className="mx-auto max-w-4xl px-8 py-12">
      <p className="text-xs uppercase tracking-widest text-muted">About</p>
      <h1 className="mt-2 text-3xl font-semibold text-fg md:text-4xl">
        About this dashboard
      </h1>
      <p className="mt-6 max-w-prose text-muted">
        A public, read-only view of a merged SATCAT + UCS orbital debris catalog.
        It exists so researchers, students, and enthusiasts can explore every
        tracked object in low Earth orbit without writing SQL or stitching
        together raw tables.
      </p>

      <div className="mt-10 space-y-8">
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted">
            Data sources
          </h2>
          <ul className="mt-3 space-y-3 text-fg">
            <li>
              <span className="font-semibold text-cyan">SATCAT</span> — the
              Space-Track satellite catalog of every tracked object, including
              identification, orbital parameters, and decay status.
            </li>
            <li>
              <span className="font-semibold text-cyan">UCS Satellite Database</span> — the
              Union of Concerned Scientists' active-satellite database, used
              for ownership, operator, launch site, and purpose data.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted">
            Methodology
          </h2>
          <p className="mt-3 max-w-prose text-fg">
            Records are merged on NORAD ID. Where SATCAT and UCS disagree,
            SATCAT wins for orbital and identification fields and UCS wins for
            ownership, purpose, and operator fields. Risk fields (kinetic
            energy, zombie classification) are computed from the merged record
            by the upstream pipeline.
          </p>
          <p className="mt-3 max-w-prose text-fg">
            The dataset is a static snapshot. It is not a live feed — it does
            not replace Space-Track or Celestrak for real-time work.
          </p>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted">
            Scope of v1
          </h2>
          <ul className="mt-3 space-y-2 text-fg">
            <li>Read-only browsing, searching, and filtering of the catalog.</li>
            <li>Per-object detail pages with identification, orbital, ownership, launch, and risk fields.</li>
            <li>
              <span className="text-muted">Deferred:</span> 3D globe
              visualization, data export, user accounts, and live updates.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted">
            Project context
          </h2>
          <p className="mt-3 max-w-prose text-fg">
            Built on Cloudflare Workers + D1 with a React/Vite frontend served
            as static assets from the same Worker. Source code and issues live
            on GitHub.
          </p>
        </section>
      </div>

      <div className="mt-12">
        <Link
          to="/objects"
          className="inline-block rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-background hover:bg-gold-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          Browse objects
        </Link>
      </div>
    </section>
  )
}
