import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { daysUntil, deliverableRows, money, niches } from '../../components/campaignUtils';
import RecommendedCampaignCard from '../../components/RecommendedCampaignCard';
import { useAuth } from '../../context/AuthContext';
import useRecommendations from '../../hooks/useRecommendations';

const OFFER_TYPE_LABELS = {
  free_meal: '🍽️ Free Meal',
  flat_fee: '💰 Flat Fee',
  discount_voucher: '🎟️ Voucher',
  combo: '🤝 Meal + Fee',
};

const StoreDealCard = ({ deal, onApply }) => {
  const applied = deal.applicationStatus;
  const spotsLeft = deal.spotsRemaining ?? deal.requirements?.maxCreators ?? 5;

  return (
    <article className="panel p-5">
      <div className="flex gap-4">
        {deal.storeInfo?.logoImage ? (
          <img src={deal.storeInfo.logoImage} alt={deal.storeInfo.storeName} className="h-14 w-14 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#4140c8] text-xl font-extrabold text-white">
            {(deal.storeInfo?.storeName || deal.title || 'S').slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-extrabold text-ink">
            {deal.storeInfo?.storeName || 'Store'}
            {deal.storeInfo?.storeVerified && <span className="ml-1.5 text-[#4140c8]">✓</span>}
          </p>
          <p className="text-sm font-bold text-ink/45">{deal.storeInfo?.city || deal.requirements?.location || 'Local'}</p>
        </div>
      </div>

      <h2 className="mt-4 text-xl font-extrabold text-ink">{deal.title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/60 line-clamp-2">{deal.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-[#e9ebff] px-3 py-1 text-xs font-bold text-[#4140c8]">
          {OFFER_TYPE_LABELS[deal.offerType] || deal.offerType}
        </span>
        {deal.flatFeeAmount > 0 && (
          <span className="rounded-full bg-[#d9f7ec] px-3 py-1 text-xs font-bold text-[#0f7655]">
            {money(deal.flatFeeAmount)} cash
          </span>
        )}
        {deal.deliverables?.reels > 0 && <span className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs font-bold">{deal.deliverables.reels} Reel{deal.deliverables.reels > 1 ? 's' : ''}</span>}
        {deal.deliverables?.stories > 0 && <span className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs font-bold">{deal.deliverables.stories} Story</span>}
        {deal.deliverables?.staticPosts > 0 && <span className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs font-bold">{deal.deliverables.staticPosts} Post{deal.deliverables.staticPosts > 1 ? 's' : ''}</span>}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-ink/45">{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} remaining</p>
        {deal.storeInfo?.averageRating > 0 && (
          <p className="text-xs font-bold text-[#f59e0b]">★ {deal.storeInfo.averageRating} ({deal.storeInfo.totalReviews})</p>
        )}
      </div>

      <div className="mt-4">
        {applied ? (
          applied === 'accepted' ? (
            <Link to={`/creator/store-visits/${deal._id}`} className="btn-primary w-full">Open Workspace</Link>
          ) : (
            <button type="button" disabled className="btn-secondary w-full capitalize">{applied === 'pending' ? 'Applied — Pending' : applied}</button>
          )
        ) : spotsLeft <= 0 ? (
          <button type="button" disabled className="btn-secondary w-full">Full</button>
        ) : (
          <Link to={`/creator/store-deals/${deal._id}`} className="btn-primary w-full">View Deal</Link>
        )}
      </div>
    </article>
  );
};

const DealDiscoveryPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('brand');
  // Brand campaigns state
  const [campaigns, setCampaigns] = useState([]);
  const [filters, setFilters] = useState({ contentType: '', niche: '', location: '', minPay: '', maxPay: '', sort: 'newest' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { recommendations, loading: recommendationsLoading, registerView, trackEvent } = useRecommendations(20);

  // Store deals state
  const [storeDeals, setStoreDeals] = useState([]);
  const [storeFilters, setStoreFilters] = useState({ city: '', niche: '', offerType: '', minPay: '', sort: 'newest' });
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    setLoading(true);
    api.get(`/campaigns/discover?${params.toString()}`)
      .then(({ data }) => setCampaigns(data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load deals'))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    if (activeTab !== 'store') return;
    const params = new URLSearchParams();
    Object.entries(storeFilters).forEach(([key, value]) => { if (value) params.set(key, value); });
    setStoreLoading(true);
    api.get(`/store/discover?${params.toString()}`)
      .then(({ data }) => setStoreDeals(data))
      .catch((err) => setStoreError(err.response?.data?.message || 'Could not load store deals'))
      .finally(() => setStoreLoading(false));
  }, [activeTab, storeFilters]);

  const update = (key, value) => setFilters((c) => ({ ...c, [key]: value }));
  const updateStore = (key, value) => setStoreFilters((c) => ({ ...c, [key]: value }));

  return (
    <div className="page-shell">
      <div className="border-b border-ink/10 pb-6">
        <div className="eyebrow">Creator Deals</div>
        <h1 className="mt-4 page-title">Open Deals</h1>
      </div>

      {/* Tab switcher */}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('brand')}
          className={`rounded-full px-5 py-2 text-sm font-bold transition ${activeTab === 'brand' ? 'bg-ink text-white' : 'border border-ink/10 bg-white text-ink/55'}`}
        >
          Brand Campaigns
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('store')}
          className={`rounded-full px-5 py-2 text-sm font-bold transition ${activeTab === 'store' ? 'bg-ink text-white' : 'border border-ink/10 bg-white text-ink/55'}`}
        >
          Store Visits ☕
        </button>
      </div>

      {/* Brand Campaigns Tab */}
      {activeTab === 'brand' && (
        <>
          {recommendations.length ? (
            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-extrabold text-ink">Deals you&apos;ll love</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {recommendations.slice(0, 5).map((recommendation) => (
                  <RecommendedCampaignCard
                    key={recommendation.targetId}
                    recommendation={recommendation}
                    registerView={registerView}
                    onTrack={trackEvent}
                  />
                ))}
              </div>
            </section>
          ) : recommendationsLoading ? (
            <div className="mt-6 flex gap-4 overflow-hidden">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-72 min-w-[18rem] animate-pulse rounded-lg border border-ink/10 bg-white" />
              ))}
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 rounded-lg border border-ink/10 bg-white/85 p-4 lg:grid-cols-6">
            <select className="field" value={filters.contentType} onChange={(e) => update('contentType', e.target.value)}>
              <option value="">Any content</option>
              <option value="reel">Reels</option>
              <option value="story">Stories</option>
              <option value="static_post">Static Posts</option>
            </select>
            <input className="field" type="number" placeholder="Min pay" value={filters.minPay} onChange={(e) => update('minPay', e.target.value)} />
            <input className="field" type="number" placeholder="Max pay" value={filters.maxPay} onChange={(e) => update('maxPay', e.target.value)} />
            <select className="field" value={filters.niche} onChange={(e) => update('niche', e.target.value)}>
              <option value="">All niches</option>
              {niches.map((niche) => <option key={niche} value={niche}>{niche}</option>)}
            </select>
            <input className="field" placeholder="Location" value={filters.location} onChange={(e) => update('location', e.target.value)} />
            <select className="field" value={filters.sort} onChange={(e) => update('sort', e.target.value)}>
              <option value="newest">Newest</option>
              <option value="highest_pay">Highest Pay</option>
              <option value="deadline">Deadline Soonest</option>
            </select>
          </div>

          {error ? <div className="mt-5 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-4 py-3 text-sm font-bold text-[#a8322b]">{error}</div> : null}

          {loading ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-lg border border-ink/10 bg-white" />)}</div>
          ) : campaigns.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {campaigns.map((campaign) => {
                const minFollowers = campaign.requirements?.minFollowers || 0;
                const followerCount = user?.follower_count || 0;
                const blocked = minFollowers > followerCount;
                const endsIn = daysUntil(campaign.applicationDeadline);
                return (
                  <article key={campaign._id} className={`panel p-5 ${blocked ? 'opacity-60' : ''}`}>
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-lg font-extrabold text-white">
                        {(campaign.brandProfile?.displayName || campaign.brand?.name || 'B').slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-ink">{campaign.brandProfile?.displayName || campaign.brand?.name || 'Brand'}</p>
                        <p className="text-sm font-bold text-ink/45">{campaign.brandProfile?.brandCategory || 'Brand campaign'}</p>
                      </div>
                    </div>
                    <h2 className="mt-5 text-2xl font-extrabold text-ink">{campaign.title}</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {deliverableRows(campaign).map((item) => <span key={item.key} className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs font-bold">{item.label} x {item.count}</span>)}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="label">Pay per creator</p>
                        <p className="text-2xl font-extrabold text-[#0f7655]">{money(campaign.budgetPerCreator)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${endsIn !== null && endsIn < 3 ? 'bg-[#ffe1df] text-[#a8322b]' : 'bg-ink/[0.06] text-ink/55'}`}>
                        {endsIn === null ? 'Deadline open' : `Ends in ${endsIn} days`}
                      </span>
                    </div>
                    <div className="mt-5">
                      {blocked ? (
                        <button type="button" disabled className="btn-secondary w-full">Requires {minFollowers.toLocaleString('en-IN')} followers</button>
                      ) : (
                        <Link className="btn-primary w-full" to={`/creator/deals/${campaign._id}`}>View Deal</Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="panel mt-6 p-8 text-center">
              <h2 className="text-2xl font-extrabold">No open deals match your filters</h2>
            </div>
          )}
        </>
      )}

      {/* Store Deals Tab */}
      {activeTab === 'store' && (
        <>
          <div className="mt-6 grid gap-3 rounded-lg border border-ink/10 bg-white/85 p-4 lg:grid-cols-5">
            <input className="field" placeholder="City" value={storeFilters.city} onChange={(e) => updateStore('city', e.target.value)} />
            <select className="field" value={storeFilters.niche} onChange={(e) => updateStore('niche', e.target.value)}>
              <option value="">All niches</option>
              {niches.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select className="field" value={storeFilters.offerType} onChange={(e) => updateStore('offerType', e.target.value)}>
              <option value="">Any offer</option>
              <option value="free_meal">Free Meal</option>
              <option value="flat_fee">Flat Fee</option>
              <option value="discount_voucher">Voucher</option>
              <option value="combo">Combo</option>
            </select>
            <input className="field" type="number" placeholder="Min cash (INR)" value={storeFilters.minPay} onChange={(e) => updateStore('minPay', e.target.value)} />
            <select className="field" value={storeFilters.sort} onChange={(e) => updateStore('sort', e.target.value)}>
              <option value="newest">Newest</option>
              <option value="highest_value">Highest Value</option>
              <option value="most_slots">Most Slots</option>
            </select>
          </div>

          {storeError ? <div className="mt-5 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-4 py-3 text-sm font-bold text-[#a8322b]">{storeError}</div> : null}

          {storeLoading ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-lg border border-ink/10 bg-white" />)}</div>
          ) : storeDeals.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {storeDeals.map((deal) => <StoreDealCard key={deal._id} deal={deal} />)}
            </div>
          ) : (
            <div className="panel mt-6 p-8 text-center">
              <h2 className="text-2xl font-extrabold">No store deals in your area yet</h2>
              <p className="mt-2 text-ink/55">Try adjusting your city filter or check back soon.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DealDiscoveryPage;
