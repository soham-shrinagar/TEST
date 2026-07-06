import React from 'react';

const FitToken = ({ score, label = 'Fit' }) => {
  if (score === null || score === undefined) return null;
  return (
    <div className="inline-flex flex-col items-center gap-1" title={`${label}: ${score}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent bg-paper font-mono-data text-xs font-bold text-ink">
        {score}
      </span>
      <span className="font-mono-data text-[9px] uppercase tracking-[0.14em] text-inkSoft">{label}</span>
    </div>
  );
};

export default FitToken;
