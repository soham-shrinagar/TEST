import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

const features = [
  {
    title: 'Curated discovery',
    desc: 'Review creators and brands in a focused flow designed for fast fit checks.',
  },
  {
    title: 'Decision-ready profiles',
    desc: 'Audience, budget, category, interests, and collaboration style stay visible.',
  },
  {
    title: 'Mutual intent',
    desc: 'Matches unlock only when both sides want the conversation.',
  },
  {
    title: 'Simple momentum',
    desc: 'A compact dashboard tracks traction without adding operational noise.',
  },
];

const LandingPage = () => {
  return (
    <div className="landing-surface min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/86 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="shrink-0">
            <BrandLogo />
          </Link>
          <div className="flex gap-2">
            <Link to="/login" className="btn-secondary px-4 py-2 text-sm">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary px-4 py-2 text-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="page-shell pb-16 pt-10 sm:pt-14">
        <section className="grid min-h-[calc(100vh-8rem)] gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="scroll-reveal max-w-2xl">
            <div className="eyebrow">Creator partnerships, redesigned</div>
            <h1 className="mt-5 text-5xl font-extrabold leading-[0.96] text-ink sm:text-6xl lg:text-7xl">
              Match better.
              <span className="block gradient-text">Move faster.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink/62">
              CreatorSync gives brands and creators a polished workspace for discovery, mutual interest, and relationship momentum.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-primary px-6 py-3">
                Get started
              </Link>
              <Link to="/login" className="btn-secondary px-6 py-3">
                Sign in
              </Link>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 border-y border-ink/10 py-5">
              <div>
                <p className="text-2xl font-extrabold text-ink">2-way</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-ink/42">Intent</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-ink">Fast</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-ink/42">Discovery</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-ink">Clear</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-ink/42">Signals</p>
              </div>
            </div>
          </div>

          <div className="scroll-reveal canvas-panel overflow-hidden p-3 sm:p-4" style={{ animationDelay: '120ms' }}>
            <div className="rounded-lg border border-ink/10 bg-ink p-2">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-2 pb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="ml-3 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/68">
                  creatorsync.app/discover
                </span>
              </div>

              <div className="grid gap-3 p-2 lg:grid-cols-[0.72fr_1fr]">
                <div className="rounded-lg border border-white/10 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">Live match</span>
                    <span className="text-xs font-bold text-ink/45">81% fit</span>
                  </div>
                  <div className="mt-16">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/42">Travel creator</p>
                    <h2 className="mt-2 text-3xl font-extrabold leading-none text-ink">Ava Studio</h2>
                    <p className="mt-3 text-sm leading-6 text-ink/58">
                      Cinematic reels, boutique hospitality, premium weekend escapes.
                    </p>
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-2">
                    <button className="rounded-full border border-ink/12 px-4 py-2 text-sm font-bold text-ink">Pass</button>
                    <button className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white">Like</button>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-lg border border-white/10 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/42">Campaign board</p>
                    <div className="mt-4 grid gap-2">
                      {['Audience overlap', 'Budget alignment', 'Creative direction'].map((item, index) => (
                        <div key={item} className="flex items-center justify-between rounded-lg bg-ink/[0.035] px-3 py-2">
                          <span className="text-sm font-bold text-ink">{item}</span>
                          <span className="text-sm font-extrabold text-ink">{[81, 74, 92][index]}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mesh-dark rounded-lg p-4 text-white">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">Dashboard pulse</p>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-2xl font-extrabold">12</p>
                        <p className="text-xs text-white/52">Matches</p>
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold">48</p>
                        <p className="text-xs text-white/52">Likes</p>
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold">25%</p>
                        <p className="text-xs text-white/52">Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="scroll-reveal mt-10 border-t border-ink/10 pt-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <h2 className="section-heading">Built for better first impressions</h2>
              <p className="mt-3 section-copy">
                Premium without the clutter. Every screen supports faster, more confident collaboration choices.
              </p>
            </div>
            <Link to="/register" className="btn-secondary w-fit">
              Create profile
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div key={feature.title} className="scroll-reveal panel p-5" style={{ animationDelay: `${index * 70}ms` }}>
                <span className="text-xs font-extrabold text-ink/35">0{index + 1}</span>
                <h3 className="mt-8 text-lg font-extrabold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink/58">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="scroll-reveal mt-12 mesh-dark overflow-hidden rounded-lg px-5 py-8 text-white sm:px-8">
          <div className="grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/48">CreatorSync workspace</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
                A cleaner place to decide who deserves the next message.
              </h2>
            </div>
            <p className="text-base leading-7 text-white/62">
              Keep discovery, profile review, mutual matches, and traction in one crisp flow.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
