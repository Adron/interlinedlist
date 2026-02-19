import Link from 'next/link';

interface ListChildLinksProps {
  children: { id: string; title: string }[];
  /** When set, links go to /user/[ownerUsername]/lists/[id] instead of /lists/[id] */
  ownerUsername?: string;
}

export default function ListChildLinks({ children: childLists, ownerUsername }: ListChildLinksProps) {
  if (!childLists || childLists.length === 0) return null;

  const href = (id: string) =>
    ownerUsername ? `/user/${encodeURIComponent(ownerUsername)}/lists/${id}` : `/lists/${id}`;

  return (
    <div className="small text-muted mb-3" style={{ fontSize: 'var(--bs-breadcrumb-font-size, 0.875rem)' }}>
      Child lists:{" "}
      {childLists.map((child, index) => (
        <span key={child.id}>
          {index > 0 && " · "}
          <Link href={href(child.id)} className="text-decoration-none">
            {child.title}
          </Link>
        </span>
      ))}
    </div>
  );
}
