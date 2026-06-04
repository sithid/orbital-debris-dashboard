// The honesty disclaimer over the globe: orientations are randomized, altitudes
// exaggerated. Distinct warning styling, so it isn't a generic Card.
export function IllustrativeNotice() {
  return (
    <div className="pointer-events-auto rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-fg">
      <strong className="text-warning">Illustrative.</strong> Orbit orientations (RAAN,
      argument of perigee) are randomized at render time, and altitudes above Earth are
      exaggerated <span className="font-mono">2.5×</span> for visual clarity. This shows{' '}
      <em>which orbits exist</em>, not where objects are right now.
    </div>
  )
}
