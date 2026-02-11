import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ListBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function ListBreadcrumbs({ items }: ListBreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="breadcrumb" className="mb-3">
      <ol className="breadcrumb mb-0 flex-wrap">
        {items.map((item, index) => (
          <li
            key={index}
            className={`breadcrumb-item ${index === items.length - 1 && !item.href ? 'active' : ''}`}
          >
            {item.href ? (
              <Link href={item.href} className="text-decoration-none">
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
