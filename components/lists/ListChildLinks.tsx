import Link from 'next/link';

interface ListChildLinksProps {
  children: { id: string; title: string }[];
}

export default function ListChildLinks({ children: childLists }: ListChildLinksProps) {
  if (!childLists || childLists.length === 0) return null;

  return (
    <div className="small text-muted mb-3" style={{ fontSize: 'var(--bs-breadcrumb-font-size, 0.875rem)' }}>
      Child lists:{" "}
      {childLists.map((child, index) => (
        <span key={child.id}>
          {index > 0 && " · "}
          <Link href={`/lists/${child.id}`} className="text-decoration-none">
            {child.title}
          </Link>
        </span>
      ))}
    </div>
  );
}
