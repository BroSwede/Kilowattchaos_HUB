export default function Brand({ sub = 'FTC BIOBUZZ 2026–27' }: { sub?: string }) {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">⚡</span>
      <div><b>Kilowattchaos Hub</b><small>{sub}</small></div>
    </div>
  );
}
