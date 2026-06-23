import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import CategoryTag from '../components/CategoryTag';
import ChatModal from '../components/ChatModal';
import { avatarUrl } from '../utils/images';

const MatchesPage = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [chatTarget, setChatTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const { data } = await api.get('/matches');
        setMatches(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load matches');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  if (loading) {
    return (
      <div className="page-shell space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg border border-ink/10 bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell flex justify-center py-12">
        <div className="panel w-full max-w-md p-8 text-center">
          <h2 className="page-title">Couldn&apos;t load matches</h2>
          <p className="page-lead mx-auto">{error}</p>
        </div>
      </div>
    );
  }

  if (!matches.length) {
    return (
      <div className="page-shell flex justify-center py-12">
        <div className="panel w-full max-w-md p-8 text-center">
          <h2 className="page-title">No matches yet</h2>
          <p className="page-lead mx-auto">
            Mutual interest from past connections will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-5 border-b border-ink/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="eyebrow">Mutual interest</div>
          <h1 className="mt-4 page-title">Matches</h1>
          <p className="page-lead">
            {matches.length} mutual connection{matches.length === 1 ? '' : 's'}. Open a profile to review fit.
          </p>
        </div>
        <button onClick={() => navigate('/feed')} className="btn-primary w-fit">
          Discover creators
        </button>
      </div>

      <div className="mt-8 grid gap-3">
        {matches.map(({ matchId, matchedAt, profile }) => {
          const avatarSrc = avatarUrl(profile, profile.displayName);
          const tags = profile.role === 'influencer' ? profile.interests : profile.campaignInterests;

          return (
            <div
              key={matchId}
              className="panel relative flex w-full items-center gap-4 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-ink/18 hover:shadow-lift sm:px-5"
            >
              <img src={avatarSrc} alt={profile.displayName} className="h-16 w-16 shrink-0 rounded-lg object-cover" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold tracking-[-0.02em] text-ink">
                    {profile.displayName}
                  </h2>
                  <span className="rounded-full border border-ink/10 bg-white px-2 py-0.5 text-xs font-bold capitalize text-ink/45">
                    {profile.role}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink/45">
                  Matched {new Date(matchedAt).toLocaleDateString()}
                </p>
                {tags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.slice(0, 3).map((tag, tagIndex) => (
                      <CategoryTag key={tag} label={tag} index={tagIndex} />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="hidden shrink-0 gap-2 sm:flex">
                <button onClick={() => navigate(`/profile/${profile.user._id}`)} className="rounded-full bg-ink px-3 py-1.5 text-sm font-bold text-white">
                  View
                </button>
                <button onClick={() => setChatTarget(profile.user._id)} className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-sm font-bold text-ink">
                  Chat
                </button>
              </div>
              <button onClick={() => navigate(`/profile/${profile.user._id}`)} className="absolute inset-0 sm:hidden" aria-label={`View ${profile.displayName}`} />
            </div>
          );
        })}
      </div>

      {chatTarget ? (
        <ChatModal participantId={chatTarget} onClose={() => setChatTarget(null)} />
      ) : null}
    </div>
  );
};

export default MatchesPage;
