import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { getHelpContent, getHelpSlugs } from '@/lib/help';

interface HelpTopicPageProps {
  params: { slug: string };
}

export default async function HelpTopicPage({ params }: HelpTopicPageProps) {
  const content = getHelpContent(params.slug);

  if (!content) {
    notFound();
  }

  return (
    <div className="card">
      <div className="card-header">
        <h1 className="h4 mb-0">{content.title}</h1>
      </div>
      <div className="card-body help-content">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => (
              <a href={href ?? '#'} className="text-primary">
                {children}
              </a>
            ),
            pre: ({ children }) => (
              <pre className="help-pre">{children}</pre>
            ),
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
  return slugs.map((slug) => ({ slug }));
}
