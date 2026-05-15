'use client';

import { useState } from 'react';

interface GenerativeAISectionProps {
  hasOpenaiKey: boolean;
  hasAnthropicKey: boolean;
}

interface KeyState {
  value: string;
  show: boolean;
  saving: boolean;
  removing: boolean;
  error: string;
  success: string;
}

function useKeyState(initialSet: boolean): [KeyState & { isSet: boolean }, {
  setValue: (v: string) => void;
  toggleShow: () => void;
  setSaving: (v: boolean) => void;
  setRemoving: (v: boolean) => void;
  setError: (v: string) => void;
  setSuccess: (v: string) => void;
  setIsSet: (v: boolean) => void;
}] {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSet, setIsSet] = useState(initialSet);

  return [
    { value, show, saving, removing, error, success, isSet },
    {
      setValue,
      toggleShow: () => setShow((s) => !s),
      setSaving,
      setRemoving,
      setError,
      setSuccess,
      setIsSet,
    },
  ];
}

export default function GenerativeAISection({ hasOpenaiKey, hasAnthropicKey }: GenerativeAISectionProps) {
  const [openai, openaiActions] = useKeyState(hasOpenaiKey);
  const [anthropic, anthropicActions] = useKeyState(hasAnthropicKey);

  const saveKey = async (
    field: 'openaiApiKey' | 'anthropicApiKey',
    value: string,
    actions: typeof openaiActions,
  ) => {
    actions.setError('');
    actions.setSuccess('');
    actions.setSaving(true);
    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        actions.setError(data.error || 'Failed to save key');
        return;
      }
      actions.setSuccess('API key saved');
      actions.setIsSet(true);
      actions.setValue('');
    } catch {
      actions.setError('Failed to save key');
    } finally {
      actions.setSaving(false);
    }
  };

  const removeKey = async (
    field: 'openaiApiKey' | 'anthropicApiKey',
    actions: typeof openaiActions,
  ) => {
    actions.setError('');
    actions.setSuccess('');
    actions.setRemoving(true);
    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: null }),
      });
      const data = await res.json();
      if (!res.ok) {
        actions.setError(data.error || 'Failed to remove key');
        return;
      }
      actions.setSuccess('API key removed');
      actions.setIsSet(false);
      actions.setValue('');
    } catch {
      actions.setError('Failed to remove key');
    } finally {
      actions.setRemoving(false);
    }
  };

  return (
    <div>
      <h3 className="h5 mb-2">Generative AI Accounts</h3>
      <p className="text-muted small mb-4">
        Connect generative AI services to unlock AI-powered features throughout the platform.
        Your API keys are stored securely and used only for requests you initiate — they are
        never shared or used for any other purpose.
      </p>

      {/* OpenAI */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="badge bg-dark" style={{ backgroundColor: '#10a37f !important' }}>OpenAI</span>
            {openai.isSet ? (
              <span className="text-success small">
                <i className="bx bx-check-circle me-1"></i>Configured
              </span>
            ) : (
              <span className="text-muted small">Not configured</span>
            )}
          </div>
          <p className="text-muted small mb-3">
            Your OpenAI API key enables AI-powered features such as content suggestions, list
            summarization, and automated tagging using GPT models. Obtain a key from
            your OpenAI account dashboard under API keys.
          </p>

          {openai.error && <div className="alert alert-danger py-2 small mb-2">{openai.error}</div>}
          {openai.success && <div className="alert alert-success py-2 small mb-2">{openai.success}</div>}

          <div className="d-flex gap-2 flex-wrap align-items-center mb-2">
            <div className="input-group input-group-sm" style={{ maxWidth: 340 }}>
              <input
                type={openai.show ? 'text' : 'password'}
                className="form-control"
                placeholder={openai.isSet ? '••••••••••••  (enter new key to replace)' : 'sk-...'}
                value={openai.value}
                onChange={(e) => openaiActions.setValue(e.target.value)}
                disabled={openai.saving || openai.removing}
                autoComplete="off"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={openaiActions.toggleShow}
                tabIndex={-1}
              >
                <i className={`bx ${openai.show ? 'bx-hide' : 'bx-show'}`}></i>
              </button>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => saveKey('openaiApiKey', openai.value, openaiActions)}
              disabled={!openai.value.trim() || openai.saving || openai.removing}
            >
              {openai.saving ? 'Saving...' : 'Save'}
            </button>
            {openai.isSet && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeKey('openaiApiKey', openaiActions)}
                disabled={openai.saving || openai.removing}
              >
                {openai.removing ? 'Removing...' : 'Remove'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Anthropic / Claude */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="badge bg-warning text-dark">Anthropic</span>
            {anthropic.isSet ? (
              <span className="text-success small">
                <i className="bx bx-check-circle me-1"></i>Configured
              </span>
            ) : (
              <span className="text-muted small">Not configured</span>
            )}
          </div>
          <p className="text-muted small mb-3">
            Your Anthropic API key enables AI-powered features using Claude models, including
            intelligent content analysis, writing assistance, and smart list organization.
            Obtain a key from your Anthropic Console under API keys.
          </p>

          {anthropic.error && <div className="alert alert-danger py-2 small mb-2">{anthropic.error}</div>}
          {anthropic.success && <div className="alert alert-success py-2 small mb-2">{anthropic.success}</div>}

          <div className="d-flex gap-2 flex-wrap align-items-center mb-2">
            <div className="input-group input-group-sm" style={{ maxWidth: 340 }}>
              <input
                type={anthropic.show ? 'text' : 'password'}
                className="form-control"
                placeholder={anthropic.isSet ? '••••••••••••  (enter new key to replace)' : 'sk-ant-...'}
                value={anthropic.value}
                onChange={(e) => anthropicActions.setValue(e.target.value)}
                disabled={anthropic.saving || anthropic.removing}
                autoComplete="off"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={anthropicActions.toggleShow}
                tabIndex={-1}
              >
                <i className={`bx ${anthropic.show ? 'bx-hide' : 'bx-show'}`}></i>
              </button>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => saveKey('anthropicApiKey', anthropic.value, anthropicActions)}
              disabled={!anthropic.value.trim() || anthropic.saving || anthropic.removing}
            >
              {anthropic.saving ? 'Saving...' : 'Save'}
            </button>
            {anthropic.isSet && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeKey('anthropicApiKey', anthropicActions)}
                disabled={anthropic.saving || anthropic.removing}
              >
                {anthropic.removing ? 'Removing...' : 'Remove'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
