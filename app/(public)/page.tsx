import { redirect } from 'next/navigation';

export const metadata = {
  title: 'RKV Consulting — AI Property Management Platform',
  description: 'Five AI agents replace your leasing coordinator, call center, maintenance dispatcher, bookkeeper, and acquisitions analyst. $5/unit/month.',
};

export default function Home() {
  redirect('/landing.html');
}
