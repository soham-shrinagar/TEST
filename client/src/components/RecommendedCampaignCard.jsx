import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { daysUntil, deliverableRows, money } from './campaignUtils';
import ReasonTags from './ReasonTags';

const RecommendedCampaignCard = ({ recommendation, onTrack, registerView }) => {
  const cardRef = useRef(null);
  const campaign = recommendation?.target || recommendation;
  const score = recommendation?.score || 0;
  const endsIn = daysUntil(campaign?.applicationDeadline);

  useEffect(() => {
    if (!registerView || !cardRef.current || !recommendation?.targetId) return undefined;
    return registerView(cardRef.current, recommendation);
  }, [registerView, recommendation]);

  const handleClick = () => {
    if (onTrack && recommendation?.targetId) onTrack(recommendation, 'view').catch(() => {});
  };

  return (
    <article ref={cardRef} className="panel relative min-w-[18rem] p-4">
      <span className="absolute right-3 top-3 rounded-full bg-[#d9f99d] px-2.5 py-1 text-xs font-extrabold text-[#31520a]">
        Great fit
      </span>
      <div className="pr-24">
        <p className="text-sm font-extrabold text-ink/45">{campaign?.brand?.name || 'Brand'}</p>
        <h3 className="mt-1 line-clamp-2 text-xl font-extrabold text-ink">{campaign?.title || 'Campaign'}</h3>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {deliverableRows(campaign || {}).slice(0, 3).map((item) => (
          <span key={item.key} className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-xs font-bold">
            {item.label} x {item.count}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="label">Pay</p>
          <p className="text-xl font-extrabold text-[#0f7655]">{money(campaign?.budgetPerCreator)}</p>
        </div>
        <p className="text-xs font-extrabold text-ink/45">
          {endsIn === null ? 'Open deadline' : `${endsIn} days left`}
        </p>
      </div>
      <div className="mt-3">
        <ReasonTags reasons={recommendation?.reasons || []} />
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs font-extrabold text-ink/45">
          <span>Fit score</span>
          <span>{score}%</span>
        </div>
        <div className="h-2 rounded-full bg-ink/[0.08]">
          <div className="h-2 rounded-full bg-[#00a889]" style={{ width: `${Math.max(score, 4)}%` }} />
        </div>
      </div>
      <Link onClick={handleClick} className="btn-primary mt-4 w-full text-center text-sm" to={`/creator/deals/${campaign?._id}`}>
        View Deal
      </Link>
    </article>
  );
};

export default RecommendedCampaignCard;
