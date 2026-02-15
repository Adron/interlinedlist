import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MessageThreadPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="container py-4">
      <div className="card">
        <div className="card-body text-center py-5">
          <h5 className="card-title">Thread view</h5>
          <p className="card-text text-muted mb-3">
            Full thread view is coming soon. You can view replies under each message in the feed.
          </p>
          <Link href="/" className="btn btn-primary">
            Back to feed
          </Link>
        </div>
      </div>
    </div>
  );
}
