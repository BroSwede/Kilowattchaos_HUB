export default function Err({ e }: { e?: string | string[] }) {
  const m = Array.isArray(e) ? e[0] : e;
  return m ? <p className="err" role="alert">{m}</p> : null;
}
