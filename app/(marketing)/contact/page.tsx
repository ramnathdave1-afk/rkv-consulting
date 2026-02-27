import Link from 'next/link';

export const metadata = {
  title: 'Contact — RKV Consulting',
};

export default function ContactPage() {
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

        <h1 className="page-title">Contact</h1>
        <p className="mt-3 text-[18px] font-body text-muted leading-[1.7]">
          Talk to the team or request a demo.
        </p>

        <div className="mt-10 space-y-6">
          <div className="bg-[var(--bg-secondary)] border border-border rounded-lg p-5">
            <div className="label">EMAIL</div>
            <p className="mt-2 text-[14px] font-body text-white">
              <a className="text-gold hover:text-white transition-colors" href="mailto:support@rkv-consulting.com">
                support@rkv-consulting.com
              </a>
            </p>
            <p className="mt-2 text-[14px] font-body text-muted">
              For billing and general questions.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-border rounded-lg p-5">
            <div className="label">SALES</div>
            <p className="mt-2 text-[14px] font-body text-white">
              <a className="text-gold hover:text-white transition-colors" href="mailto:sales@rkv-consulting.com">
                sales@rkv-consulting.com
              </a>
            </p>
            <p className="mt-2 text-[14px] font-body text-muted">
              For demos, enterprise onboarding, and custom integrations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

