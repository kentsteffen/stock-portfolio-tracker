import { useState, useEffect } from 'react';
import api from '../../utils/axios';
import { format } from 'date-fns';

export const EmailQueue = () => {
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [selectedEmails, setSelectedEmails] = useState([]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/admin/email-queue/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchEmails = async () => {
    try {
      const response = await api.get('/api/admin/email-queue', {
        params: {
          page,
          limit: 10,
          ...filter
        }
      });
      setEmails(response.data.emails);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchEmails();
  }, [page, filter]);

  const handleRetry = async () => {
    try {
      await api.post('/api/admin/email-queue/retry', {
        ids: selectedEmails
      });
      fetchEmails();
      fetchStats();
      setSelectedEmails([]);
    } catch (error) {
      console.error('Failed to retry emails:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8 grid grid-cols-4 gap-4">
        {stats && (
          <>
            <StatCard
              title="Total Emails"
              value={stats.totalEmails}
              subtitle="All time"
            />
            <StatCard
              title="Last 24 Hours"
              value={stats.last24Hours}
              subtitle="New emails"
            />
            {stats.stats.map(stat => (
              <StatCard
                key={stat._id}
                title={stat._id.charAt(0).toUpperCase() + stat._id.slice(1)}
                value={stat.count}
                subtitle={`Avg ${stat.avgAttempts.toFixed(1)} attempts`}
              />
            ))}
          </>
        )}
      </div>

      <div className="mb-4 flex justify-between items-center">
        <div className="flex gap-4">
          <select
            value={filter.status}
            onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))}
            className="border rounded px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
            <option value="completed">Completed</option>
          </select>
          <input
            type="text"
            placeholder="Search emails..."
            value={filter.search}
            onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
            className="border rounded px-3 py-2"
          />
        </div>
        {selectedEmails.length > 0 && (
          <button
            onClick={handleRetry}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Retry Selected ({selectedEmails.length})
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    setSelectedEmails(
                      e.target.checked ? emails.map(email => email._id) : []
                    );
                  }}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attempts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {emails.map(email => (
              <tr key={email._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedEmails.includes(email._id)}
                    onChange={(e) => {
                      setSelectedEmails(prev =>
                        e.target.checked
                          ? [...prev, email._id]
                          : prev.filter(id => id !== email._id)
                      );
                    }}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{email.to}</td>
                <td className="px-6 py-4 whitespace-nowrap">{email.subject}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={email.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{email.attempts}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {format(new Date(email.createdAt), 'MMM d, yyyy HH:mm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div>
          Showing page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtitle }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    <p className="text-3xl font-bold text-gray-700 mt-2">{value}</p>
    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs ${colors[status]}`}>
      {status}
    </span>
  );
}; 