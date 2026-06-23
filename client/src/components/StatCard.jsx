import React from 'react';

const toneMap = {
  brand: 'text-ink',
  orange: 'text-[#b64c00]',
  teal: 'text-[#007a65]',
  rose: 'text-[#4140c8]',
};

const StatCard = ({ label, value, sub, color = 'brand' }) => {
  const tone = toneMap[color] || toneMap.brand;

  return (
    <div className="panel px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/42">{label}</p>
      <div className="mt-5 flex items-end justify-between gap-3">
        <p className={`text-4xl font-extrabold leading-none ${tone}`}>{value}</p>
        {sub ? <p className="max-w-[8rem] text-right text-xs leading-5 text-ink/45">{sub}</p> : null}
      </div>
    </div>
  );
};

export default StatCard;
