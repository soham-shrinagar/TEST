import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const SessionsPage = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/auth/sessions');
      setSessions(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const revokeSession = async (sessionId) => {
    setActionLoading(sessionId);
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      await loadSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not revoke session');
    } finally {
      setActionLoading('');
    }
  };

  const revokeOthers = async () => {
    setActionLoading('others');
    try {
      await api.post('/auth/sessions/revoke-others');
      await loadSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not revoke other sessions');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-3xl">
        <div className="border-b border-ink/10 pb-6">
          <div className="eyebrow">Account security</div>
          <h1 className="mt-4 page-title">Active sessions</h1>
          <p className="page-lead">
            Review devices signed into {user?.email || 'your account'} and revoke access you do not recognize.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-[#ff7a1a]/25 bg-[#fff5ec] px-4 py-3 text-sm font-bold text-[#b64c00]">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={revokeOthers}
            disabled={actionLoading === 'others' || sessions.length <= 1}
            className="btn-secondary"
          >
            {actionLoading === 'others' ? 'Revoking…' : 'Sign out other devices'}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="panel h-24 animate-pulse p-6" />
          ) : sessions.map((session) => (
            <article key={session._id} className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-extrabold text-ink">
                  {session.userAgent || 'Unknown device'}
                  {session.current ? (
                    <span className="ml-2 rounded-full bg-[#4140c8]/10 px-2 py-0.5 text-xs font-bold text-[#4140c8]">
                      Current
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-ink/50">
                  {session.ipAddress || 'Unknown IP'} · Last active {new Date(session.updatedAt).toLocaleString()}
                </p>
              </div>
              {!session.current ? (
                <button
                  type="button"
                  onClick={() => revokeSession(session._id)}
                  disabled={actionLoading === session._id}
                  className="btn-secondary w-fit"
                >
                  {actionLoading === session._id ? 'Revoking…' : 'Revoke'}
                </button>
              ) : null}
            </article>
          ))}
        </div>

        <p className="mt-6 text-sm text-ink/50">
          <Link to="/profile" className="font-bold text-[#4140c8] hover:text-ink">
            Back to profile
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SessionsPage;
