import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import CategoryTag from '../components/CategoryTag';
import ChatModal from '../components/ChatModal';
import { useAuth } from '../context/AuthContext';

const BASE_URL = 'http://localhost:5001';

const formatNumber = (value) => {
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return number.toLocaleString();
};

const getRelativeTime = (dateString) => {
  if (!dateString) return 'just now';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  return 'just now';
};

const engagementTone = (rate) => {
  if (rate > 3) return 'border-[#bde9cd] bg-[#e8f8ef] text-[#137a3f]';
  if (rate >= 1) return 'border-[#f1df9a] bg-[#fff7db] text-[#9a6a00]';
  return 'border-[#f2b8bd] bg-[#fff0f0] text-[#b4232f]';
};

const proxiedInstagramImage = (url) => {
  if (!url) return '';
  if (!url.startsWith('http')) return url;
  return `/api/instagram/image?url=${encodeURIComponent(url)}`;
};

const resolveAvatar = (avatar, displayName, fallbackUrl = '') => {
  if (fallbackUrl) return proxiedInstagramImage(fallbackUrl);
  if (avatar?.startsWith?.('http')) return proxiedInstagramImage(avatar);
  if (avatar?.startsWith?.('/uploads/')) return `${BASE_URL}${avatar}`;
  if (avatar) return `${BASE_URL}/uploads/${avatar}`;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'CS')}&background=4b7f75&color=fff&size=240`;
};

const DetailGrid = ({ items }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {items.map((item) => (
      <div key={item.label} className="rounded-lg border border-ink/10 bg-white px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/42">{item.label}</p>
        <p className="mt-2 text-sm font-bold text-ink">
          {item.value === 0 ? '0' : item.value || '—'}
        </p>
      </div>
    ))}
  </div>
);

const InstagramProfileStats = ({ user, canRefresh = false, onRefresh, refreshing = false }) => {
  const hasStats = user?.instagram_handle && (
    user.follower_count || user.media_count || user.engagement_rate
  );

  if (!hasStats) {
    return (
      <div className="rounded-lg border border-ink/10 bg-white px-4 py-5 text-sm font-bold text-ink/45">
        No Instagram connected
      </div>
    );
  }

  const verified = Boolean(user.instagram_verified);
  const recentPosts = user.instagram_recent_posts || [];
  const hasAverages = Number(user.avg_like_count) > 0 || Number(user.avg_comment_count) > 0;

  return (
    <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <img
              src={proxiedInstagramImage(user.instagram_profile_pic) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.instagram_handle || 'IG')}&background=4b7f75&color=fff&size=128`}
              alt={user.instagram_handle}
              className="h-20 w-20 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-extrabold text-ink">@{user.instagram_handle}</p>
              {user.biography ? (
                <p className="mt-2 max-h-12 overflow-hidden text-sm leading-6 text-ink/55">{user.biography}</p>
              ) : null}
            </div>
            <span
              title={verified ? 'Verified via Instagram, updated daily' : 'Public data, not verified'}
              className={`rounded-full border px-3 py-1 text-xs font-extrabold ${
                verified
                  ? 'border-[#bde9cd] bg-[#e8f8ef] text-[#137a3f]'
                  : 'border-ink/10 bg-ink/[0.035] text-ink/45'
              }`}
            >
              {verified ? 'Verified' : 'Unverified'}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-ink/10 bg-ink/[0.035] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/42">Followers</p>
              <p className="mt-1 text-2xl font-extrabold text-ink">{formatNumber(user.follower_count)}</p>
            </div>
            <div className="rounded-lg border border-ink/10 bg-ink/[0.035] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/42">Posts</p>
              <p className="mt-1 text-2xl font-extrabold text-ink">{formatNumber(user.media_count)}</p>
            </div>
            <div className="rounded-lg border border-ink/10 bg-ink/[0.035] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/42">Following</p>
              <p className="mt-1 text-2xl font-extrabold text-ink">{formatNumber(user.following_count)}</p>
            </div>
          </div>

          <div className={`mt-4 rounded-lg border px-4 py-3 ${engagementTone(user.engagement_rate)}`}>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] opacity-70">Engagement rate</p>
            <p className="mt-1 text-2xl font-extrabold">{user.engagement_rate || 0}%</p>
          </div>

          {hasAverages ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-ink/10 bg-white px-4 py-3">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-ink/42">Avg likes</p>
                <p className="mt-1 text-xl font-extrabold text-ink">{formatNumber(user.avg_like_count)}</p>
              </div>
              <div className="rounded-lg border border-ink/10 bg-white px-4 py-3">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-ink/42">Avg comments</p>
                <p className="mt-1 text-xl font-extrabold text-ink">{formatNumber(user.avg_comment_count)}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 text-sm text-ink/50 sm:flex-row sm:items-center sm:justify-between">
            <span>Last synced {getRelativeTime(user.instagram_last_synced_at)}</span>
            <div className="flex flex-wrap gap-3">
              {canRefresh ? (
                <button type="button" onClick={onRefresh} disabled={refreshing} className="font-extrabold text-[#4140c8] disabled:opacity-50">
                  {refreshing ? 'Refreshing...' : 'Refresh stats'}
                </button>
              ) : null}
              <a
                href={`https://www.instagram.com/${user.instagram_handle}/`}
                target="_blank"
                rel="noreferrer"
                className="font-extrabold text-[#4140c8]"
              >
                View on Instagram
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-ink/10 bg-ink/[0.025] p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold uppercase tracking-[0.12em] text-ink/42">Recent content</h3>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink/45">
              {user.instagram_source || 'public'}
            </span>
          </div>
          {recentPosts.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {recentPosts.slice(0, 4).map((post) => (
                <a
                  key={post.shortcode || post.display_url}
                  href={post.shortcode ? `https://www.instagram.com/p/${post.shortcode}/` : `https://www.instagram.com/${user.instagram_handle}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-lg border border-ink/10 bg-white"
                >
                  {post.display_url ? (
                    <img src={proxiedInstagramImage(post.display_url)} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="aspect-square w-full bg-ink/[0.05]" />
                  )}
                  <div className="grid grid-cols-2 gap-1 px-2 py-2 text-xs font-bold text-ink/50">
                    <span>{formatNumber(post.like_count)} likes</span>
                    <span>{formatNumber(post.comment_count)} comments</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-ink/10 bg-white px-4 py-8 text-center text-sm font-bold text-ink/45">
              Refresh stats to load recent post previews.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [instagramRefreshing, setInstagramRefreshing] = useState(false);
  const [chatTarget, setChatTarget] = useState(null);

  const isOwnProfile = !userId;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setLoadError('');
      setActionError('');
      try {
        const { data } = await api.get(isOwnProfile ? '/profile/me' : `/profile/${userId}`);
        setProfile(data);
      } catch (err) {
        setLoadError(err.response?.data?.message || 'Could not load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isOwnProfile, userId]);

  const refreshInstagramStats = async () => {
    try {
      setActionError('');
      setInstagramRefreshing(true);
      const username = profile.user?.instagram_handle || profile.handle || user?.instagram_handle;
      const { data } = await api.post('/instagram/fetch-public', { username, force: true });
      const updatedInstagramUser = {
        ...profile.user,
        instagram_handle: data.username,
        instagram_profile_pic: data.profile_pic_url,
        follower_count: data.follower_count,
        following_count: data.following_count,
        media_count: data.media_count,
        engagement_rate: data.engagement_rate,
        avg_like_count: data.avg_like_count,
        avg_comment_count: data.avg_comment_count,
        instagram_source: data.source,
        instagram_recent_posts: data.recent_posts,
        instagram_verified: data.instagram_verified,
        instagram_last_synced_at: data.last_synced_at,
        biography: data.biography,
      };

      setProfile((current) => ({
        ...current,
        avatar: data.profile_pic_url || current.avatar,
        handle: data.username ? `@${data.username}` : current.handle,
        platform: 'Instagram',
        followerCount: data.follower_count,
        engagementRate: data.engagement_rate,
        user: updatedInstagramUser,
      }));
      updateUser(updatedInstagramUser);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not refresh Instagram stats');
    } finally {
      setInstagramRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="h-[28rem] animate-pulse rounded-lg border border-ink/10 bg-white" />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="page-shell flex justify-center py-12">
        <div className="panel w-full max-w-md p-8 text-center">
          <h2 className="page-title">Profile unavailable</h2>
          <p className="page-lead mx-auto">{loadError || 'This profile could not be found.'}</p>
        </div>
      </div>
    );
  }

  const avatarSrc = resolveAvatar(profile.avatar, profile.displayName, profile.user?.instagram_profile_pic);

  const isInfluencerProfile = profile.role === 'influencer' || profile.role === 'creator';
  const tags = isInfluencerProfile ? profile.interests : profile.campaignInterests;
  const canStartChat = !isOwnProfile && profile.user?._id !== user?._id && (
    profile.user?.role !== user?.role
  );
  const chatLabel = user?.role === 'brand' && isInfluencerProfile
    ? 'Message creator'
    : 'Open chat';

  const details = isInfluencerProfile
    ? [
        { label: 'Platform', value: profile.platform },
        { label: 'Followers', value: profile.followerCount || 0 },
        { label: 'Engagement', value: profile.engagementRate ? `${profile.engagementRate}%` : '—' },
        { label: 'Availability', value: profile.availability },
        { label: 'Past brands', value: profile.pastBrands?.length ? profile.pastBrands.join(', ') : '—' },
      ]
    : [
        { label: 'Category', value: profile.brandCategory },
        { label: 'Target audience', value: profile.targetAudience },
        { label: 'Budget tier', value: profile.budgetTier },
        { label: 'Campaign types', value: profile.campaignTypes?.length ? profile.campaignTypes.join(', ') : '—' },
        { label: 'Active campaigns', value: profile.activeCampaigns?.length ? profile.activeCampaigns.join(', ') : '—' },
      ];

  return (
    <div className="page-shell">
      {actionError ? (
        <div className="mb-5 rounded-lg border border-[#ff7a1a]/25 bg-[#fff5ec] px-4 py-3 text-sm font-bold text-[#b64c00]">
          {actionError}
        </div>
      ) : null}

      <section className="panel overflow-hidden">
        <div className="grid lg:grid-cols-[340px_1fr]">
          <div className="relative min-h-[20rem] overflow-hidden bg-ink lg:min-h-[28rem]">
            <img src={avatarSrc} alt={profile.displayName} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08070b]/50 via-transparent to-transparent lg:hidden" />
          </div>

          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-bold capitalize text-ink/50">
                {profile.role}
              </span>
              {profile.location ? (
                <span className="rounded-full border border-ink/10 bg-ink/[0.035] px-3 py-1 text-xs font-bold text-ink/55">
                  {profile.location}
                </span>
              ) : null}
            </div>

            <h1 className="mt-5 text-4xl font-extrabold leading-none text-ink sm:text-5xl">
              {profile.displayName}
            </h1>
            {profile.handle ? <p className="mt-2 text-base font-bold text-[#4140c8]">{profile.handle}</p> : null}
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/62">{profile.bio || 'No bio added yet.'}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {profile.website ? (
                <a href={profile.website} target="_blank" rel="noreferrer" className="btn-secondary text-sm">
                  Visit website
                </a>
              ) : null}

              {isOwnProfile ? (
                <>
                  <Link to="/edit-profile" className="btn-primary text-sm">
                    Edit profile
                  </Link>
                </>
              ) : canStartChat ? (
                <>
                  <button onClick={() => setChatTarget(profile.user._id)} className="btn-primary text-sm">
                    {chatLabel}
                  </button>
                </>
              ) : (
                <span className="rounded-full border border-ink/10 bg-white px-3 py-2 text-sm font-bold text-ink/50">
                  View only
                </span>
              )}
            </div>

            {tags?.length ? (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {tags.map((tag, index) => (
                  <CategoryTag key={tag} label={tag} index={index} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-ink">
          {isInfluencerProfile ? 'Collaboration details' : 'Campaign details'}
        </h2>
        <div className="mt-4">
          <DetailGrid items={details} />
        </div>
      </section>

      {isInfluencerProfile ? (
        <section className="mt-8">
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-ink">Instagram analytics</h2>
          <div className="mt-4">
            <InstagramProfileStats
              user={profile.user}
              canRefresh={isOwnProfile}
              onRefresh={refreshInstagramStats}
              refreshing={instagramRefreshing}
            />
          </div>
        </section>
      ) : null}

      {chatTarget ? (
        <ChatModal
          participantId={chatTarget}
          onClose={() => setChatTarget(null)}
        />
      ) : null}
    </div>
  );
};

export default ProfilePage;
