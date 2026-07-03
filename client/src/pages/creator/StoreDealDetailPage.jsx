import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';

const OFFER_TYPE_LABELS = {
  free_meal: '🍽️ Free Meal',
  flat_fee: '💰 Flat Fee',
  discount_voucher: '🎟️ Voucher',
  combo: '🤝 Meal + Fee',
};

const money = (amount) =>
  amount > 0
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
    : null;

const StoreDealDetailPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [pitch, setPitch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDeal = async () => {
    try {
      const response = await api.get(`/store/deals/${id}/public`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load deal');
    }
  };

  useEffect(() => {
    loadDeal();
  }, [id]);

  const apply = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post(`/store/deals/${id}/apply`, { pitch });
      await loadDeal();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit application');
    } finally {
      setSaving(false);
    }
  };

  if (error && !data) {
    return (
      <div className="page-shell">
        <div className="panel p-8 text-center font-bold text-[#a8322b]">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-shell">
        <div className="h-96 animate-pulse rounded-lg border border-ink/10 bg-white" />
      </div>
    );
  }

  const { deal, store, application } = data;
  const storeName = store?.storeProfile?.storeName || store?.name || 'Store';
  const storeCity = store?.storeProfile?.address?.city || deal.requirements?.location || '';
  const spotsRemaining = Math.max(
    0,
    (deal.requirements?.maxCreators || 5) - (deal.stats?.totalAccepted || 0),
  );
  const payAmount = money(deal.flatFeeAmount);

  return (
    <div className="page-shell">
      {/* Sticky header */}
      <div className="sticky top-[74px] z-20 -mx-4 border-b border-ink/10 bg-white/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {store?.storeProfile?.logoImage ? (
              <img
                src={store.storeProfile.logoImage}
                alt={storeName}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4140c8] font-extrabold text-white">
                {storeName.slice(0, 1)}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-ink/45">{storeName}{storeCity ? ` · ${storeCity}` : ''}</p>
              <h1 className="text-xl font-extrabold text-ink">{deal.title}</h1>
            </div>
          </div>
          {application ? (
            application.status === 'accepted' ? (
              <Link to={`/creator/store-visits/${deal._id}`} className="btn-primary">
                Open Workspace
              </Link>
            ) : (
              <span className="rounded-full bg-ink/[0.06] px-4 py-2 text-sm font-bold capitalize text-ink/55">
                {application.status === 'pending' ? 'Applied — Pending' : application.status}
              </span>
            )
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={saving || spotsRemaining <= 0}
              onClick={apply}
            >
              {spotsRemaining <= 0 ? 'Full' : 'Apply Now'}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-4 py-3 text-sm font-bold text-[#a8322b]">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left sidebar — offer summary */}
        <aside className="panel h-fit p-5">
          <p className="label">Offer</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-ink/[0.04] p-3 text-sm font-bold">
              <span>Type</span>
              <span>{OFFER_TYPE_LABELS[deal.offerType] || deal.offerType}</span>
            </div>
            {payAmount && (
              <div className="flex items-center justify-between rounded-lg bg-ink/[0.04] p-3 text-sm font-bold">
                <span>Cash fee</span>
                <span className="text-[#0f7655]">{payAmount}</span>
              </div>
            )}
            {deal.offerDescription ? (
              <div className="rounded-lg bg-ink/[0.04] p-3 text-sm font-bold">
                <span className="block text-ink/45">Offer details</span>
                <span>{deal.offerDescription}</span>
              </div>
            ) : null}
          </div>
          <div className="mt-5 border-t border-ink/10 pt-5">
            <p className="label">Spots remaining</p>
            <p className={`mt-1 text-3xl font-extrabold ${spotsRemaining === 0 ? 'text-[#a8322b]' : 'text-ink'}`}>
              {spotsRemaining}
            </p>
          </div>
          {store?.storeProfile?.averageRating > 0 ? (
            <div className="mt-5 border-t border-ink/10 pt-5">
              <p className="label">Store rating</p>
              <p className="mt-1 text-2xl font-extrabold text-[#f59e0b]">
                ★ {store.storeProfile.averageRating}
                <span className="ml-1 text-sm font-bold text-ink/45">
                  ({store.storeProfile.totalReviews} reviews)
                </span>
              </p>
            </div>
          ) : null}
        </aside>

        {/* Main content */}
        <main className="space-y-5">
          {/* What you need to do */}
          <section className="panel p-5">
            <h2 className="text-xl font-extrabold">What's required</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(deal.deliverables?.reels || 0) > 0 && (
                <div className="rounded-lg border border-ink/10 p-3 font-bold">
                  {deal.deliverables.reels} × Reel{deal.deliverables.reels > 1 ? 's' : ''}
                </div>
              )}
              {(deal.deliverables?.stories || 0) > 0 && (
                <div className="rounded-lg border border-ink/10 p-3 font-bold">
                  {deal.deliverables.stories} × Story
                </div>
              )}
              {(deal.deliverables?.staticPosts || 0) > 0 && (
                <div className="rounded-lg border border-ink/10 p-3 font-bold">
                  {deal.deliverables.staticPosts} × Post{deal.deliverables.staticPosts > 1 ? 's' : ''}
                </div>
              )}
              {deal.deliverables?.googleReview && (
                <div className="rounded-lg border border-ink/10 p-3 font-bold">Google Review</div>
              )}
              {deal.deliverables?.instagramTagRequired && (
                <div className="rounded-lg border border-ink/10 p-3 font-bold">Instagram Tag Required</div>
              )}
              {(deal.requirements?.minFollowers || 0) > 0 && (
                <div className="rounded-lg border border-ink/10 p-3 font-bold">
                  Min {deal.requirements.minFollowers.toLocaleString('en-IN')} followers
                </div>
              )}
            </div>
            {(deal.requirements?.preferredNiches || []).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {deal.requirements.preferredNiches.map((niche) => (
                  <span
                    key={niche}
                    className="rounded-full bg-[#e9ebff] px-3 py-1 text-xs font-bold text-[#4140c8]"
                  >
                    {niche}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Deal brief */}
          {(deal.description || deal.brief) && (
            <section className="panel p-5">
              <h2 className="text-xl font-extrabold">About this deal</h2>
              <p className="mt-3 text-sm leading-6 text-ink/62">{deal.description}</p>
              {deal.brief ? (
                <p className="mt-3 text-sm leading-6 text-ink/62">{deal.brief}</p>
              ) : null}
            </section>
          )}

          {/* Visit slots */}
          {(deal.visitSlots || []).length > 0 && (
            <section className="panel p-5">
              <h2 className="text-xl font-extrabold">Available visit slots</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {deal.visitSlots.map((slot, index) => (
                  <div key={index} className="rounded-lg border border-ink/10 p-3 text-sm font-bold">
                    {slot.date ? new Date(slot.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                    {slot.time ? ` · ${slot.time}` : ''}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* About the store */}
          <section className="panel p-5">
            <h2 className="text-xl font-extrabold">About the store</h2>
            <p className="mt-3 text-sm leading-6 text-ink/60">
              {store?.storeProfile?.description || store?.storeProfile?.storeType || 'Store details will appear here.'}
            </p>
            {storeCity ? (
              <p className="mt-2 text-sm font-bold text-ink/45">📍 {storeCity}</p>
            ) : null}
            {store?.storeProfile?.instagramHandle ? (
              <a
                href={`https://instagram.com/${store.storeProfile.instagramHandle}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex font-bold text-[#4140c8]"
              >
                @{store.storeProfile.instagramHandle}
              </a>
            ) : null}
          </section>

          {/* Application form */}
          {!application ? (
            <section className="panel p-5">
              <h2 className="text-xl font-extrabold">Apply</h2>
              <textarea
                className="field mt-4 min-h-[120px]"
                maxLength={300}
                value={pitch}
                onChange={(event) => setPitch(event.target.value)}
                placeholder="Tell the store why you're a great fit (optional)"
              />
              <button
                type="button"
                className="btn-primary mt-4"
                disabled={saving || spotsRemaining <= 0}
                onClick={apply}
              >
                {spotsRemaining <= 0 ? 'All spots filled' : 'Submit Application'}
              </button>
            </section>
          ) : application.status === 'accepted' ? (
            <Link
              className="btn-primary block text-center"
              to={`/creator/store-visits/${deal._id}`}
            >
              Open Visit Workspace
            </Link>
          ) : null}
        </main>
      </div>
    </div>
  );
};

export default StoreDealDetailPage;
