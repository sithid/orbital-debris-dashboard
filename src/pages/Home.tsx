import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatCard } from '../components/StatCard'

type Stats = { total: number; inOrbit: number; zombie: number }

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: Stats }
  | { status: 'error'; message: string }

export default function Home() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/stats', { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as Stats
        setState({ status: 'ready', data })
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load stats',
        })
      })
    return () => controller.abort()
  }, [])

  const value = (key: keyof Stats): number | null =>
    state.status === 'ready' ? state.data[key] : null

  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-8 py-16 md:grid-cols-2 md:items-center">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted">
          Orbital debris dashboard
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-fg md:text-5xl">
          Explore every tracked object in low Earth orbit.
        </h1>
        <p className="mt-6 max-w-prose text-muted">
          A merged SATCAT + UCS catalog of every satellite and piece of debris
          currently tracked. Search by name or NORAD ID, filter by orbit class,
          and drill into the full profile for any object.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/objects"
            className="rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-background hover:bg-gold-hover"
          >
            Browse objects
          </Link>
          <Link
            to="/about"
            className="rounded-lg border border-border px-5 py-3 text-sm font-semibold text-fg hover:border-cyan"
          >
            About the data
          </Link>
        </div>
        {state.status === 'error' && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
          >
            Couldn't load stats: {state.message}
          </p>
        )}
      </div>

      <div className="grid gap-4">
        <StatCard
          label="Total objects"
          value={value('total')}
          hint="Tracked across SATCAT and UCS sources"
        />
        <StatCard
          label="In orbit"
          value={value('inOrbit')}
          hint="Currently in orbit (not decayed)"
        />
        <StatCard
          label="Zombie"
          value={value('zombie')}
          hint="Non-operational but still orbiting"
        />
      </div>
    </section>
  )
}
