import React from 'react';
import { useMixpanel } from '@/contexts/MixpanelContext';
import ConsentBanner from '@/components/ConsentBanner';

const ConsentBannerWrapper: React.FC = () => {
  const { hasResponded, isInitialized } = useMixpanel();

  if (!isInitialized || hasResponded) {
    return null;
  }

  return <ConsentBanner />;
};

export default ConsentBannerWrapper;
