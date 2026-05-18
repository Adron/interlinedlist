'use client';

import { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getHelpTopics } from '@/lib/help-config';
import type { HelpSearchEntry } from '@/lib/help';

interface HelpSidebarProps {
  searchEntries: HelpSearchEntry[];
  /** When true, links dismiss the offcanvas on click (for mobile) */
  inOffcanvas?: boolean;
}

interface SearchResult {
  slug: string;
  title: string;
  excerpt: string;
  /** index in the plain text where the match starts, for highlighting */
  matchStart: number;
  matchLength: number;
}

function buildExcerpt(plain: string, query: string): { excerpt: string; matchStart: number; matchLength: number } {
  const lower = plain.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return { excerpt: plain.slice(0, 100), matchStart: -1, matchLength: 0 };

  const pad = 40;
  const start = Math.max(0, idx - pad);
  const end = Math.min(plain.length, idx + query.length + pad);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < plain.length ? '…' : '';
  const excerpt = prefix + plain.slice(start, end) + suffix;
  const matchStart = idx - start + prefix.length;

  return { excerpt, matchStart, matchLength: query.length };
}

function ExcerptWithHighlight({
  excerpt,
  matchStart,
  matchLength,
}: {
  excerpt: string;
  matchStart: number;
  matchLength: number;
}) {
  if (matchStart < 0 || matchLength === 0) {
    return <span className="text-muted" style={{ fontSize: '0.78rem' }}>{excerpt}</span>;
  }
  const before = excerpt.slice(0, matchStart);
  const match = excerpt.slice(matchStart, matchStart + matchLength);
  const after = excerpt.slice(matchStart + matchLength);
  return (
    <span className="text-muted" style={{ fontSize: '0.78rem' }}>
      {before}
      <mark className="px-0 py-0 bg-warning rounded-1">{match}</mark>
      {after}
    </span>
  );
}

export default function HelpSidebar({ searchEntries, inOffcanvas }: HelpSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const topics = getHelpTopics();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  const results: SearchResult[] = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const lower = q.toLowerCase();
    return searchEntries.flatMap((entry) => {
      const titleMatch = entry.title.toLowerCase().includes(lower);
      const contentMatch = entry.plain.toLowerCase().includes(lower);
      if (!titleMatch && !contentMatch) return [];
      const { excerpt, matchStart, matchLength } = buildExcerpt(entry.plain, q);
      return [{ slug: entry.slug, title: entry.title, excerpt, matchStart, matchLength }];
    });
  }, [query, searchEntries]);

  function handleResultClick(slug: string, term: string) {
    const encoded = encodeURIComponent(term.trim());
    setQuery('');
    router.push(`/help/${slug}?highlight=${encoded}`);
  }

  function handleClear() {
    setQuery('');
    inputRef.current?.focus();
  }

  const isSearching = query.trim().length > 0;

  return (
    <div>
      {/* Search input */}
      <div className="p-2 border-bottom">
        <div className="input-group input-group-sm">
          <span className="input-group-text border-end-0 bg-transparent">
            <i className="bx bx-search text-muted" style={{ fontSize: '15px' }} />
          </span>
          <input
            ref={inputRef}
            type="search"
            className="form-control border-start-0 ps-0"
            placeholder="Search help…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search help topics"
          />
          {isSearching && (
            <button
              type="button"
              className="btn btn-link btn-sm text-muted border px-2"
              onClick={handleClear}
              aria-label="Clear search"
              tabIndex={0}
            >
              <i className="bx bx-x" style={{ fontSize: '15px' }} />
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      {isSearching ? (
        <nav className="help-sidebar nav flex-column">
          {results.length === 0 ? (
            <span className="nav-link text-muted disabled" style={{ fontSize: '0.85rem' }}>
              No results for &ldquo;{query.trim()}&rdquo;
            </span>
          ) : (
            results.map((r) => (
              <button
                key={r.slug}
                type="button"
                className={`nav-link text-start border-0 bg-transparent w-100 ${pathname === `/help/${r.slug}` ? 'active' : ''}`}
                onClick={() => handleResultClick(r.slug, query)}
                {...(inOffcanvas ? { 'data-bs-dismiss': 'offcanvas' } : {})}
              >
                <span className="d-block fw-semibold" style={{ fontSize: '0.875rem' }}>{r.title}</span>
                <ExcerptWithHighlight
                  excerpt={r.excerpt}
                  matchStart={r.matchStart}
                  matchLength={r.matchLength}
                />
              </button>
            ))
          )}
        </nav>
      ) : (
        /* Normal topic list */
        <nav className="help-sidebar nav flex-column">
          {topics.map((topic) => {
            const href = `/help/${topic.slug}`;
            const isActive = pathname === href;
            return (
              <Link
                key={topic.slug}
                href={href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                {...(inOffcanvas ? { 'data-bs-dismiss': 'offcanvas' } : {})}
              >
                {topic.title}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
