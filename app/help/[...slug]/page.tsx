import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getHelpContent, getHelpSlugs } from '@/lib/help';
import AnalyticsActionTracker from '@/components/AnalyticsActionTracker';
import HelpHighlight from '@/components/help/HelpHighlight';

interface HelpTopicPageProps {
  params: Promise<{ slug: string[] }> | { slug: string[] };
}

export default async function HelpTopicPage({ params }: HelpTopicPageProps) {
  const { slug: slugSegments } = await Promise.resolve(params);
  const slug = slugSegments.join('/');
  const content = getHelpContent(slug);

  if (!content) {
    notFound();
  }

  return (
    <div className="card">
      <HelpHighlight />
      <AnalyticsActionTracker name="help_view" properties={{ slug }} />
      <div className="card-header">
        <h1 className="h4 mb-0">{content.title}</h1>
      </div>
      <div className="card-body help-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <a href={href ?? '#'} className="text-primary">
                {children}
              </a>
            ),
            pre: ({ children }) => (
              <pre className="help-pre">{children}</pre>
            ),
            table: ({ children }) => (
              <div className="help-table-wrapper">
                <table className="help-table">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead>{children}</thead>,
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => <tr>{children}</tr>,
            th: ({ children }) => <th>{children}</th>,
            td: ({ children }) => <td>{children}</td>,
          }}
        >
          {content.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const slugs = getHelpSlugs();
  return slugs.map((slug) => ({ slug: slug.split('/') }));
}
