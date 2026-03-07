'use client';

export interface ScheduledCrossPostConfig {
  mastodonProviderIds?: string[];
  crossPostToBluesky?: boolean;
  crossPostToLinkedIn?: boolean;
}

interface CrossPostPlatformIconsProps {
  scheduledCrossPostConfig?: ScheduledCrossPostConfig | null;
  /** Optional identities to resolve Mastodon instance names for tooltips */
  identities?: Array<{ id: string; provider: string }>;
  className?: string;
}

function getMastodonInstanceName(provider: string): string {
  if (provider.startsWith('mastodon:')) {
    return provider.slice(9);
  }
  return provider;
}

export default function CrossPostPlatformIcons({
  scheduledCrossPostConfig,
  identities = [],
  className = '',
}: CrossPostPlatformIconsProps) {
  if (!scheduledCrossPostConfig) return null;

  const hasMastodon =
    scheduledCrossPostConfig.mastodonProviderIds &&
    scheduledCrossPostConfig.mastodonProviderIds.length > 0;
  const hasBluesky = scheduledCrossPostConfig.crossPostToBluesky === true;
  const hasLinkedIn = scheduledCrossPostConfig.crossPostToLinkedIn === true;

  if (!hasMastodon && !hasBluesky && !hasLinkedIn) return null;

  const mastodonLabels =
    hasMastodon && identities.length > 0
      ? scheduledCrossPostConfig
          .mastodonProviderIds!.map((id) => {
            const ident = identities.find((i) => i.id === id);
            return ident ? getMastodonInstanceName(ident.provider) : null;
          })
          .filter(Boolean)
      : hasMastodon
        ? ['Mastodon']
        : [];

  return (
    <span className={`d-inline-flex align-items-center gap-1 ${className}`}>
      {hasLinkedIn && (
        <span title="LinkedIn" className="text-primary">
          <i className="bx bxl-linkedin" style={{ fontSize: '0.85rem' }} aria-hidden />
        </span>
      )}
      {hasBluesky && (
        <span title="Bluesky" className="text-info">
          <i className="bx bxl-bluesky" style={{ fontSize: '0.85rem' }} aria-hidden />
        </span>
      )}
      {hasMastodon && (
        <span
          title={mastodonLabels.length > 0 ? `Mastodon (${mastodonLabels.join(', ')})` : 'Mastodon'}
          className="text-secondary"
        >
          <i className="bx bxl-mastodon" style={{ fontSize: '0.85rem' }} aria-hidden />
        </span>
      )}
    </span>
  );
}
