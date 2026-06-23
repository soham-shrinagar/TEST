import React from 'react';

const ReasonTags = ({ reasons = [] }) => {
  const visible = reasons.slice(0, 3);
  const hidden = reasons.slice(3);
  if (!visible.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((reason) => (
        <span key={reason} className="rounded-full bg-[#e8f8ef] px-2.5 py-1 text-xs font-extrabold text-[#137a3f]">
          ✓ {reason}
        </span>
      ))}
      {hidden.length ? (
        <span title={hidden.join(', ')} className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-xs font-extrabold text-ink/50">
          +{hidden.length} more
        </span>
      ) : null}
    </div>
  );
};

export default ReasonTags;
