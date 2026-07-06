import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { canUse3D } from '../components/lineup/LineupScene';

const LandingCorridor = lazy(() => import('../components/lineup/LandingCorridor'));

const LandingFallback = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-paper">
    <h1 className="font-display text-[clamp(40px,9vw,110px)] leading-none text-ink">THE LINEUP</h1>
    <div className="mt-3.5 font-mono-data text-[11px] uppercase tracking-[0.14em] text-inkSoft">
      pressing the bill&nbsp;&nbsp;·&nbsp;&nbsp;creatorsync
    </div>
  </div>
);

const LandingPage = () => {
  const navigate = useNavigate();

  if (!canUse3D()) {
    return (
      <div className="min-h-screen bg-paper px-6 py-16 text-ink">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3.5 font-mono-data text-[11px] uppercase tracking-[0.18em] text-accent">A three-sided marketplace</div>
          <h1 className="font-display text-6xl uppercase leading-[0.88]">THE LINEUP</h1>
          <p className="mx-auto mt-6 max-w-lg text-inkSoft">
            Every creator gets billed. Every brand curates a stage. Every local shop gets an opening slot.
          </p>
          <button type="button" onClick={() => navigate('/register')} className="btn-stamp-ink mt-10 bg-ink px-8 py-4 font-mono-data text-sm font-bold uppercase tracking-[0.08em] text-paper">
            Book your slot →
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LandingFallback />}>
      <LandingCorridor onBookSlot={() => navigate('/register')} />
    </Suspense>
  );
};

export default LandingPage;
