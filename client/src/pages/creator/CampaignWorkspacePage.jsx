import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import { Badge, daysUntil, deliverableRows, money } from '../../components/campaignUtils';

const tabs = ['brief', 'posts', 'payment'];

const CampaignWorkspacePage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('brief');
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');

  const loadWorkspace = async () => {
    try {
      const response = await api.get(`/campaigns/${id}/workspace`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load workspace');
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [id]);

  const deliverables = useMemo(() => {
    if (!data?.campaign) return [];
    return deliverableRows(data.campaign).flatMap((item) => Array.from({ length: item.count }).map((_, index) => ({
      ...item,
      instance: index + 1,
      id: `${item.apiValue}-${index}`,
    })));
  }, [data]);

  const submit = async (deliverable) => {
    setSaving(deliverable.id);
    setError('');
    try {
      const value = drafts[deliverable.id];
      if (deliverable.apiValue === 'story') {
        const formData = new FormData();
        formData.append('deliverableType', deliverable.apiValue);
        if (value instanceof File) formData.append('screenshotFile', value);
        await api.post(`/campaigns/${id}/posts`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post(`/campaigns/${id}/posts`, { deliverableType: deliverable.apiValue, instagramPostUrl: value });
      }
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit post');
    } finally {
      setSaving('');
    }
  };

  if (error && !data) return <div className="page-shell"><div className="panel p-8 text-center font-bold text-[#a8322b]">{error}</div></div>;
  if (!data) return <div className="page-shell"><div className="h-96 animate-pulse rounded-lg border border-ink/10 bg-white" /></div>;

  const { campaign, application, posts } = data;
  const remaining = daysUntil(campaign.contentDeadline);

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{campaign.brand?.name || 'Brand'}</p>
          <h1 className="mt-4 page-title">{campaign.title}</h1>
          <p className="page-lead">{remaining === null ? 'Content deadline not set' : `${remaining} days to submit content`}</p>
        </div>
        <Badge status={application.status} />
      </div>

      <div className="mt-6 flex gap-2">{tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${tab === item ? 'bg-ink text-white' : 'border border-ink/10 bg-white'}`}>{item === 'posts' ? 'My Posts' : item}</button>)}</div>
      {error ? <div className="mt-5 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-4 py-3 text-sm font-bold text-[#a8322b]">{error}</div> : null}

      {tab === 'brief' ? (
        <section className="panel mt-6 p-5">
          <h2 className="text-xl font-extrabold">Brief</h2>
          <p className="mt-3 text-sm leading-6 text-ink/60">{campaign.brief || campaign.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[...(campaign.requiredHashtags || []), ...(campaign.requiredMentions || [])].map((tag) => <button key={tag} type="button" onClick={() => navigator.clipboard?.writeText(tag)} className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs font-bold">{tag}</button>)}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div><p className="label">Do's</p>{(campaign.dos || []).map((item) => <p key={item} className="mt-2 text-sm font-bold text-[#0f7655]">{item}</p>)}</div>
            <div><p className="label">Don'ts</p>{(campaign.donts || []).map((item) => <p key={item} className="mt-2 text-sm font-bold text-[#a8322b]">{item}</p>)}</div>
          </div>
        </section>
      ) : null}

      {tab === 'posts' ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {deliverables.map((deliverable, index) => {
            const post = posts[index];
            return (
              <article key={deliverable.id} className="panel p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-extrabold">{deliverable.label} {deliverable.instance}</h2>
                  <Badge status={post?.approvalStatus || 'not_submitted'}>{post?.approvalStatus || 'Not Submitted'}</Badge>
                </div>
                {!post ? (
                  <div className="mt-4 space-y-3">
                    {deliverable.apiValue === 'story' ? (
                      <input className="field" type="file" accept="image/*,video/*" onChange={(event) => setDrafts((current) => ({ ...current, [deliverable.id]: event.target.files?.[0] }))} />
                    ) : (
                      <input className="field" placeholder="Paste Instagram post URL" value={drafts[deliverable.id] || ''} onChange={(event) => setDrafts((current) => ({ ...current, [deliverable.id]: event.target.value }))} />
                    )}
                    <button type="button" className="btn-primary" disabled={saving === deliverable.id} onClick={() => submit(deliverable)}>{saving === deliverable.id ? 'Submitting...' : deliverable.apiValue === 'story' ? 'Submit Proof' : 'Submit Post'}</button>
                  </div>
                ) : (
                  <div className="mt-4">
                    {post.stats?.thumbnailUrl || post.screenshotUrl ? <img src={post.stats?.thumbnailUrl || post.screenshotUrl} alt="" className="aspect-video w-full rounded-lg object-cover" /> : null}
                    <p className="mt-3 text-sm font-bold text-ink/55">{post.stats?.likeCount || 0} likes - {post.stats?.commentCount || 0} comments</p>
                    {post.approvalNote ? <p className="mt-2 text-sm font-bold text-[#a8322b]">{post.approvalNote}</p> : null}
                    {post.instagramPostUrl ? <a href={post.instagramPostUrl} target="_blank" rel="noreferrer" className="btn-secondary mt-3">View Instagram</a> : null}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ) : null}

      {tab === 'payment' ? (
        <section className="panel mt-6 p-5">
          <h2 className="text-xl font-extrabold">Payment</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-ink/[0.04] p-4"><p className="label">Total agreed</p><p className="text-2xl font-extrabold">{money(application.totalAgreedAmount)}</p></div>
            <div className="rounded-lg bg-ink/[0.04] p-4"><p className="label">Status</p><Badge status={application.paymentStatus} /></div>
            <div className="rounded-lg bg-ink/[0.04] p-4"><p className="label">Note</p><p className="font-bold">{application.paymentNote || '-'}</p></div>
          </div>
          <p className="mt-5 text-sm font-bold text-ink/45">Payment happens outside the platform.</p>
        </section>
      ) : null}
    </div>
  );
};

export default CampaignWorkspacePage;
