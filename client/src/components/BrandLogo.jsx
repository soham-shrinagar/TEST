import React from 'react';

const BrandLogo = ({ compact = false, className = '' }) => (
  <div className={`inline-flex items-center gap-3 ${className}`}>
    <img
      src="/creatorsync-logo.png"
      alt=""
      aria-hidden="true"
      className="h-10 w-10 shrink-0 rounded-[0.5rem] object-contain"
    />
    {!compact ? (
      <span className="text-[1.375rem] font-extrabold leading-none tracking-[-0.03em] text-ink">
        CreatorSync
      </span>
    ) : null}
  </div>
);

export default BrandLogo;
