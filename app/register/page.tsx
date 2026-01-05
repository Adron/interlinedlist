import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import RegisterForm from './RegisterForm';

export default async function RegisterPage() {
  const user = await getCurrentUser();
  
  // Redirect if already logged in (middleware should handle this, but double-check)
  if (user) {
    redirect('/dashboard');
  }

  return <RegisterForm />;
}

