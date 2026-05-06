import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import AnalogClockPage from '@/components/AnalogClockPage';

export const metadata: Metadata = {
  title: 'Clock | InterlinedList',
  description: 'Analog clock with local time and date',
};

export default async function ClockRoutePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return <AnalogClockPage />;
}
