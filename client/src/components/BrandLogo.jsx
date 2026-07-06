import React from 'react';

const BrandLogo = ({ compact = false, className = '' }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
    {!compact ? (
      <span className="font-display text-xl tracking-[0.02em] text-ink">
        CREATORSYNC
      </span>
    ) : null}
  </div>
);

export default BrandLogo;
