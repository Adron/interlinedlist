import { redirect } from 'next/navigation';

export default async function ShortUserProfileRedirect({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  redirect(`/user/${encodeURIComponent(username)}`);
}
