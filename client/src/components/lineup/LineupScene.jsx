import React, { Suspense, lazy } from 'react';

const LineupScene3D = lazy(() => import('./LineupScene3D'));

export const canUse3D = () => {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
};

const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8" aria-label="Loading">
    <div className="relative h-16 w-12 border-2 border-ink bg-paper">
      <div className="absolute inset-x-1 top-1 h-1 bg-accent" />
      <div className="halftone-bg absolute inset-0" />
      <div className="absolute bottom-2 left-0 right-0 text-center font-mono-data text-[9px] uppercase tracking-widest text-inkSoft">
        ...
      </div>
    </div>
  </div>
);

const LineupScene = ({ mode = 'loading', className = '', ...props }) => {
  if (!canUse3D()) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <LineupScene3D mode={mode} className={className} {...props} />
    </Suspense>
  );
};

export default LineupScene;
