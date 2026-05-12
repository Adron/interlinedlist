'use client';

import { useState, useEffect, useCallback } from 'react';

export interface EmailLogEntry {
  id: string;
  emailType: string;
  fromEmail: string | null;
  recipient: string;
  userId: string | null;
  status: string;
  providerId: string | null;
  errorMessage: string | null;
  metadata: unknown;
  createdAt: string;
}

interface EmailLogTableProps {
  initialLogs: EmailLogEntry[];
  initialTotal: number;
  initialSummary?: Record<string, number>;
}

const EMAIL_TYPE_LABELS: Record<string, string> = {
  signup_verification: 'Signup',
  resend_verification: 'Resend verif.',
  admin_user_verification: 'Admin create',
  email_change_verification: 'Email change',
  forgot_password: 'Forgot pwd',
};

const STATUS_BADGE: Record<string, string> = {
  sent: 'bg-success',
  failed: 'bg-danger',
  delivered: 'bg-primary',
  bounced: 'bg-warning text-dark',
  complained: 'bg-danger',
};

function statusBadgeClass(status: string): string {
  return STATUS_BADGE[status] ?? 'bg-secondary';
}

function recipientDomain(email: string): string {
  const at = email.indexOf('@');
  return at >= 0 ? email.slice(at + 1) : '';
}

function SummaryStrip({ summary }: { summary: Record<string, number> }) {
  const statuses = ['sent', 'delivered', 'failed', 'bounced', 'complained'];
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  return (
    <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
      <span className="text-muted small me-1">
        <strong>{total}</strong> total
      </span>
      {statuses.map((s) =>
        summary[s] ? (
          <span key={s} className={`badge ${statusBadgeClass(s)}`}>
            {s}: {summary[s]}
          </span>
        ) : null
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-link btn-sm p-0 ms-1"
      title="Copy to clipboard"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <i className={`bx ${copied ? 'bx-check text-success' : 'bx-copy'}`} style={{ fontSize: '0.8rem' }} />
    </button>
  );
}

function ProviderIdCell({ providerId }: { providerId: string }) {
  return (
    <span className="d-flex align-items-center gap-1">
      <code style={{ fontSize: '0.68rem', wordBreak: 'break-all' }}>{providerId}</code>
      <CopyButton text={providerId} />
      <a
        href={`https://resend.com/emails/${providerId}`}
        target="_blank"
        rel="noopener noreferrer"
        title="View in Resend"
        className="text-muted"
      >
        <i className="bx bx-link-external" style={{ fontSize: '0.8rem' }} />
      </a>
    </span>
  );
}

function ErrorCodeBadge({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  const code = m.errorCode;
  const name = m.errorName as string | undefined;
  if (!code && !name) return null;
  return (
    <span className="badge bg-danger bg-opacity-75 ms-1" title={name}>
      {code ? String(code) : name}
    </span>
  );
}

function WebhookEventsList({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  const events = m.webhookEvents as Array<{ type: string; createdAt: string }> | undefined;
  if (!events?.length) return null;
  return (
    <div className="mt-1">
      <span className="text-muted small fw-semibold">Webhook events:</span>
      <ul className="mb-0 ps-3">
        {events.map((e, i) => (
          <li key={i} className="small">
            <code>{e.type}</code>{' '}
            <span className="text-muted">{new Date(e.createdAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LogRow({ log }: { log: EmailLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const domain = recipientDomain(log.recipient);
  const hasError = !!log.errorMessage;
  const metadata = log.metadata as Record<string, unknown> | null;
  const hasWebhookEvents =
    metadata &&
    Array.isArray(metadata.webhookEvents) &&
    (metadata.webhookEvents as unknown[]).length > 0;
  const expandable = hasError || hasWebhookEvents;

  return (
    <>
      <tr
        className={expandable ? 'cursor-pointer' : ''}
        onClick={expandable ? () => setExpanded((e) => !e) : undefined}
        style={expandable ? { cursor: 'pointer' } : undefined}
      >
        <td className="text-nowrap small">{new Date(log.createdAt).toLocaleString()}</td>
        <td>
          <span className="badge bg-secondary">
            {EMAIL_TYPE_LABELS[log.emailType] ?? log.emailType}
          </span>
        </td>
        <td>
          <code className="small">{log.recipient}</code>
          {domain && <span className="text-muted small ms-1">({domain})</span>}
        </td>
        <td>
          <span className={`badge ${statusBadgeClass(log.status)}`}>{log.status}</span>
          {hasError && <ErrorCodeBadge metadata={log.metadata} />}
        </td>
        <td style={{ maxWidth: 220 }}>
          {log.providerId ? (
            <ProviderIdCell providerId={log.providerId} />
          ) : (
            <span className="text-muted">—</span>
          )}
        </td>
        <td>
          {expandable ? (
            <i className={`bx ${expanded ? 'bx-chevron-up' : 'bx-chevron-down'} text-muted`} />
          ) : null}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-light px-3 py-2">
            {hasError && (
              <div className="mb-1">
                <span className="text-muted small fw-semibold">Error: </span>
                <span className="text-danger small">{log.errorMessage}</span>
              </div>
            )}
            <WebhookEventsList metadata={log.metadata} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function EmailLogTable({
  initialLogs,
  initialTotal,
  initialSummary = {},
}: EmailLogTableProps) {
  const [logs, setLogs] = useState<EmailLogEntry[]>(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [summary, setSummary] = useState<Record<string, number>>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 25;

  const isDefault =
    currentPage === 1 &&
    !statusFilter &&
    !typeFilter &&
    !search &&
    dateRange === 'all' &&
    sort === 'desc';

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
        sort,
        dateRange,
      });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('emailType', typeFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/email-logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch email logs:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, typeFilter, search, dateRange, sort]);

  useEffect(() => {
    if (isDefault) {
      setLogs(initialLogs);
      setTotal(initialTotal);
      setSummary(initialSummary);
      return;
    }
    fetchLogs();
  }, [isDefault, fetchLogs, initialLogs, initialTotal, initialSummary]);

  const totalPages = Math.ceil(total / itemsPerPage);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setCurrentPage(1);
  }

  function handleFilterChange(setter: (v: string) => void, value: string) {
    setter(value);
    setCurrentPage(1);
  }

  return (
    <div className="card">
      <div className="card-body">
        <SummaryStrip summary={summary} />

        {/* Filters row */}
        <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
          <form className="d-flex gap-1" onSubmit={handleSearchSubmit}>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search recipient..."
              style={{ width: 200 }}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn btn-sm btn-outline-secondary">
              <i className="bx bx-search" />
            </button>
          </form>

          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="bounced">Bounced</option>
            <option value="complained">Complained</option>
          </select>

          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={typeFilter}
            onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)}
          >
            <option value="">All types</option>
            {Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={dateRange}
            onChange={(e) => handleFilterChange(setDateRange, e.target.value)}
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            title={sort === 'desc' ? 'Newest first' : 'Oldest first'}
            onClick={() => {
              setSort((s) => (s === 'desc' ? 'asc' : 'desc'));
              setCurrentPage(1);
            }}
          >
            <i className={`bx ${sort === 'desc' ? 'bx-sort-down' : 'bx-sort-up'}`} />
            {sort === 'desc' ? 'Newest' : 'Oldest'}
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover table-sm align-middle">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Recipient</th>
                <th>Status</th>
                <th>Provider ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Loading…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No email logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => <LogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">{total} total</span>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">
                    {currentPage} / {totalPages}
                  </span>
                </li>
                <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
