import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { Badge, deliverableRows, formatDate, money, totalPerCreator } from '../../components/campaignUtils';

const DealDetailPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [pitch, setPitch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDeal = async () => {
    try {
      const response = await api.get(`/campaigns/${id}/public`);
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
      await api.post(`/campaigns/${id}/apply`, { pitch });
      await loadDeal();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit application');
    } finally {
      setSaving(false);
    }
  };

  if (error && !data) return <div className="page-shell"><div className="panel p-8 text-center font-bold text-[#a8322b]">{error}</div></div>;
  if (!data) return <div className="page-shell"><div className="h-96 animate-pulse rounded-lg border border-ink/10 bg-white" /></div>;

  const { campaign, brandProfile, application } = data;
  const rows = deliverableRows(campaign);

  return (
    <div className="page-shell">
      <div className="sticky top-[74px] z-20 -mx-4 border-b border-ink/10 bg-white/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink font-extrabold text-white">{(brandProfile?.displayName || campaign.brand?.name || 'B').slice(0, 1)}</div>
            <div>
              <p className="text-sm font-bold text-ink/45">{brandProfile?.displayName || campaign.brand?.name || 'Brand'}</p>
              <h1 className="text-xl font-extrabold text-ink">{campaign.title}</h1>
            </div>
          </div>
          {application ? <Badge status={application.status}>{application.status === 'pending' ? 'Applied' : application.status}</Badge> : <button type="button" className="btn-primary" disabled={saving} onClick={apply}>Apply Now</button>}
        </div>
      </div>

      {error ? <div className="mt-5 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-4 py-3 text-sm font-bold text-[#a8322b]">{error}</div> : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="panel h-fit p-5">
          <p className="label">Pay breakdown</p>
          <div className="mt-4 space-y-3">
            {rows.map((item) => <div key={item.key} className="flex justify-between rounded-lg bg-ink/[0.04] p-3 text-sm font-bold"><span>{item.label}: {money(item.rate)} x {item.count}</span><span>{money(item.rate * item.count)}</span></div>)}
          </div>
          <div className="mt-5 border-t border-ink/10 pt-5">
            <p className="label">Total potential</p>
            <p className="text-3xl font-extrabold text-[#0f7655]">{money(totalPerCreator(campaign))}</p>
          </div>
        </aside>

        <main className="space-y-5">
          <section className="panel p-5">
            <h2 className="text-xl font-extrabold">What's required</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {rows.map((item) => <div key={item.key} className="rounded-lg border border-ink/10 p-3 font-bold">{item.count} x {item.label}</div>)}
              <div className="rounded-lg border border-ink/10 p-3 font-bold">Post by {formatDate(campaign.contentDeadline)}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[...(campaign.requiredHashtags || []), ...(campaign.requiredMentions || [])].map((tag) => <span key={tag} className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs font-bold">{tag}</span>)}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="text-xl font-extrabold">Campaign brief</h2>
            <p className="mt-3 text-sm leading-6 text-ink/62">{campaign.description}</p>
            <p className="mt-3 text-sm leading-6 text-ink/62">{campaign.brief}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><p className="label">Do's</p>{(campaign.dos || []).map((item) => <p key={item} className="mt-2 text-sm font-bold text-[#0f7655]">{item}</p>)}</div>
              <div><p className="label">Don'ts</p>{(campaign.donts || []).map((item) => <p key={item} className="mt-2 text-sm font-bold text-[#a8322b]">{item}</p>)}</div>
            </div>
            {(campaign.referenceLinks || []).map((link) => <a key={link} className="mt-3 block text-sm font-bold text-[#4140c8]" href={link} target="_blank" rel="noreferrer">{link}</a>)}
          </section>

          <section className="panel p-5">
            <h2 className="text-xl font-extrabold">About the brand</h2>
            <p className="mt-3 text-sm leading-6 text-ink/60">{brandProfile?.bio || brandProfile?.brandCategory || 'Brand profile details will appear here.'}</p>
            {brandProfile?.website ? <a href={brandProfile.website} target="_blank" rel="noreferrer" className="mt-3 inline-flex font-bold text-[#4140c8]">{brandProfile.website}</a> : null}
          </section>

          {!application ? (
            <section className="panel p-5">
              <h2 className="text-xl font-extrabold">Application</h2>
              <textarea className="field mt-4 min-h-[120px]" maxLength={300} value={pitch} onChange={(event) => setPitch(event.target.value)} placeholder="Why are you a great fit?" />
              <button type="button" className="btn-primary mt-4" disabled={saving} onClick={apply}>Submit Application</button>
            </section>
          ) : application.status === 'accepted' ? (
            <Link className="btn-primary" to={`/creator/campaigns/${campaign._id}/workspace`}>Open Workspace</Link>
          ) : null}
        </main>
      </div>
    </div>
  );
};

export default DealDetailPage;
