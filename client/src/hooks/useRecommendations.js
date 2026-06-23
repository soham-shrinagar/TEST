import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

const useRecommendations = (limit = 20) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const observerRef = useRef(null);
  const timersRef = useRef(new Map());
  const trackedRef = useRef(new Set());

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/recommendations?limit=${limit}`);
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load recommendations');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const trackEvent = useCallback(async (recommendation, eventType = 'view') => {
    if (!recommendation?.targetId || !recommendation?.targetModel) return;
    await api.post('/recommendations/event', {
      targetId: recommendation.targetId,
      targetModel: recommendation.targetModel,
      eventType,
    });
  }, []);

  const registerView = useCallback((node, recommendation) => {
    if (!node || !recommendation?.targetId) return undefined;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const key = entry.target.dataset.recommendationKey;
          const payload = entry.target.__recommendation;
          if (!key || !payload || trackedRef.current.has(key)) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            const timer = window.setTimeout(() => {
              trackedRef.current.add(key);
              trackEvent(payload, 'view').catch(() => {});
              timersRef.current.delete(key);
            }, 2000);
            timersRef.current.set(key, timer);
          } else if (timersRef.current.has(key)) {
            window.clearTimeout(timersRef.current.get(key));
            timersRef.current.delete(key);
          }
        });
      }, { threshold: [0.55] });
    }

    const key = `${recommendation.targetModel}:${recommendation.targetId}`;
    node.dataset.recommendationKey = key;
    node.__recommendation = recommendation;
    observerRef.current.observe(node);
    return () => observerRef.current?.unobserve(node);
  }, [trackEvent]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    observerRef.current?.disconnect();
  }, []);

  return { recommendations, loading, error, refetch: fetchRecommendations, registerView, trackEvent };
};

export default useRecommendations;
