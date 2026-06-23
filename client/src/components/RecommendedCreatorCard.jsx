import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { avatarUrl } from '../utils/images';
import ReasonTags from './ReasonTags';

const formatNumber = (value) => {
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${Math.round(number / 1000)}K`;
  return number.toLocaleString();
};

const RecommendedCreatorCard = ({ recommendation, onTrack, registerView, compact = false, action }) => {
  const cardRef = useRef(null);
  const profile = recommendation?.target || recommendation;
  const user = profile?.user || {};
  const rawScore = recommendation?.score ?? profile?.score;
  const hasScore = rawScore !== null && rawScore !== undefined;
  const score = Number(rawScore) || 0;
  const name = profile?.displayName || user.name || 'Creator';

  useEffect(() => {
    if (!registerView || !cardRef.current || !recommendation?.targetId) return undefined;
    return registerView(cardRef.current, recommendation);
  }, [registerView, recommendation]);

  const handleClick = () => {
    if (onTrack && recommendation?.targetId) onTrack(recommendation, 'view').catch(() => {});
  };

  return (
    <article ref={cardRef} className="panel relative min-w-[17rem] overflow-hidden p-4">
      {hasScore ? (
        <span className="absolute right-3 top-3 rounded-full bg-[#d9f99d] px-2.5 py-1 text-xs font-extrabold text-[#31520a]">
          Recommended
        </span>
      ) : null}
      <div className={`flex gap-3 ${hasScore ? 'pr-24' : ''}`}>
        <img src={avatarUrl(profile, name)} alt={name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold text-ink">{name}</h3>
          <p className="truncate text-sm font-bold text-ink/45">{profile.location || user.instagram_handle || 'Creator'}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-ink/[0.04] p-3">
          <p className="label">Followers</p>
          <p className="font-extrabold">{formatNumber(profile.followerCount || user.follower_count)}</p>
        </div>
        <div className="rounded-lg bg-ink/[0.04] p-3">
          <p className="label">Engagement</p>
          <p className="font-extrabold">{profile.engagementRate || user.engagement_rate || 0}%</p>
        </div>
      </div>
      <div className="mt-3">
        <ReasonTags reasons={recommendation?.reasons || []} />
      </div>
      {hasScore ? (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs font-extrabold text-ink/45">
            <span>Fit score</span>
            <span>{score}%</span>
          </div>
          <div className="h-2 rounded-full bg-ink/[0.08]">
            <div className="h-2 rounded-full bg-[#00a889]" style={{ width: `${Math.max(score, 4)}%` }} />
          </div>
        </div>
      ) : null}
      <div className={`mt-4 flex ${compact ? 'gap-2' : 'gap-3'}`}>
        <Link onClick={handleClick} to={`/profile/${user._id || profile.user}`} className="btn-primary flex-1 text-center text-sm">
          View
        </Link>
        {action}
      </div>
    </article>
  );
};

export default RecommendedCreatorCard;
