import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import SettingsForm from './SettingsForm';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: '#333' }}>Settings</h1>
      <SettingsForm user={user} />
    </div>
  );
}

