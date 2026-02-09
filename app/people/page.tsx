import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { getFollowCounts, getFollowRequests } from '@/lib/follows/queries';
import FollowRequests from '@/components/follows/FollowRequests';

export default async function PeoplePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Get follow counts and pending requests
  let followerCount = 0;
  let followingCount = 0;
  let pendingRequestsCount = 0;
  let pendingRequests: any[] = [];

  try {
    const counts = await getFollowCounts(user.id);
    followerCount = counts.followers;
    followingCount = counts.following;
    pendingRequestsCount = counts.pendingRequests;

    // Get pending requests if user has private account
    if (user.isPrivateAccount) {
      try {
        pendingRequests = await getFollowRequests(user.id);
      } catch (error: any) {
        // If Follow table doesn't exist, use empty array
        if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('follow')) {
          pendingRequests = [];
        } else {
          throw error;
        }
      }
    }
  } catch (error: any) {
    // If Follow table doesn't exist, use defaults
    if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('follow')) {
      followerCount = 0;
      followingCount = 0;
      pendingRequestsCount = 0;
    } else {
      throw error;
    }
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h3 mb-0">People</h1>
          <p className="text-muted">Manage your followers, following, and connections</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <Link
            href={`/user/${encodeURIComponent(user.username)}/followers`}
            className="text-decoration-none"
          >
            <div className="card h-100 border-primary">
              <div className="card-body text-center">
                <i className="bx bx-user-check fs-32 text-primary mb-2"></i>
                <div className="display-4 fw-bold text-primary">{followerCount}</div>
                <div className="text-muted">Followers</div>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-4 mb-3">
          <Link
            href={`/user/${encodeURIComponent(user.username)}/following`}
            className="text-decoration-none"
          >
            <div className="card h-100 border-info">
              <div className="card-body text-center">
                <i className="bx bx-user-plus fs-32 text-info mb-2"></i>
                <div className="display-4 fw-bold text-info">{followingCount}</div>
                <div className="text-muted">Following</div>
              </div>
            </div>
          </Link>
        </div>
        {user.isPrivateAccount && (
          <div className="col-md-4 mb-3">
            <div className="card h-100 border-warning">
              <div className="card-body text-center">
                <i className="bx bx-time fs-32 text-warning mb-2"></i>
                <div className="display-4 fw-bold text-warning">{pendingRequestsCount}</div>
                <div className="text-muted">Pending Requests</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-3">Quick Actions</h5>
              <div className="d-flex gap-2 flex-wrap">
                <Link
                  href={`/user/${encodeURIComponent(user.username)}/followers`}
                  className="btn btn-primary"
                >
                  <i className="bx bx-user-check me-2"></i>
                  View My Followers
                </Link>
                <Link
                  href={`/user/${encodeURIComponent(user.username)}/following`}
                  className="btn btn-info"
                >
                  <i className="bx bx-user-plus me-2"></i>
                  View My Following
                </Link>
                {user.isPrivateAccount && pendingRequestsCount > 0 && (
                  <Link
                    href={`/user/${encodeURIComponent(user.username)}/followers`}
                    className="btn btn-warning"
                  >
                    <i className="bx bx-time me-2"></i>
                    Review Requests ({pendingRequestsCount})
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Follow Requests */}
      {user.isPrivateAccount && pendingRequests.length > 0 && (
        <div className="row">
          <div className="col-12">
            <FollowRequests initialRequests={pendingRequests.map((req) => ({
              ...req,
              createdAt: req.createdAt instanceof Date ? req.createdAt.toISOString() : req.createdAt,
            }))} />
          </div>
        </div>
      )}
    </div>
  );
}
