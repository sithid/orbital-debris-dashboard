import { Link } from 'react-router-dom'
import { buttonClasses } from '../components/atoms/Button'
import { Eyebrow } from '../components/atoms/Eyebrow'

export default function About() {
  return (
    <section className="mx-auto max-w-4xl px-8 py-12">
      <Eyebrow>About</Eyebrow>
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
          <Eyebrow as="h2">
            Data sources
          </Eyebrow>
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
          <Eyebrow as="h2">
            Methodology
          </Eyebrow>
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
          <Eyebrow as="h2">
            Scope of v1
          </Eyebrow>
          <ul className="mt-3 space-y-2 text-fg">
            <li>Read-only browsing, searching, and filtering of the catalog.</li>
            <li>Per-object detail pages with identification, orbital, ownership, launch, and risk fields.</li>
            <li>
              <span className="text-muted">Deferred:</span> data export, user
              accounts, and live updates.
            </li>
          </ul>
        </section>

        <section>
          <Eyebrow as="h2">
            About the globe
          </Eyebrow>
          <p className="mt-3 max-w-prose text-fg">
            The <span className="font-semibold text-cyan">/globe</span> view
            draws each object as a tilted ellipse derived from its semi-major
            axis, eccentricity, and inclination. The dataset does{' '}
            <em>not</em> contain RAAN, argument of perigee, mean anomaly, or
            epoch, so orbit orientations are{' '}
            <span className="font-semibold text-warning">randomized at render time</span>,
            and altitudes above Earth are exaggerated{' '}
            <span className="font-mono">2.5×</span> so the LEO shell isn't
            visually crammed against the surface. The globe shows{' '}
            <em>which orbits exist</em>, not where any object is right now.
            Real-time positions would require ingesting live TLEs from
            Space-Track or Celestrak.
          </p>
          <p className="mt-3 max-w-prose text-fg">
            The globe shows every in-orbit object with usable orbital geometry —
            about <span className="font-mono">33,900</span> of the catalog's{' '}
            <span className="font-mono">68,727</span> objects. The remainder are
            excluded because they have decayed or lack a semi-major axis,
            eccentricity, or inclination — they are not sampled away. Filtering
            by type or orbit class narrows the set further; on small screens a
            reduced sample is drawn for performance.
          </p>
        </section>

        <section>
          <Eyebrow as="h2">
            Project context
          </Eyebrow>
          <p className="mt-3 max-w-prose text-fg">
            Built on Cloudflare Workers + D1 with a React/Vite frontend served
            as static assets from the same Worker. Source code and issues live
            on GitHub.
          </p>
        </section>
      </div>

      <div className="mt-12">
        <Link to="/objects" className={buttonClasses('primary', 'md', 'font-semibold')}>
          Browse objects
        </Link>
      </div>
    </section>
  )
}
