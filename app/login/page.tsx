import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import LoginForm from './LoginForm';

interface LoginPageProps {
  searchParams: { reset?: string };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  
  // Redirect if already logged in (middleware should handle this, but double-check)
  if (user) {
    redirect('/dashboard');
  }

  return <LoginForm />;
}

