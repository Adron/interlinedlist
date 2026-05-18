'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const BLOCK_TAGS = new Set(['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'TD', 'DIV']);

function nearestBlock(el: Element): Element {
  let cur: Element | null = el;
  while (cur && !BLOCK_TAGS.has(cur.tagName)) {
    cur = cur.parentElement;
  }
  return cur ?? el;
}

function HelpHighlightInner() {
  const params = useSearchParams();
  const highlight = params.get('highlight');

  useEffect(() => {
    if (!highlight) return;

    const term = highlight.toLowerCase();
    const container = document.querySelector('.help-content');
    if (!container) return;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue ?? '';
      if (!text.toLowerCase().includes(term)) continue;

      const block = nearestBlock(node.parentElement!);
      block.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const el = block as HTMLElement;
      el.style.transition = 'none';
      el.style.backgroundColor = 'var(--bs-warning-bg-subtle, #fff3cd)';
      el.style.borderRadius = '4px';

      // Fade out after a pause
      const fadeTimer = setTimeout(() => {
        el.style.transition = 'background-color 1.5s ease';
        el.style.backgroundColor = '';
      }, 2000);

      const cleanTimer = setTimeout(() => {
        el.style.transition = '';
        el.style.borderRadius = '';
      }, 3600);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(cleanTimer);
        el.style.transition = '';
        el.style.backgroundColor = '';
        el.style.borderRadius = '';
      };
    }
  }, [highlight]);

  return null;
}

export default function HelpHighlight() {
  return (
    <Suspense fallback={null}>
      <HelpHighlightInner />
    </Suspense>
  );
}
