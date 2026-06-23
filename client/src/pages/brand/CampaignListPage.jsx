import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Badge, formatDate, money } from '../../components/campaignUtils';

const tabs = ['all', 'active', 'draft', 'paused', 'completed'];

const CampaignListPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCampaigns = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/campaigns/brand/all${status !== 'all' ? `?status=${status}` : ''}`);
      setCampaigns(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [status]);

  const stats = useMemo(() => campaigns.reduce((sum, campaign) => ({
    active: sum.active + (campaign.status === 'active' ? 1 : 0),
    creators: sum.creators + (campaign.stats?.totalCreatorsAccepted || 0),
    reach: sum.reach + (campaign.stats?.totalReach || 0),
    spend: sum.spend + (campaign.stats?.totalSpend || 0),
  }), { active: 0, creators: 0, reach: 0, spend: 0 }), [campaigns]);

  const updateStatus = async (campaign, nextStatus) => {
    await api.patch(`/campaigns/${campaign._id}/status`, { status: nextStatus });
    loadCampaigns();
  };

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">Campaigns</div>
          <h1 className="mt-4 page-title">My Campaigns</h1>
        </div>
        <Link className="btn-primary w-fit" to="/brand/campaigns/new">New Campaign</Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total Active', stats.active],
          ['Total Creators', stats.creators],
          ['Total Reach This Month', stats.reach.toLocaleString('en-IN')],
          ['Total Spend This Month', money(stats.spend)],
        ].map(([label, value]) => (
          <div key={label} className="panel p-5">
            <p className="label">{label}</p>
            <p className="text-2xl font-extrabold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button key={tab} type="button" onClick={() => setStatus(tab)} className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${status === tab ? 'bg-ink text-white' : 'border border-ink/10 bg-white text-ink/55'}`}>
            {tab}
          </button>
        ))}
      </div>

      {error ? <div className="mt-5 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-4 py-3 text-sm font-bold text-[#a8322b]">{error}</div> : null}

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-lg border border-ink/10 bg-white" />)}
        </div>
      ) : campaigns.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => (
            <article key={campaign._id} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-ink">{campaign.title}</h2>
                  <p className="mt-1 text-sm font-bold text-ink/45">{campaign.productName}</p>
                </div>
                <Badge status={campaign.status} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-ink/[0.04] p-3"><p className="label">Progress</p><p className="font-extrabold">{campaign.stats?.totalPostsLive || 0} / {campaign.totalPostsNeeded || 0} posts live</p></div>
                <div className="rounded-lg bg-ink/[0.04] p-3"><p className="label">Creators</p><p className="font-extrabold">{campaign.stats?.totalCreatorsAccepted || 0}</p></div>
                <div className="rounded-lg bg-ink/[0.04] p-3"><p className="label">Budget per creator</p><p className="font-extrabold">{money(campaign.budgetPerCreator)}</p></div>
                <div className="rounded-lg bg-ink/[0.04] p-3"><p className="label">Apply by</p><p className="font-extrabold">{formatDate(campaign.applicationDeadline)}</p></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link className="btn-primary" to={`/brand/campaigns/${campaign._id}/dashboard`}>View Dashboard</Link>
                {campaign.status === 'draft' ? <Link className="btn-secondary" to={`/brand/campaigns/${campaign._id}/edit`}>Edit</Link> : null}
                {campaign.status === 'active' ? <button type="button" className="btn-secondary" onClick={() => updateStatus(campaign, 'paused')}>Pause</button> : null}
                {campaign.status === 'paused' ? <button type="button" className="btn-secondary" onClick={() => updateStatus(campaign, 'active')}>Resume</button> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel mt-6 p-8 text-center">
          <h2 className="text-2xl font-extrabold text-ink">No campaigns yet</h2>
          <p className="mt-2 text-sm text-ink/55">Create a brief and start inviting creators.</p>
          <Link className="btn-primary mt-5" to="/brand/campaigns/new">New Campaign</Link>
        </div>
      )}
    </div>
  );
};

export default CampaignListPage;
