import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import { Badge } from '../../components/campaignUtils';

const TABS = ['applications', 'content', 'analytics', 'deal'];

const money = (v) => `INR ${Number(v || 0).toLocaleString('en-IN')}`;

const StoreDealManagementPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('applications');
  const [appFilter, setAppFilter] = useState('all');
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const { data: result } = await api.get(`/store/deals/${id}`);
      setData(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load deal');
    }
  };

  useEffect(() => { load(); }, [id]);

  const reviewApplication = async (appId, status) => {
    await api.patch(`/store/deals/${id}/applications/${appId}`, { status });
    load();
  };

  const confirmVisit = async (appId) => {
    await api.patch(`/store/deals/${id}/applications/${appId}/visit-confirmed`);
    load();
  };

  const approveSubmission = async (appId, subIndex, approvalStatus) => {
    const note = approvalStatus === 'rejected' ? window.prompt('Feedback for creator?') || '' : '';
    await api.patch(`/store/deals/${id}/applications/${appId}/submissions/${subIndex}/approve`, { approvalStatus, note });
    load();
  };

  const updateStatus = async (status) => {
    await api.patch(`/store/deals/${id}/status`, { status });
    load();
  };

  const filteredApps = useMemo(() => {
    const apps = data?.applications || [];
    return appFilter === 'all' ? apps : apps.filter((a) => a.status === appFilter);
  }, [data, appFilter]);

  const analytics = useMemo(() => {
    if (!data) return null;
    const apps = data.applications || [];
    const totalReach = apps.reduce((sum, a) => sum + a.submissions.reduce((s, sub) => s + (sub.stats?.estimatedReach || 0), 0), 0);
    const totalEngagement = apps.reduce((sum, a) => sum + a.submissions.reduce((s, sub) => s + (sub.stats?.likeCount || 0) + (sub.stats?.commentCount || 0), 0), 0);
    return { totalReach, totalEngagement };
  }, [data]);

  if (error && !data) return <div className="page-shell"><div className="panel p-8 text-center font-bold text-[#a8322b]">{error}</div></div>;
  if (!data) return <div className="page-shell"><div className="h-96 animate-pulse rounded-lg border border-ink/10 bg-white" /></div>;

  const { deal, applications } = data;

  const statusColor = deal.status === 'active' ? 'bg-[#d9f7ec] text-[#0f7655]'
    : deal.status === 'paused' ? 'bg-[#fff1cc] text-[#8a5a00]'
      : deal.status === 'completed' ? 'bg-[#e9ebff] text-[#4140c8]'
        : 'bg-ink/[0.06] text-ink/55';

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title">{deal.title}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold capitalize ${statusColor}`}>{deal.status}</span>
          </div>
          <p className="page-lead">{deal.offerType?.replace('_', ' ')} · {deal.requirements?.location || 'Any city'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {deal.status === 'active' && <button type="button" className="btn-secondary" onClick={() => updateStatus('paused')}>Pause</button>}
          {deal.status === 'paused' && <button type="button" className="btn-secondary" onClick={() => updateStatus('active')}>Resume</button>}
          {['active', 'paused'].includes(deal.status) && <button type="button" className="btn-secondary" onClick={() => updateStatus('completed')}>Mark Complete</button>}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Applications', value: deal.stats?.totalApplications || 0 },
          { label: 'Accepted', value: deal.stats?.totalAccepted || 0 },
          { label: 'Posts Live', value: deal.stats?.totalPostsLive || 0 },
          { label: 'Spots Left', value: Math.max(0, (deal.requirements?.maxCreators || 5) - (deal.stats?.totalAccepted || 0)) },
        ].map((s) => (
          <div key={s.label} className="panel p-4">
            <p className="label">{s.label}</p>
            <p className="text-2xl font-extrabold text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${tab === t ? 'bg-ink text-white' : 'border border-ink/10 bg-white'}`}>
            {t === 'deal' ? 'Deal Details' : t}
          </button>
        ))}
      </div>

      {error ? <div className="mt-5 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-4 py-3 text-sm font-bold text-[#a8322b]">{error}</div> : null}

      {/* Applications Tab */}
      {tab === 'applications' && (
        <section className="panel mt-6 overflow-x-auto p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {['all', 'pending', 'accepted', 'rejected', 'visited', 'completed'].map((f) => (
              <button key={f} type="button" onClick={() => setAppFilter(f)} className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${appFilter === f ? 'bg-ink text-white' : 'bg-ink/[0.06]'}`}>{f}</button>
            ))}
          </div>
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="text-xs uppercase text-ink/45">
              <tr>
                <th className="py-3">Creator</th>
                <th>Followers</th>
                <th>Status</th>
                <th>Pitch</th>
                <th>Submissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app) => (
                <tr key={app._id} className="border-t border-ink/10">
                  <td className="py-3 font-bold">
                    {app.creator?.name || 'Creator'}
                    {app.creator?.instagram_handle && (
                      <p className="text-xs text-ink/45">@{app.creator.instagram_handle}</p>
                    )}
                  </td>
                  <td>{(app.creatorStatsSnapshot?.followerCount || 0).toLocaleString('en-IN')}</td>
                  <td><Badge status={app.status} /></td>
                  <td className="max-w-[180px] truncate text-ink/60">{app.pitch || '—'}</td>
                  <td>{app.submissions?.length || 0} submitted</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5 py-2">
                      {app.status === 'pending' && (
                        <>
                          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => reviewApplication(app._id, 'accepted')}>Accept</button>
                          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => reviewApplication(app._id, 'rejected')}>Reject</button>
                        </>
                      )}
                      {app.status === 'accepted' && !app.visitConfirmed && (
                        <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => confirmVisit(app._id)}>Confirm Visit</button>
                      )}
                      {app.visitConfirmed && <span className="text-xs font-bold text-[#0f7655]">✓ Visited</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredApps.length && (
                <tr><td colSpan={6} className="py-10 text-center text-sm font-bold text-ink/45">No {appFilter !== 'all' ? appFilter : ''} applications yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* Content Tab */}
      {tab === 'content' && (
        <section className="mt-6">
          {applications.filter((a) => a.submissions?.length > 0).length === 0 ? (
            <div className="panel p-8 text-center"><p className="font-bold text-ink/55">No content submitted yet.</p></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {applications.flatMap((app) => app.submissions.map((sub, idx) => (
                <article key={`${app._id}-${idx}`} className="panel overflow-hidden">
                  <div className="aspect-video bg-ink/[0.04]">
                    {sub.screenshotUrl || sub.stats?.thumbnailUrl ? (
                      <img src={sub.screenshotUrl || sub.stats.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : <div className="flex h-full items-center justify-center text-4xl">{sub.type === 'reel' ? '🎬' : sub.type === 'story' ? '📱' : '🖼️'}</div>}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-extrabold">{app.creator?.name || 'Creator'}</p>
                      <Badge status={sub.approvalStatus} />
                    </div>
                    <p className="mt-1 text-xs capitalize text-ink/50">{sub.type?.replace('_', ' ')}</p>
                    {sub.postUrl && <a href={sub.postUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-bold text-[#4140c8] truncate">{sub.postUrl}</a>}
                    {sub.approvalStatus === 'pending' && (
                      <div className="mt-3 flex gap-2">
                        <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => approveSubmission(app._id, idx, 'approved')}>Approve</button>
                        <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => approveSubmission(app._id, idx, 'rejected')}>Reject</button>
                      </div>
                    )}
                  </div>
                </article>
              )))}
            </div>
          )}
        </section>
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && analytics && (
        <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="panel p-5">
            <p className="label">Est. Total Reach</p>
            <p className="text-3xl font-extrabold text-ink">{analytics.totalReach.toLocaleString('en-IN')}</p>
          </div>
          <div className="panel p-5">
            <p className="label">Total Engagement</p>
            <p className="text-3xl font-extrabold text-ink">{analytics.totalEngagement.toLocaleString('en-IN')}</p>
          </div>
          <div className="panel p-5">
            <p className="label">Posts Live</p>
            <p className="text-3xl font-extrabold text-ink">{deal.stats?.totalPostsLive || 0}</p>
          </div>
          <div className="panel sm:col-span-2 lg:col-span-3 p-5">
            <h2 className="mb-4 text-xl font-extrabold">Creator performance</h2>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-ink/45"><tr><th className="py-2">Creator</th><th>Submissions</th><th>Engagement</th><th>Status</th></tr></thead>
              <tbody>
                {applications.map((app) => {
                  const engagement = app.submissions.reduce((sum, s) => sum + (s.stats?.likeCount || 0) + (s.stats?.commentCount || 0), 0);
                  return (
                    <tr key={app._id} className="border-t border-ink/10">
                      <td className="py-2 font-bold">{app.creator?.name || 'Creator'}</td>
                      <td>{app.submissions.length}</td>
                      <td>{engagement}</td>
                      <td><Badge status={app.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Deal Details Tab */}
      {tab === 'deal' && (
        <section className="panel mt-6 space-y-4 p-5">
          <h2 className="text-xl font-extrabold">Deal Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-ink/[0.04] p-4"><p className="label">Offer type</p><p className="font-extrabold capitalize">{deal.offerType?.replace('_', ' ')}</p></div>
            {deal.flatFeeAmount > 0 && <div className="rounded-lg bg-ink/[0.04] p-4"><p className="label">Cash component</p><p className="font-extrabold">{money(deal.flatFeeAmount)}</p></div>}
            <div className="rounded-lg bg-ink/[0.04] p-4"><p className="label">Location</p><p className="font-extrabold">{deal.requirements?.location || 'Any'}</p></div>
            <div className="rounded-lg bg-ink/[0.04] p-4"><p className="label">Max creators</p><p className="font-extrabold">{deal.requirements?.maxCreators}</p></div>
            <div className="rounded-lg bg-ink/[0.04] p-4"><p className="label">Min followers</p><p className="font-extrabold">{(deal.requirements?.minFollowers || 0).toLocaleString('en-IN')}</p></div>
          </div>
          {deal.brief && (
            <div>
              <p className="label mb-2">Brief</p>
              <p className="text-sm leading-6 text-ink/60">{deal.brief}</p>
            </div>
          )}
          {deal.requiredHashtags?.length > 0 && (
            <div>
              <p className="label mb-2">Required hashtags</p>
              <div className="flex flex-wrap gap-2">{deal.requiredHashtags.map((h) => <span key={h} className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs font-bold">{h}</span>)}</div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default StoreDealManagementPage;
