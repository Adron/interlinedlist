'use client';

import Link from 'next/link';

interface ParentLinkProps {
  parentId: string;
  parentTitle: string;
}

export default function ParentLink({ parentId, parentTitle }: ParentLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    // Scroll to parent card if it exists on the page
    const parentCard = document.querySelector(`[data-list-id="${parentId}"]`);
    if (parentCard) {
      parentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight parent card temporarily
      parentCard.classList.add('highlight-parent');
      setTimeout(() => {
        parentCard.classList.remove('highlight-parent');
      }, 2000);
    }
  };

  return (
    <Link
      href={`/lists/${parentId}`}
      className="text-decoration-none ms-1"
      style={{ color: '#0d6efd' }}
      onClick={handleClick}
    >
      {parentTitle}
    </Link>
  );
}
