import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { avatarUrl } from '../utils/images';
import ReasonTags from './ReasonTags';
import FitToken from './lineup/FitToken';

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
      <div className="halftone-bg pointer-events-none absolute inset-x-0 top-0 h-1/3" />
      {hasScore ? (
        <div className="absolute right-3 top-3">
          <FitToken score={score} label="Fit" />
        </div>
      ) : null}
      <div className={`relative flex gap-3 ${hasScore ? 'pr-16' : ''}`}>
        <img src={avatarUrl(profile, name)} alt={name} className="h-14 w-14 shrink-0 border-2 border-ink object-cover" />
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg uppercase text-ink">{name}</h3>
          <p className="truncate text-sm font-bold text-inkSoft">{profile.location || user.instagram_handle || 'Creator'}</p>
        </div>
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="border border-ink/20 bg-paper p-3">
          <p className="label">Followers</p>
          <p className="font-mono-data font-extrabold">{formatNumber(profile.followerCount || user.follower_count)}</p>
        </div>
        <div className="border border-ink/20 bg-paper p-3">
          <p className="label">Engagement</p>
          <p className="font-mono-data font-extrabold">{profile.engagementRate || user.engagement_rate || 0}%</p>
        </div>
      </div>
      <div className="relative mt-3">
        <ReasonTags reasons={recommendation?.reasons || []} />
      </div>
      <div className={`relative mt-4 flex ${compact ? 'gap-2' : 'gap-3'}`}>
        <Link onClick={handleClick} to={`/profile/${user._id || profile.user}`} className="btn-primary flex-1 text-center text-sm">
          View
        </Link>
        {action}
      </div>
    </article>
  );
};

export default RecommendedCreatorCard;
