import Link from 'next/link';

export const metadata = {
  title: 'Security — RKV Consulting',
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-white">
      <div className="max-w-3xl mx-auto px-6 py-[96px]">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] font-body text-muted hover:text-white transition-colors"
          >
            <span className="text-muted-deep">←</span> Back to RKV
          </Link>
        </div>

        <h1 className="page-title">Security</h1>
        <p className="mt-3 text-[14px] font-body text-muted leading-[1.7]">
          We design RKV for reliability, least-privilege access, and strong tenant data boundaries.
        </p>

        <div className="mt-10 space-y-8">
          <section className="bg-[var(--bg-secondary)] border border-border rounded-lg p-5">
            <h2 className="section-header">Data protection</h2>
            <p className="mt-3 text-[14px] font-body text-muted leading-[1.8]">
              Data is encrypted in transit using TLS. Access is restricted by user authentication
              and row-level security in our database.
            </p>
          </section>

          <section className="bg-[var(--bg-secondary)] border border-border rounded-lg p-5">
            <h2 className="section-header">Responsible disclosure</h2>
            <p className="mt-3 text-[14px] font-body text-muted leading-[1.8]">
              If you believe you’ve found a security issue, please email{' '}
              <a className="text-gold hover:text-white transition-colors" href="mailto:security@rkv-consulting.com">
                security@rkv-consulting.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

