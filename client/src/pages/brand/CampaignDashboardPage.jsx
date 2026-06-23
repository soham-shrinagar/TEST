import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { Badge, daysUntil, deliverableRows, formatDate, money } from '../../components/campaignUtils';
import RecommendedCreatorCard from '../../components/RecommendedCreatorCard';

const tabs = ['overview', 'creators', 'content', 'analytics', 'payments'];

const Stat = ({ label, value, sub }) => (
  <div className="panel p-4">
    <p className="label">{label}</p>
    <p className="text-2xl font-extrabold text-ink">{value}</p>
    {sub ? <p className="mt-1 text-xs font-bold text-ink/45">{sub}</p> : null}
  </div>
);

const CampaignDashboardPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [contentFilter, setContentFilter] = useState('all');
  const [error, setError] = useState('');
  const [suggestedCreators, setSuggestedCreators] = useState([]);
  const [suggestionsHidden, setSuggestionsHidden] = useState(() => localStorage.getItem(`campaign-${id}-hide-suggestions`) === 'true');

  const loadDashboard = async () => {
    setError('');
    try {
      const response = await api.get(`/campaigns/${id}/dashboard`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load dashboard');
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [id]);

  useEffect(() => {
    if (suggestionsHidden) return;
    api.get(`/recommendations/campaign/${id}?limit=3`)
      .then(({ data: response }) => setSuggestedCreators(response.recommendations || []))
      .catch(() => setSuggestedCreators([]));
  }, [id, suggestionsHidden]);

  const campaign = data?.campaign;
  const applications = data?.applications || [];
  const posts = data?.posts || [];
  const remainingDays = daysUntil(campaign?.contentDeadline);

  const filteredApplications = applications.filter((application) => creatorFilter === 'all' || application.status === creatorFilter);
  const filteredPosts = posts.filter((post) => contentFilter === 'all' || post.approvalStatus === contentFilter);
  const topPosts = [...posts].sort((a, b) => ((b.stats?.likeCount || 0) + (b.stats?.commentCount || 0)) - ((a.stats?.likeCount || 0) + (a.stats?.commentCount || 0))).slice(0, 3);

  const analytics = useMemo(() => {
    const engagementByCreator = applications.map((application) => {
      const creatorPosts = posts.filter((post) => post.creator?._id === application.creator?._id);
      return {
        name: application.profile?.displayName || application.creator?.name || 'Creator',
        engagement: creatorPosts.reduce((sum, post) => sum + (post.stats?.likeCount || 0) + (post.stats?.commentCount || 0), 0),
      };
    });
    const maxEngagement = Math.max(...engagementByCreator.map((item) => item.engagement), 1);
    return { engagementByCreator, maxEngagement };
  }, [applications, posts]);

  const updateStatus = async (status) => {
    await api.patch(`/campaigns/${id}/status`, { status });
    loadDashboard();
  };

  const reviewApplication = async (application, status) => {
    const rejectionReason = status === 'rejected' ? window.prompt('Reason for rejection?') || '' : '';
    await api.patch(`/campaigns/${id}/applications/${application._id}`, {
      status,
      rejectionReason,
      agreedRates: application.agreedRates,
    });
    loadDashboard();
  };

  const reviewPost = async (post, approvalStatus) => {
    const approvalNote = approvalStatus === 'rejected' ? window.prompt('Feedback for creator?') || '' : '';
    await api.patch(`/campaigns/${id}/posts/${post._id}/approve`, { approvalStatus, approvalNote });
    loadDashboard();
  };

  const updatePayment = async (application, paymentStatus) => {
    const paymentNote = window.prompt('Payment note') || '';
    await api.patch(`/campaigns/${id}/applications/${application._id}/payment`, { paymentStatus, paymentNote });
    loadDashboard();
  };

  const inviteSuggestedCreator = async (recommendation) => {
    await api.post(`/campaigns/${id}/invite/${recommendation.targetId}`);
    setSuggestedCreators((current) => current.filter((item) => item.targetId !== recommendation.targetId));
    loadDashboard();
  };

  const dismissSuggestions = () => {
    localStorage.setItem(`campaign-${id}-hide-suggestions`, 'true');
    setSuggestionsHidden(true);
  };

  if (error) return <div className="page-shell"><div className="panel p-8 text-center font-bold text-[#a8322b]">{error}</div></div>;
  if (!campaign) return <div className="page-shell"><div className="h-96 animate-pulse rounded-lg border border-ink/10 bg-white" /></div>;

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title">{campaign.title}</h1>
            <Badge status={campaign.status} />
          </div>
          <p className="page-lead">{campaign.productName} campaign dashboard</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-secondary" to={`/brand/campaigns/${id}/edit`}>Edit</Link>
          {campaign.status === 'active' ? <button className="btn-secondary" type="button" onClick={() => updateStatus('paused')}>Pause</button> : null}
          <button className="btn-secondary" type="button" onClick={() => updateStatus('completed')}>Complete</button>
          <button className="btn-secondary" type="button" onClick={() => updateStatus('cancelled')}>Cancel</button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total Reach" value={(campaign.stats?.totalReach || 0).toLocaleString('en-IN')} />
        <Stat label="Posts Live" value={campaign.stats?.totalPostsLive || 0} />
        <Stat label="Engagement" value={campaign.stats?.totalEngagement || 0} />
        <Stat label="Budget Spent" value={money(campaign.stats?.totalSpend)} sub={`of ${money(campaign.totalBudget)}`} />
        <Stat label="Days Remaining" value={remainingDays === null ? 'Not set' : remainingDays} sub={formatDate(campaign.contentDeadline)} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${tab === item ? 'bg-ink text-white' : 'border border-ink/10 bg-white text-ink/55'}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <section className="panel p-5 lg:col-span-2">
            <h2 className="text-xl font-extrabold">Recent activity</h2>
            <div className="mt-4 space-y-3">
              {[...applications, ...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8).map((item) => (
                <div key={item._id} className="rounded-lg bg-ink/[0.04] p-3 text-sm font-bold text-ink/60">
                  {item.pitch !== undefined ? `${item.creator?.name || 'Creator'} ${item.status} application` : `${item.creator?.name || 'Creator'} submitted ${item.deliverableType}`}
                </div>
              ))}
            </div>
          </section>
          <section className="panel p-5">
            <h2 className="text-xl font-extrabold">Top posts</h2>
            <div className="mt-4 space-y-3">
              {topPosts.map((post) => (
                <div key={post._id} className="rounded-lg border border-ink/10 p-3">
                  <p className="font-bold">{post.creator?.name || 'Creator'}</p>
                  <p className="text-sm text-ink/50">{(post.stats?.likeCount || 0) + (post.stats?.commentCount || 0)} engagements</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'creators' ? (
        <section id="creators" className="panel mt-6 overflow-x-auto p-5">
          {!suggestionsHidden && suggestedCreators.length ? (
            <div className="mb-5 rounded-lg border border-ink/10 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-extrabold text-ink">Suggested creators to invite</h2>
                <button type="button" onClick={dismissSuggestions} className="btn-secondary text-sm">Dismiss</button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {suggestedCreators.map((recommendation) => (
                  <RecommendedCreatorCard
                    key={recommendation.targetId}
                    recommendation={recommendation}
                    compact
                    action={(
                      <button type="button" onClick={() => inviteSuggestedCreator(recommendation)} className="btn-secondary text-sm">
                        Invite
                      </button>
                    )}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div className="mb-4 flex flex-wrap gap-2">
            {['all', 'pending', 'accepted', 'rejected'].map((item) => <button key={item} type="button" onClick={() => setCreatorFilter(item)} className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${creatorFilter === item ? 'bg-ink text-white' : 'bg-ink/[0.06]'}`}>{item}</button>)}
          </div>
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase text-ink/45"><tr><th className="py-3">Creator</th><th>Followers</th><th>Engagement</th><th>Status</th><th>Posts</th><th>Amount</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredApplications.map((application) => {
                const creatorPosts = posts.filter((post) => post.application === application._id);
                return (
                  <tr key={application._id} className="border-t border-ink/10">
                    <td className="py-3 font-bold">{application.profile?.displayName || application.creator?.name || 'Creator'}</td>
                    <td>{application.creatorStatsSnapshot?.followerCount || 0}</td>
                    <td>{application.creatorStatsSnapshot?.engagementRate || 0}%</td>
                    <td><Badge status={application.status} /></td>
                    <td>{creatorPosts.length} / {deliverableRows(campaign).reduce((sum, item) => sum + item.count, 0)}</td>
                    <td>{money(application.totalAgreedAmount)}</td>
                    <td className="flex gap-2 py-2">
                      {application.status === 'pending' ? (
                        <>
                          <button className="btn-secondary px-3 py-1.5" type="button" onClick={() => reviewApplication(application, 'accepted')}>Accept</button>
                          <button className="btn-secondary px-3 py-1.5" type="button" onClick={() => reviewApplication(application, 'rejected')}>Reject</button>
                        </>
                      ) : null}
                      {application.status === 'accepted' ? <button className="btn-secondary px-3 py-1.5" type="button" onClick={() => updatePayment(application, 'paid')}>Mark Paid</button> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === 'content' ? (
        <section id="content" className="mt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {['all', 'pending', 'approved', 'rejected', 'live'].map((item) => <button key={item} type="button" onClick={() => setContentFilter(item)} className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${contentFilter === item ? 'bg-ink text-white' : 'bg-white border border-ink/10'}`}>{item}</button>)}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredPosts.map((post) => (
              <article key={post._id} className="panel overflow-hidden">
                <div className="aspect-video bg-ink/[0.04]">
                  {post.stats?.thumbnailUrl || post.screenshotUrl ? <img src={post.stats?.thumbnailUrl || post.screenshotUrl} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-extrabold">{post.creator?.name || 'Creator'}</p>
                    <Badge status={post.approvalStatus} />
                  </div>
                  <p className="mt-2 text-sm capitalize text-ink/50">{post.deliverableType.replace('_', ' ')}</p>
                  <p className="mt-3 text-sm font-bold text-ink/55">{post.stats?.likeCount || 0} likes - {post.stats?.commentCount || 0} comments</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.approvalStatus === 'pending' ? (
                      <>
                        <button className="btn-secondary px-3 py-1.5" type="button" onClick={() => reviewPost(post, 'approved')}>Approve</button>
                        <button className="btn-secondary px-3 py-1.5" type="button" onClick={() => reviewPost(post, 'rejected')}>Reject</button>
                      </>
                    ) : null}
                    {post.instagramPostUrl ? <a className="btn-secondary px-3 py-1.5" href={post.instagramPostUrl} target="_blank" rel="noreferrer">View Instagram</a> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'analytics' ? (
        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="panel p-5">
            <h2 className="text-xl font-extrabold">Engagement per creator</h2>
            <div className="mt-4 space-y-3">
              {analytics.engagementByCreator.map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm font-bold"><span>{item.name}</span><span>{item.engagement}</span></div>
                  <div className="mt-1 h-3 rounded-full bg-ink/[0.06]"><div className="h-3 rounded-full bg-[#00a889]" style={{ width: `${Math.max((item.engagement / analytics.maxEngagement) * 100, 4)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-5">
            <h2 className="text-xl font-extrabold">Summary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Stat label="Avg engagement" value={campaign.stats?.totalPostsLive ? Math.round(campaign.stats.totalEngagement / campaign.stats.totalPostsLive) : 0} />
              <Stat label="Cost per engagement" value={campaign.stats?.totalEngagement ? money(campaign.stats.totalSpend / campaign.stats.totalEngagement) : money(0)} />
              <Stat label="Best creator" value={analytics.engagementByCreator.sort((a, b) => b.engagement - a.engagement)[0]?.name || 'None'} />
              <Stat label="Best post" value={topPosts[0]?.creator?.name || 'None'} />
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'payments' ? (
        <section className="panel mt-6 overflow-x-auto p-5">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Total Agreed" value={money(data.paymentSummary?.totalAgreed)} />
            <Stat label="Total Paid" value={money(data.paymentSummary?.totalPaid)} />
            <Stat label="Total Pending" value={money(data.paymentSummary?.totalPending)} />
          </div>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-ink/45"><tr><th className="py-3">Creator</th><th>Posts Live</th><th>Agreed</th><th>Status</th><th>Note</th><th>Actions</th></tr></thead>
            <tbody>
              {applications.filter((application) => application.status === 'accepted').map((application) => (
                <tr key={application._id} className="border-t border-ink/10">
                  <td className="py-3 font-bold">{application.profile?.displayName || application.creator?.name || 'Creator'}</td>
                  <td>{posts.filter((post) => post.application === application._id && post.approvalStatus === 'live').length}</td>
                  <td>{money(application.totalAgreedAmount)}</td>
                  <td><Badge status={application.paymentStatus} /></td>
                  <td>{application.paymentNote || '-'}</td>
                  <td className="flex gap-2 py-2">
                    <button className="btn-secondary px-3 py-1.5" type="button" onClick={() => updatePayment(application, 'partial')}>Partial</button>
                    <button className="btn-secondary px-3 py-1.5" type="button" onClick={() => updatePayment(application, 'paid')}>Paid</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
};

export default CampaignDashboardPage;
