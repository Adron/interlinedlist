/**
 * Visual marker for lists backed by GitHub Issues. Theme-aware (light/dark) except
 * variant="onDark" for use on dark solid headers (e.g. ERD GitHub nodes, Bootstrap .active rows).
 */
interface GitHubIssuesListMarkProps {
  variant?: 'default' | 'onDark';
  /** Compact “Issues” label next to the icon (e.g. Cards, Data Grid). */
  showLabel?: boolean;
  className?: string;
}

const ARIA_LABEL = 'GitHub issues–backed list';

export default function GitHubIssuesListMark({
  variant = 'default',
  showLabel = false,
  className = '',
}: GitHubIssuesListMarkProps) {
  return (
    <span
      className={`github-issues-list-mark d-inline-flex align-items-center gap-1 ${variant === 'onDark' ? 'github-issues-list-mark--on-dark' : ''} ${showLabel ? 'github-issues-list-mark--with-label' : ''} ${className}`.trim()}
      title={ARIA_LABEL}
      aria-label={ARIA_LABEL}
      role="img"
    >
      <i className="bx bxl-github github-issues-list-mark__icon" aria-hidden />
      {showLabel ? (
        <span className="github-issues-list-mark__label text-nowrap">Issues</span>
      ) : null}
    </span>
  );
}
