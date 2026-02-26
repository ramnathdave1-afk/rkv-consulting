'use client';

import dynamic from 'next/dynamic';

const MarketingPage = dynamic(() => import('./(marketing)/page'), { ssr: false });

export default function RootPage() {
  return <MarketingPage />;
}
