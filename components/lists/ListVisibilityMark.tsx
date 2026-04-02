/**
 * Public vs private list indicator. Theme-aware; use variant="onDark" on colored headers
 * (ERD nodes, Bootstrap .active tree rows).
 */
interface ListVisibilityMarkProps {
  isPublic: boolean;
  variant?: 'default' | 'onDark';
  showLabel?: boolean;
  className?: string;
}

export default function ListVisibilityMark({
  isPublic,
  variant = 'default',
  showLabel = false,
  className = '',
}: ListVisibilityMarkProps) {
  const ariaLabel = isPublic ? 'Public list' : 'Private list';
  return (
    <span
      className={`list-visibility-mark d-inline-flex align-items-center gap-1 ${isPublic ? 'list-visibility-mark--public' : 'list-visibility-mark--private'} ${variant === 'onDark' ? 'list-visibility-mark--on-dark' : ''} ${showLabel ? 'list-visibility-mark--with-label' : ''} ${className}`.trim()}
      title={ariaLabel}
      aria-label={ariaLabel}
      role="img"
    >
      <i
        className={`bx ${isPublic ? 'bx-globe' : 'bx-lock-alt'} list-visibility-mark__icon`}
        aria-hidden
      />
      {showLabel ? (
        <span className="list-visibility-mark__label text-nowrap">
          {isPublic ? 'Public' : 'Private'}
        </span>
      ) : null}
    </span>
  );
}
