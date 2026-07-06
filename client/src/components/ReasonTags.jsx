import React from 'react';

const ReasonTags = ({ reasons = [], max = 3 }) => {
  const visible = reasons.slice(0, max);
  const hidden = reasons.slice(max);

  if (!reasons.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((reason) => (
        <span key={reason} className="bg-accent px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-paper">
          {reason}
        </span>
      ))}
      {hidden.length > 0 ? (
        <span title={hidden.join(', ')} className="border border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-inkSoft">
          +{hidden.length}
        </span>
      ) : null}
    </div>
  );
};

export default ReasonTags;
