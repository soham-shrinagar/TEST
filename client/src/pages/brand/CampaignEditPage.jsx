import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import CampaignForm from '../../components/CampaignForm';

const CampaignEditPage = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/campaigns/${id}/dashboard`)
      .then(({ data }) => setCampaign(data.campaign))
      .catch((err) => setError(err.response?.data?.message || 'Could not load campaign'));
  }, [id]);

  if (error) return <div className="page-shell"><div className="panel p-8 text-center font-bold text-[#a8322b]">{error}</div></div>;
  if (!campaign) return <div className="page-shell"><div className="h-80 animate-pulse rounded-lg border border-ink/10 bg-white" /></div>;
  return <CampaignForm mode="edit" initialCampaign={campaign} />;
};

export default CampaignEditPage;
