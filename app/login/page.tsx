import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import LoginForm from './LoginForm';

interface LoginPageProps {
  searchParams: { reset?: string; add?: string };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const isAddAccount = searchParams.add === '1';

  // Redirect if already logged in, unless adding another account
  if (user && !isAddAccount) {
    redirect('/dashboard');
  }

  return <LoginForm addAccountMode={isAddAccount} />;
}

