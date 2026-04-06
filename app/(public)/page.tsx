export default function LandingRedirect() {
  return (
    <iframe
      src="/landing.html"
      style={{ width: '100vw', height: '100vh', border: 'none', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}
      title="RKV Consulting"
    />
  );
}
