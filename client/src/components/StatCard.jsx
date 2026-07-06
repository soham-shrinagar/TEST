import React from 'react';

const StatCard = ({ label, value, sub, color = 'brand' }) => (
  <div className="panel px-5 py-4">
    <p className="label">{label}</p>
    <div className="mt-5 flex items-end justify-between gap-3">
      <p className={`font-mono-data text-4xl font-extrabold leading-none ${color === 'accent' ? 'text-accent' : 'text-ink'}`}>{value}</p>
      {sub ? <p className="max-w-[8rem] text-right text-xs leading-5 text-inkSoft">{sub}</p> : null}
    </div>
  </div>
);

export default StatCard;
