'use client';

import { useState, useEffect } from 'react';

export interface EmailLogEntry {
  id: string;
  emailType: string;
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
}

const EMAIL_TYPE_LABELS: Record<string, string> = {
  signup_verification: 'Signup',
  resend_verification: 'Resend verification',
  admin_user_verification: 'Admin create user',
  email_change_verification: 'Email change',
  forgot_password: 'Forgot password',
};

export default function EmailLogTable({ initialLogs, initialTotal }: EmailLogTableProps) {
  const [logs, setLogs] = useState<EmailLogEntry[]>(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const itemsPerPage = 25;

  useEffect(() => {
    if (currentPage === 1 && !statusFilter && !typeFilter) {
      setLogs(initialLogs);
      setTotal(initialTotal);
      return;
    }

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: itemsPerPage.toString(),
          offset: ((currentPage - 1) * itemsPerPage).toString(),
        });
        if (statusFilter) params.set('status', statusFilter);
        if (typeFilter) params.set('emailType', typeFilter);

        const res = await fetch(`/api/admin/email-logs?${params.toString()}`);
        const data = await res.json();
        if (res.ok) {
          setLogs(data.logs || []);
          setTotal(data.total ?? 0);
        }
      } catch (err) {
        console.error('Failed to fetch email logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [currentPage, statusFilter, typeFilter, initialLogs, initialTotal]);

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex flex-wrap gap-2 mb-3">
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All types</option>
            {Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="table-responsive">
          <table className="table table-hover table-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Recipient</th>
                <th>Status</th>
                <th>Provider ID</th>
                <th>Error</th>
                <th>User ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No email logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-nowrap small">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge bg-secondary">
                        {EMAIL_TYPE_LABELS[log.emailType] ?? log.emailType}
                      </span>
                    </td>
                    <td>
                      <code className="small">{log.recipient}</code>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          log.status === 'sent' ? 'bg-success' : 'bg-danger'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td>
                      {log.providerId ? (
                        <code className="small" style={{ fontSize: '0.7rem' }}>
                          {log.providerId.slice(0, 8)}...
                        </code>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      {log.errorMessage ? (
                        <span
                          className="text-danger small"
                          title={log.errorMessage}
                          style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}
                        >
                          {log.errorMessage}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      {log.userId ? (
                        <code className="small" style={{ fontSize: '0.7rem' }}>
                          {log.userId.slice(0, 8)}...
                        </code>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">
              {total} total
            </span>
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
                    Page {currentPage} of {totalPages}
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
