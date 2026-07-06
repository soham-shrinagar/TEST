import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { lineupCopy } from '../constants/lineupCopy';
import { daysUntil, deliverableRows, money } from './campaignUtils';
import ReasonTags from './ReasonTags';
import FitToken from './lineup/FitToken';

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
      <div className="halftone-bg pointer-events-none absolute inset-x-0 top-0 h-1/3" />
      <div className="absolute right-3 top-3">
        <FitToken score={score} label="Fit" />
      </div>
      <div className="relative pr-16">
        <p className="text-sm font-extrabold text-inkSoft">{campaign?.brand?.name || 'Brand'}</p>
        <h3 className="mt-1 line-clamp-2 font-display text-xl uppercase text-ink">{campaign?.title || lineupCopy.campaign}</h3>
      </div>
      <div className="relative mt-3 flex flex-wrap gap-2">
        {deliverableRows(campaign || {}).slice(0, 3).map((item) => (
          <span key={item.key} className="border border-ink/20 bg-paper px-2.5 py-1 text-xs font-bold">
            {item.label} x {item.count}
          </span>
        ))}
      </div>
      <div className="relative mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="label">Pay</p>
          <p className="font-mono-data text-xl font-extrabold text-ink">{money(campaign?.budgetPerCreator)}</p>
        </div>
        <p className="font-mono-data text-xs font-extrabold text-inkSoft">
          {endsIn === null ? 'Open deadline' : `${endsIn} days left`}
        </p>
      </div>
      <div className="relative mt-3">
        <ReasonTags reasons={recommendation?.reasons || []} />
      </div>
      <Link onClick={handleClick} className="btn-primary relative mt-4 w-full text-center text-sm" to={`/creator/deals/${campaign?._id}`}>
        View {lineupCopy.deal}
      </Link>
    </article>
  );
};

export default RecommendedCampaignCard;
