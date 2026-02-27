import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — RKV Consulting',
};

export default function PrivacyPage() {
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

        <h1 className="page-title">Privacy Policy</h1>
        <p className="mt-3 text-[14px] font-body text-muted leading-[1.7]">
          Last updated: Feb 27, 2026
        </p>

        <div className="mt-10 space-y-8">
          <section className="bg-[var(--bg-secondary)] border border-border rounded-lg p-5">
            <h2 className="section-header">What we collect</h2>
            <p className="mt-3 text-[14px] font-body text-muted leading-[1.8]">
              We collect information you provide (account, portfolio, tenant, and property data) and
              technical data required to operate the platform (usage, device, and log data).
            </p>
          </section>

          <section className="bg-[var(--bg-secondary)] border border-border rounded-lg p-5">
            <h2 className="section-header">How we use data</h2>
            <p className="mt-3 text-[14px] font-body text-muted leading-[1.8]">
              We use your data to provide the product features you enable, generate analytics,
              automate workflows, and improve platform reliability and security.
            </p>
          </section>

          <section className="bg-[var(--bg-secondary)] border border-border rounded-lg p-5">
            <h2 className="section-header">Contact</h2>
            <p className="mt-3 text-[14px] font-body text-muted leading-[1.8]">
              Questions about privacy can be sent to{' '}
              <a className="text-gold hover:text-white transition-colors" href="mailto:support@rkv-consulting.com">
                support@rkv-consulting.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

