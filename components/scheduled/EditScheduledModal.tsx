'use client';

import { useState, useEffect } from 'react';
import { Message } from '@/lib/types';

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
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const mastodonIdentities = identities.filter((i) => i.provider.startsWith('mastodon:'));
  const blueskyIdentity = identities.find((i) => i.provider === 'bluesky');
  const linkedinIdentity = identities.find((i) => i.provider === 'linkedin');

  useEffect(() => {
    if (message.scheduledAt) {
      setScheduleDraft(toDatetimeLocal(new Date(message.scheduledAt)));
    }
  }, [message.scheduledAt]);

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
            crossPostToLinkedIn: !!linkedinIdentity && crossPostToLinkedIn,
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
              {linkedinIdentity && (
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
              {mastodonIdentities.length === 0 && !blueskyIdentity && !linkedinIdentity && (
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
