import { useState, useEffect } from 'react';
import onboardingService, { ConfigCheck } from '../services/onboarding';

export function useOnboardingStatus(userId?: string) {
  const [configStatus, setConfigStatus] = useState<ConfigCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkOnboarding = async () => {
      try {
        setLoading(true);
        const status = await onboardingService.getConfigStatus();
        setConfigStatus(status);
      } catch (err) {
        setError('Failed to check onboarding status');
        console.error('Onboarding check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, [userId]);

  return {
    configStatus,
    loading,
    error,
    needsOnboarding: configStatus ? !configStatus.completed : false,
    refetch: async () => {
      if (userId) {
        try {
          const status = await onboardingService.getConfigStatus();
          setConfigStatus(status);
        } catch (err) {
          setError('Failed to refresh onboarding status');
        }
      }
    }
  };
}