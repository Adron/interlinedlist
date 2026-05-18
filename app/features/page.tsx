import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata = {
  title: 'Features — InterlinedList',
  description:
    'A unified writing, publishing, and data platform for thinkers who hate switching tools.',
};

const features = [
  {
    icon: 'bx-edit-alt',
    title: 'Writing & Publishing',
    description:
      'Compose short posts with Markdown, embed images or video, attach rich link previews, and publish instantly or on a schedule. Threads, replies, and reactions are built in.',
    badge: null,
  },
  {
    icon: 'bx-share-alt',
    title: 'Cross-Post Everywhere',
    description:
      'Write once and publish simultaneously to Mastodon, Bluesky, and LinkedIn. Cross-post targets are chosen per message, and reply threading carries over across platforms.',
    badge: null,
  },
  {
    icon: 'bx-list-ul',
    title: 'Structured Lists',
    description:
      'Define custom relational tables with a lightweight schema DSL — text, number, date, select, boolean, URL, and Markdown field types. Nest lists, connect them as a graph, and view data as cards, a grid, or an ERD diagram.',
    badge: 'Subscriber',
  },
  {
    icon: 'bx-note',
    title: 'Long-Form Documents',
    description:
      'Full Markdown editor with folder hierarchy, image uploads, document templates, and per-document public/private visibility. The long-form counterpart to short posts.',
    badge: 'Subscriber',
  },
  {
    icon: 'bxl-github',
    title: 'GitHub Integration',
    description:
      'Sync a list directly from a GitHub repository\'s issues. Create and comment on issues without leaving the platform. Labels and assignees are pulled in automatically.',
    badge: 'Subscriber',
  },
  {
    icon: 'bx-time-five',
    title: 'Scheduled Publishing',
    description:
      'Set any post to go live at a future time. Cross-post targets and all message settings are preserved and fired automatically by a background job at the scheduled moment.',
    badge: 'Subscriber',
  },
  {
    icon: 'bx-user-plus',
    title: 'Follow System',
    description:
      'Follow other users to shape your feed. Accounts can be public or private. Filter your feed between all public posts, followed-only, or both.',
    badge: null,
  },
  {
    icon: 'bx-export',
    title: 'Markdown Export',
    description:
      'Export any list, document, or message thread as clean Markdown. Rows become structured tables; documents export as-is. Full data portability via the exports page.',
    badge: null,
  },
  {
    icon: 'bx-bot',
    title: 'AI Writing Assist',
    description:
      'Connect your own OpenAI or Anthropic API key to unlock AI-assisted drafting and editing directly in the composer. Your key, your data, no intermediary.',
    badge: 'Coming Soon',
  },
];

export default async function FeaturesPage() {
  const user = await getCurrentUser();

  return (
    <div className="container-fluid container-fluid-max py-4">
      {/* Hero */}
      <div className="row justify-content-center text-center mb-5">
        <div className="col-lg-8">
          <h1 className="display-5 fw-bold mb-3">
            Everything in one place.
            <br />
            <span style={{ color: 'var(--bs-primary, #7e67fe)' }}>
              Finally.
            </span>
          </h1>
          <p className="lead mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            InterlinedList unifies micro-blogging, structured data management, and long-form
            writing — while connecting outward to the social web. No more switching between
            five different tools for thoughts, tasks, references, and publishing.
          </p>
          {user ? (
            <Link href="/dashboard" className="btn btn-primary btn-lg px-5">
              Go to Dashboard
            </Link>
          ) : (
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <Link href="/register" className="btn btn-primary btn-lg px-5">
                Get Started Free
              </Link>
              <Link href="/login" className="btn btn-outline-secondary btn-lg px-5">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Feature grid */}
      <div className="row g-4 mb-5">
        {features.map((f) => (
          <div key={f.title} className="col-lg-4 col-md-6 col-12">
            <div className="card h-100" style={{ border: '1px solid var(--color-border)' }}>
              <div className="card-body p-4">
                <div className="d-flex align-items-start gap-3 mb-3">
                  <div
                    className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: 44,
                      height: 44,
                      background: 'color-mix(in srgb, var(--bs-primary, #7e67fe) 15%, transparent)',
                    }}
                  >
                    <i
                      className={`bx ${f.icon} fs-22`}
                      style={{ color: 'var(--bs-primary, #7e67fe)' }}
                    />
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h5 className="card-title mb-0">{f.title}</h5>
                      {f.badge && (
                        <span
                          className={`badge ${
                            f.badge === 'Coming Soon'
                              ? 'bg-secondary'
                              : 'text-bg-warning'
                          } fw-normal`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {f.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="card-text" style={{ color: 'var(--color-text-secondary)' }}>
                  {f.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Free vs Subscriber callout */}
      <div className="row justify-content-center mb-5">
        <div className="col-lg-10">
          <div className="card" style={{ border: '1px solid var(--color-border)' }}>
            <div className="card-body p-4">
              <div className="row g-4">
                <div className="col-md-6">
                  <h5 className="fw-semibold mb-3">
                    <i className="bx bx-check-circle me-2" style={{ color: 'var(--color-success)' }} />
                    Free — always
                  </h5>
                  <ul className="list-unstyled mb-0" style={{ color: 'var(--color-text-secondary)' }}>
                    {[
                      'Text posts with Markdown',
                      'Reply threading &amp; reactions',
                      'Cross-posting to Mastodon, Bluesky, LinkedIn',
                      'Follow system &amp; social feed',
                      'Markdown export',
                    ].map((item) => (
                      <li key={item} className="d-flex align-items-start gap-2 mb-2">
                        <i className="bx bx-check mt-1 text-success flex-shrink-0" />
                        <span dangerouslySetInnerHTML={{ __html: item }} />
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="col-md-6">
                  <h5 className="fw-semibold mb-3">
                    <i className="bx bx-star me-2" style={{ color: '#f0934e' }} />
                    Subscriber — $6.99 / month
                  </h5>
                  <ul className="list-unstyled mb-0" style={{ color: 'var(--color-text-secondary)' }}>
                    {[
                      'Structured lists with custom schemas',
                      'Long-form Markdown documents',
                      'Image &amp; video uploads',
                      'Scheduled posting',
                      'GitHub issue sync',
                    ].map((item) => (
                      <li key={item} className="d-flex align-items-start gap-2 mb-2">
                        <i className="bx bx-star mt-1 flex-shrink-0" style={{ color: '#f0934e' }} />
                        <span dangerouslySetInnerHTML={{ __html: item }} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      {!user && (
        <div className="row justify-content-center text-center mb-4">
          <div className="col-lg-6">
            <h4 className="fw-semibold mb-3">Ready to consolidate your workflow?</h4>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Create a free account in seconds. No credit card required.
            </p>
            <Link href="/register" className="btn btn-primary btn-lg px-5">
              Create Free Account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
