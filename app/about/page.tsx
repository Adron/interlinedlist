import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata = {
  title: 'About | InterlinedList',
  description:
    'InterlinedList is a time-series micro-blogging platform. Write messages that form a stream, and embed structured lists and documents within that stream.',
};

export default async function AboutPage() {
  const user = await getCurrentUser();

  return (
    <div className="container-fluid container-fluid-max py-4">
      {/* Hero */}
      <div className="row mb-4">
        <div className="col-12 text-center" style={{ padding: '2rem 0 1rem' }}>
          <h1 className="h2 mb-2">What is InterlinedList?</h1>
          <p className="text-muted" style={{ maxWidth: '600px', margin: '0 auto' }}>
            A hybrid writing tool and social feed — organize your thinking, then share it with
            people who care.
          </p>
          {!user && (
            <div className="d-flex justify-content-center gap-3 mt-4">
              <Link href="/register" className="btn btn-primary">
                Get started free
              </Link>
              <Link href="/login" className="btn btn-outline-secondary">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Core concept cards */}
      <div className="row g-4 mb-4">
        <div className="col-lg-4 col-md-6 col-12">
          <div className="card h-100">
            <div className="card-body">
              <div className="mb-3">
                <i className="bx bx-list-ul fs-32 text-primary"></i>
              </div>
              <h5 className="card-title">Lists</h5>
              <p className="card-text text-muted">
                Build structured, hierarchical lists for anything — project tasks, reading queues,
                decision trees, research notes. Lists can be nested, tagged, and viewed as cards,
                grids, or tree diagrams.
              </p>
            </div>
          </div>
        </div>

        <div className="col-lg-4 col-md-6 col-12">
          <div className="card h-100">
            <div className="card-body">
              <div className="mb-3">
                <i className="bx bx-note fs-32 text-primary"></i>
              </div>
              <h5 className="card-title">Documents</h5>
              <p className="card-text text-muted">
                Write long-form content alongside your lists. Documents live in the same workspace
                so your prose and your structure stay connected — no switching between separate
                apps.
              </p>
            </div>
          </div>
        </div>

        <div className="col-lg-4 col-md-6 col-12">
          <div className="card h-100">
            <div className="card-body">
              <div className="mb-3">
                <i className="bx bx-conversation fs-32 text-primary"></i>
              </div>
              <h5 className="card-title">Social feed</h5>
              <p className="card-text text-muted">
                Share updates, link to your lists and documents, and follow people whose thinking
                you want to track. The feed surfaces content from people and organizations you
                care about.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How it fits together */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8 col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bx bx-bulb fs-18 align-middle me-2"></i>
                How it fits together
              </h5>
            </div>
            <div className="card-body">
              <p className="text-muted mb-3">
                Most writing tools are private by default. Most social tools are noisy by default.
                InterlinedList sits in between.
              </p>
              <p className="text-muted mb-3">
                You capture and organize your thinking in <strong>lists and documents</strong>.
                When something is worth sharing, you post it to your <strong>feed</strong>. Followers
                see your updates, can engage with your content, and track your lists as they evolve
                over time.
              </p>
              <p className="text-muted mb-0">
                Organizations give teams a shared space with the same tools — coordinated lists,
                shared documents, and a team feed without the chaos of generic chat.
              </p>
            </div>
          </div>
        </div>

        <div className="col-lg-4 col-12">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bx bx-check-circle fs-18 align-middle me-2"></i>
                Good for
              </h5>
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0" style={{ lineHeight: '2' }}>
                <li>
                  <i className="bx bx-chevron-right text-primary align-middle"></i>
                  <span className="text-muted">Personal knowledge management</span>
                </li>
                <li>
                  <i className="bx bx-chevron-right text-primary align-middle"></i>
                  <span className="text-muted">Research &amp; writing projects</span>
                </li>
                <li>
                  <i className="bx bx-chevron-right text-primary align-middle"></i>
                  <span className="text-muted">Team coordination</span>
                </li>
                <li>
                  <i className="bx bx-chevron-right text-primary align-middle"></i>
                  <span className="text-muted">Following thinkers &amp; creators</span>
                </li>
                <li>
                  <i className="bx bx-chevron-right text-primary align-middle"></i>
                  <span className="text-muted">Building in public</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Features row */}
      <div className="row g-4 mb-4">
        {[
          {
            icon: 'bx-group',
            title: 'Organizations',
            text: 'Create or join organizations to collaborate on shared lists and documents with a unified team feed.',
          },
          {
            icon: 'bx-user-plus',
            title: 'People & followers',
            text: 'Follow individuals to see their public updates. Build an audience around your work.',
          },
          {
            icon: 'bx-tag',
            title: 'Tags',
            text: 'Tag messages, lists, and items to slice across your content any way that makes sense to you.',
          },
          {
            icon: 'bx-export',
            title: 'Exports',
            text: 'Your data is yours. Export lists and documents whenever you need them.',
          },
        ].map(({ icon, title, text }) => (
          <div key={title} className="col-lg-3 col-md-6 col-12">
            <div className="card h-100">
              <div className="card-body">
                <i className={`bx ${icon} fs-24 text-primary mb-2 d-block`}></i>
                <h6 className="card-title">{title}</h6>
                <p className="card-text text-muted small mb-0">{text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {!user && (
        <div className="row mb-4">
          <div className="col-12">
            <div
              className="card text-center"
              style={{ padding: '2rem' }}
            >
              <div className="card-body">
                <h5 className="mb-2">Ready to get started?</h5>
                <p className="text-muted mb-4">
                  Create a free account and start organizing your thinking today.
                </p>
                <div className="d-flex justify-content-center gap-3">
                  <Link href="/register" className="btn btn-primary">
                    Create account
                  </Link>
                  <Link href="/login" className="btn btn-outline-secondary">
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* What does "interlined" mean? */}
      <div className="row mb-4">
        <div className="col-lg-8 col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">What does &ldquo;interlined&rdquo; mean?</h5>
            </div>
            <div className="card-body">
              <p className="text-muted mb-3">
                The word comes from a typographical practice called interlineation: writing or
                inserting text <em>between the existing lines</em> of a document. Scribes, lawyers,
                and scholars used the gap between lines to annotate, correct, and elaborate without
                replacing the original text.
              </p>
              <p className="text-muted mb-3">
                In this platform, your messages are the lines. Your lists, documents, and structured
                data are interlined within that stream — woven between the moments, not stored apart
                from them. Structure annotates the stream the same way a scribe&rsquo;s pen
                annotated a manuscript page: precisely, in the gap, between the lines that prompted
                it.
              </p>
              <p className="text-muted mb-3">
                The name is not marketing. It is a statement about the order of operations: write
                first, structure second.
              </p>
              <Link
                href="/blog/what-does-interlined-mean"
                className="text-primary"
                style={{ textDecoration: 'none', fontWeight: 500 }}
              >
                Read the full story &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
