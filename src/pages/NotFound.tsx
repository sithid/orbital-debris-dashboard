import { Eyebrow } from '../components/atoms/Eyebrow'

export default function NotFound() {
  return (
    <section className="px-8 py-16">
      <Eyebrow>404</Eyebrow>
      <h1 className="mt-2 text-4xl font-semibold text-fg">Not found</h1>
      <p className="mt-4 text-muted">The page you're looking for doesn't exist.</p>
    </section>
  )
}
