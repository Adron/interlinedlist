'use client';

import Link from 'next/link';

interface ChildLinkProps {
  childId: string;
  childTitle: string;
}

export default function ChildLink({ childId, childTitle }: ChildLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    // Scroll to child card if it exists on the page
    const childCard = document.querySelector(`[data-list-id="${childId}"]`);
    if (childCard) {
      childCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight child card temporarily
      childCard.classList.add('highlight-parent');
      setTimeout(() => {
        childCard.classList.remove('highlight-parent');
      }, 2000);
    }
  };

  return (
    <Link
      href={`/lists/${childId}`}
      className="text-decoration-none ms-1"
      style={{ color: '#0d6efd' }}
      onClick={handleClick}
    >
      {childTitle}
    </Link>
  );
}
