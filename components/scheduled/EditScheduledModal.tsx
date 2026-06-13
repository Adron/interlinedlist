'use client';

import { useState, useEffect } from 'react';
import { Message, LinkedInTargetOption } from '@/lib/types';
import type { RequestedLinkedInTarget } from '@/lib/linkedin/resolve-linkedin-target';

interface Identity {
  id: string;
  provider: string;
}

function getMastodonInstanceName(provider: string): string {
  return provider.startsWith('mastodon:') ? provider.replace('mastodon:', '') : provider;
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultLinkedInTargets(targets: LinkedInTargetOption[]): RequestedLinkedInTarget[] {
  if (targets.some((t) => t.kind === 'personal')) return [{ kind: 'personal' }];
  const firstPage = targets.find(
    (t): t is Extract<LinkedInTargetOption, { kind: 'orgPage' }> => t.kind === 'orgPage'
  );
  if (firstPage) return [{ kind: 'orgPage', pageId: firstPage.pageId }];
  const firstPersonalPage = targets.find(
    (t): t is Extract<LinkedInTargetOption, { kind: 'personalPage' }> =>
      t.kind === 'personalPage'
  );
  return firstPersonalPage
    ? [{ kind: 'personalPage', personalPageId: firstPersonalPage.personalPageId }]
    : [];
}

function linkedInOptionKey(option: LinkedInTargetOption): string {
  if (option.kind === 'personal') return 'personal';
  return option.kind === 'orgPage' ? option.pageId : `personalPage-${option.personalPageId}`;
}

function linkedInRequestedKey(target: RequestedLinkedInTarget): string {
  if (target.kind === 'personal') return 'personal';
  return target.kind === 'orgPage' ? target.pageId : `personalPage-${target.personalPageId}`;
}

interface EditScheduledModalProps {
  message: Message;
  identities: Identity[];
  onClose: () => void;
  onSaved: (updated: Message) => void;
}

export default function EditScheduledModal({
  message,
  identities,
  onClose,
  onSaved,
}: EditScheduledModalProps) {
  const config = message.scheduledCrossPostConfig;
  const mastodonIds = config?.mastodonProviderIds ?? [];
  const [scheduleDraft, setScheduleDraft] = useState('');
  const [selectedMastodonIds, setSelectedMastodonIds] = useState<Set<string>>(new Set(mastodonIds));
  const [crossPostToBluesky, setCrossPostToBluesky] = useState(config?.crossPostToBluesky ?? false);
  const [crossPostToLinkedIn, setCrossPostToLinkedIn] = useState(config?.crossPostToLinkedIn ?? false);
  const [crossPostToTwitter, setCrossPostToTwitter] = useState(config?.crossPostToTwitter ?? false);
  const linkedInLinkAsFirstComment = config?.linkedInLinkAsFirstComment ?? false;
  const [linkedInTargets, setLinkedInTargets] = useState<LinkedInTargetOption[]>([]);
  const [selectedLinkedInTargets, setSelectedLinkedInTargets] = useState<RequestedLinkedInTarget[]>(
    config?.linkedInTargets ?? (config?.linkedInTarget ? [config.linkedInTarget] : [])
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const mastodonIdentities = identities.filter((i) => i.provider.startsWith('mastodon:'));
  const blueskyIdentity = identities.find((i) => i.provider === 'bluesky');
  const twitterIdentity = identities.find((i) => i.provider === 'twitter');

  useEffect(() => {
    if (message.scheduledAt) {
      setScheduleDraft(toDatetimeLocal(new Date(message.scheduledAt)));
    }
  }, [message.scheduledAt]);

  useEffect(() => {
    fetch('/api/linkedin/posting-targets')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.targets)) {
          const enabled = (data.targets as Array<LinkedInTargetOption & { enabled?: boolean }>)
            .filter((t) => t.enabled !== false);
          setLinkedInTargets(enabled);
          setSelectedLinkedInTargets((prev) =>
            prev.length > 0 ? prev : defaultLinkedInTargets(enabled)
          );
        }
      })
      .catch(() => {});
  }, []);

  const toggleLinkedInTargetSelection = (option: LinkedInTargetOption) => {
    const key = linkedInOptionKey(option);
    setSelectedLinkedInTargets((prev) => {
      const exists = prev.some((t) => linkedInRequestedKey(t) === key);
      if (exists) return prev.filter((t) => linkedInRequestedKey(t) !== key);
      return [
        ...prev,
        option.kind === 'personal'
          ? { kind: 'personal' as const }
          : option.kind === 'orgPage'
            ? { kind: 'orgPage' as const, pageId: option.pageId }
            : { kind: 'personalPage' as const, personalPageId: option.personalPageId },
      ];
    });
  };

  const handleSave = async () => {
    const parsed = new Date(scheduleDraft);
    if (isNaN(parsed.getTime()) || parsed <= new Date()) {
      setError('Please select a future date and time');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/messages/${message.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: parsed.toISOString(),
          scheduledCrossPostConfig: {
            mastodonProviderIds: Array.from(selectedMastodonIds),
            crossPostToBluesky: !!blueskyIdentity && crossPostToBluesky,
            crossPostToLinkedIn: linkedInTargets.length > 0 && crossPostToLinkedIn,
            linkedInLinkAsFirstComment:
              linkedInTargets.length > 0 && crossPostToLinkedIn && linkedInLinkAsFirstComment,
            crossPostToTwitter: !!twitterIdentity && crossPostToTwitter,
            ...(linkedInTargets.length > 0 &&
              crossPostToLinkedIn &&
              selectedLinkedInTargets.length > 0 && { linkedInTargets: selectedLinkedInTargets }),
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update');
      }
      const updated = await res.json();
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit scheduled post</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <label className="form-label small">Date and time</label>
            <input
              type="datetime-local"
              className="form-control mb-3"
              min={toDatetimeLocal(new Date(Date.now() + 60000))}
              value={scheduleDraft}
              onChange={(e) => setScheduleDraft(e.target.value)}
            />
            <label className="form-label small">Cross-post to</label>
            <div className="d-flex flex-wrap gap-3">
              {mastodonIdentities.map((m) => {
                const instanceName = getMastodonInstanceName(m.provider);
                const isSelected = selectedMastodonIds.has(m.id);
                return (
                  <div key={m.id} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`edit-mastodon-${m.id}`}
                      checked={isSelected}
                      onChange={() => {
                        setSelectedMastodonIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(m.id)) next.delete(m.id);
                          else next.add(m.id);
                          return next;
                        });
                      }}
                    />
                    <label className="form-check-label small" htmlFor={`edit-mastodon-${m.id}`}>
                      Mastodon ({instanceName})
                    </label>
                  </div>
                );
              })}
              {blueskyIdentity && (
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="edit-bluesky"
                    checked={crossPostToBluesky}
                    onChange={(e) => setCrossPostToBluesky(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="edit-bluesky">
                    Bluesky
                  </label>
                </div>
              )}
              {linkedInTargets.length > 0 && (
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="edit-linkedin"
                    checked={crossPostToLinkedIn}
                    onChange={(e) => setCrossPostToLinkedIn(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="edit-linkedin">
                    LinkedIn
                  </label>
                </div>
              )}
              {crossPostToLinkedIn && linkedInTargets.length > 1 && (
                <div style={{ flexBasis: '100%' }}>
                  <span className="small text-muted d-block">LinkedIn destinations</span>
                  {linkedInTargets.map((t) => {
                    const key = linkedInOptionKey(t);
                    const isChecked = selectedLinkedInTargets.some(
                      (s) => linkedInRequestedKey(s) === key
                    );
                    return (
                      <div key={key} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`edit-linkedin-target-${key}`}
                          checked={isChecked}
                          onChange={() => toggleLinkedInTargetSelection(t)}
                        />
                        <label
                          className="form-check-label small"
                          htmlFor={`edit-linkedin-target-${key}`}
                        >
                          {t.label} ({t.kind === 'personal' ? 'personal' : 'page'})
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
              {twitterIdentity && (
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="edit-twitter"
                    checked={crossPostToTwitter}
                    onChange={(e) => setCrossPostToTwitter(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="edit-twitter">
                    Twitter / X
                  </label>
                </div>
              )}
              {mastodonIdentities.length === 0 && !blueskyIdentity && linkedInTargets.length === 0 && !twitterIdentity && (
                <span className="small text-muted">No cross-post accounts connected</span>
              )}
            </div>
            {error && (
              <div className="alert alert-danger mt-2 py-2 small" role="alert">
                {error}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <i className="bx bx-loader-alt bx-spin me-1" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
