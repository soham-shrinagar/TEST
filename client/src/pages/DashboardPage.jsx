import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import StatCard from '../components/StatCard';

const proxiedInstagramImage = (url) => {
  if (!url) return '';
  if (!url.startsWith('http')) return url;
  return `/api/instagram/image?url=${encodeURIComponent(url)}`;
};

const getRelativeTime = (dateString) => {
  const now = new Date();
  const target = new Date(dateString);
  const diffMs = now - target;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/analytics/dashboard');
        setStats(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="page-shell">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-lg border border-ink/10 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell flex justify-center py-12">
        <div className="panel w-full max-w-md p-8 text-center">
          <h2 className="page-title">Couldn&apos;t load dashboard</h2>
          <p className="page-lead mx-auto">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="page-shell flex justify-center py-12">
        <div className="panel w-full max-w-md p-8 text-center">
          <h2 className="page-title">No dashboard data</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-5 border-b border-ink/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="eyebrow">Analytics</div>
          <h1 className="mt-4 page-title">Dashboard</h1>
          <p className="page-lead">
            Track how discovery, recommendations, and profile activity are gaining traction.
          </p>
        </div>
        <Link to="/feed" className="btn-primary w-fit">
          Discover more
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Matches" value={stats.totalMatches} color="brand" />
        <StatCard label="Positive Signals" value={stats.likesReceived} color="teal" />
        <StatCard label="Conversion Rate" value={`${stats.matchRate}%`} color="orange" sub={`${stats.likesSent} signals sent`} />
        <StatCard label="Profile Views" value={stats.profileViews} color="rose" sub={`${stats.passesSent} negative signals`} />
      </div>

      <section className="panel mt-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-5 sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-ink">Recent matches</h2>
          <span className="rounded-full bg-ink/[0.04] px-3 py-1 text-xs font-bold text-ink/48">
            {stats.recentMatches?.length || 0} latest
          </span>
        </div>

        {stats.recentMatches?.length ? (
          <div>
            {stats.recentMatches.map(({ matchId, matchedAt, profile }, index) => {
              const avatarSrc = profile.avatar?.startsWith?.('http')
                ? proxiedInstagramImage(profile.avatar)
                : profile.avatar
                  ? profile.avatar
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&background=4b7f75&color=fff&size=200`;

              return (
                <Link
                  key={matchId}
                  to={`/profile/${profile.user._id}`}
                  className={`flex items-center gap-4 px-5 py-4 transition hover:bg-ink/[0.035] sm:px-6 ${
                    index ? 'border-t border-ink/10' : ''
                  }`}
                >
                  <img src={avatarSrc} alt={profile.displayName} className="h-12 w-12 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{profile.displayName}</p>
                    <p className="text-sm capitalize text-ink/48">{profile.role}</p>
                  </div>
                  <p className="shrink-0 text-sm text-ink/45">{getRelativeTime(matchedAt)}</p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-ink/50 sm:px-6">
            No recent matches yet.
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
