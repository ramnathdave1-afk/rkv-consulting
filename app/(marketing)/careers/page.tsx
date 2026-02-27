import Link from 'next/link';

export const metadata = {
  title: 'Careers — RKV Consulting',
};

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-white">
      <div className="max-w-4xl mx-auto px-6 py-[96px]">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] font-body text-muted hover:text-white transition-colors"
          >
            <span className="text-muted-deep">←</span> Back to RKV
          </Link>
        </div>

        <h1 className="page-title">Careers</h1>
        <p className="mt-3 text-[18px] font-body text-muted leading-[1.7] max-w-2xl">
          Build the enterprise platform that runs modern real estate portfolios.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[var(--bg-secondary)] border border-border rounded-lg p-5">
            <div className="label">OPENING</div>
            <h2 className="section-header mt-2">Full-Stack Engineer</h2>
            <p className="mt-3 text-[14px] font-body text-muted leading-[1.8]">
              Next.js, TypeScript, Supabase, Stripe. Own critical product surfaces end-to-end.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-border rounded-lg p-5">
            <div className="label">OPENING</div>
            <h2 className="section-header mt-2">Product Designer</h2>
            <p className="mt-3 text-[14px] font-body text-muted leading-[1.8]">
              Design premium workflows for investors, operators, and finance teams.
            </p>
          </div>
        </div>

        <div className="mt-10 bg-[var(--bg-secondary)] border border-border rounded-lg p-5">
          <h2 className="section-header">Apply</h2>
          <p className="mt-3 text-[14px] font-body text-muted leading-[1.8]">
            Email your resume and a short note to{' '}
            <a className="text-gold hover:text-white transition-colors" href="mailto:careers@rkv-consulting.com">
              careers@rkv-consulting.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

