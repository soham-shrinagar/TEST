import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Badge } from '../../components/campaignUtils';

const STORE_STATUS_STEPS = {
  pending: { label: 'Awaiting review', next: 'Wait for store to accept your application.' },
  accepted: { label: 'Accepted! Book your visit', next: 'Coordinate with the store to schedule your visit.' },
  rejected: { label: 'Not selected', next: '' },
  visited: { label: 'Visited — Submit content', next: 'You\'ve visited! Now submit your content via the workspace.' },
  completed: { label: 'Completed', next: 'Deal done! You can leave a review.' },
};

const OFFER_TYPE_LABELS = {
  free_meal: '🍽️ Free Meal',
  flat_fee: '💰 Flat Fee',
  discount_voucher: '🎟️ Voucher',
  combo: '🤝 Meal + Fee',
};

const StoreVisitCard = ({ application }) => {
  const deal = application.storeDeal;
  const store = deal?.store;
  const step = STORE_STATUS_STEPS[application.status] || { label: application.status };

  return (
    <article className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#4140c8] text-xl font-extrabold text-white">
        {(store?.storeProfile?.storeName || 'S').slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-extrabold text-ink">{store?.storeProfile?.storeName || 'Store'}</p>
          <Badge status={application.status} />
        </div>
        <p className="text-sm font-bold text-ink/45">{deal?.title || 'Store Visit Deal'}</p>
        {deal?.offerType && (
          <p className="mt-1 text-xs text-ink/50">{OFFER_TYPE_LABELS[deal.offerType] || deal.offerType}</p>
        )}
        <p className="mt-2 text-sm font-bold text-ink/60">{step.label}</p>
        {step.next && <p className="mt-1 text-xs text-ink/45">{step.next}</p>}
      </div>
      <Link
        to={`/creator/store-visits/${deal?._id}`}
        className="btn-secondary shrink-0 self-start px-4 py-2"
      >
        Open Workspace
      </Link>
    </article>
  );
};

// We can't import MyCampaignsPage original (it IS this file) — we inline both tabs.
// So this replaces MyCampaignsPage fully with both Brand Campaigns + Store Visits tabs.

const CampaignStatusSteps = {
  pending: { label: 'Application pending', next: 'Waiting for brand to review your application.' },
  accepted: { label: 'Application accepted!', next: 'Check your workspace for deliverable submission.' },
  rejected: { label: 'Application rejected', next: '' },
  completed: { label: 'Campaign completed', next: 'Well done.' },
};

const MyCampaignsPage = () => {
  const [tab, setTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [storeVisits, setStoreVisits] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/campaigns/mine')
      .then(({ data }) => setCampaigns(data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load campaigns'))
      .finally(() => setCampaignsLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'stores') return;
    setVisitsLoading(true);
    api.get('/store/creator/visits')
      .then(({ data }) => setStoreVisits(data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load store visits'))
      .finally(() => setVisitsLoading(false));
  }, [tab]);

  return (
    <div className="page-shell">
      <div className="border-b border-ink/10 pb-6">
        <div className="eyebrow">Creator</div>
        <h1 className="mt-4 page-title">My Work</h1>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('campaigns')}
          className={`rounded-full px-5 py-2 text-sm font-bold transition ${tab === 'campaigns' ? 'bg-ink text-white' : 'border border-ink/10 bg-white'}`}
        >
          Brand Campaigns
        </button>
        <button
          type="button"
          onClick={() => setTab('stores')}
          className={`rounded-full px-5 py-2 text-sm font-bold transition ${tab === 'stores' ? 'bg-ink text-white' : 'border border-ink/10 bg-white'}`}
        >
          Store Visits ☕
        </button>
      </div>

      {error ? <div className="mt-5 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-4 py-3 text-sm font-bold text-[#a8322b]">{error}</div> : null}

      {/* Brand Campaigns Tab */}
      {tab === 'campaigns' && (
        <section className="mt-6">
          {campaignsLoading ? (
            <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-lg border border-ink/10 bg-white" />)}</div>
          ) : campaigns.length ? (
            <div className="space-y-4">
              {campaigns.map((application) => {
                const step = CampaignStatusSteps[application.status] || { label: application.status };
                return (
                  <article key={application._id} className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-xl font-extrabold text-white">
                      {(application.campaign?.title || 'C').slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-ink">{application.campaign?.title || 'Campaign'}</p>
                      <p className="text-sm text-ink/45">{application.campaign?.brand?.name || 'Brand'}</p>
                      <p className="mt-2 text-sm font-bold text-ink/60">{step.label}</p>
                      {step.next && <p className="mt-1 text-xs text-ink/45">{step.next}</p>}
                    </div>
                    {application.status === 'accepted' && (
                      <Link to={`/creator/campaigns/${application._id}/workspace`} className="btn-secondary shrink-0 self-start px-4 py-2">Workspace</Link>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="panel p-8 text-center">
              <p className="text-2xl font-extrabold">No campaign applications yet</p>
              <Link to="/creator/deals" className="btn-primary mt-4 inline-flex">Browse Deals</Link>
            </div>
          )}
        </section>
      )}

      {/* Store Visits Tab */}
      {tab === 'stores' && (
        <section className="mt-6">
          {visitsLoading ? (
            <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-lg border border-ink/10 bg-white" />)}</div>
          ) : storeVisits.length ? (
            <div className="space-y-4">
              {storeVisits.map((application) => <StoreVisitCard key={application._id} application={application} />)}
            </div>
          ) : (
            <div className="panel p-8 text-center">
              <p className="text-2xl font-extrabold">No store visits yet</p>
              <Link to="/creator/deals" className="btn-primary mt-4 inline-flex">Find Store Deals</Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default MyCampaignsPage;
