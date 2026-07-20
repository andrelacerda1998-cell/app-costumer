import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CustomText } from '@/components/CustomText';
import CustomTouchableOpacity from '@/components/CustomTouchableOpacity';
import { Colors } from '@/constants/Colors';
import { useMixpanel } from '@/contexts/MixpanelContext';

const ConsentBanner: React.FC = () => {
  const { giveConsent, revokeConsent } = useMixpanel();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <CustomText color="secondary" size="small" boldness="regular" className="flex-1 mb-3">
          {t('consent_banner.message')}
        </CustomText>
        <View style={styles.buttons}>
          <CustomTouchableOpacity
            type="transparent"
            size="small"
            text={t('consent_banner.reject')}
            textColor="secondary"
            textBoldness="regular"
            onPress={revokeConsent}
            classes="px-2"
          />
          <CustomTouchableOpacity
            type="secondary"
            size="small"
            text={t('consent_banner.accept')}
            textColor="primary"
            textBoldness="bold"
            onPress={giveConsent}
          />
        </View>
        <CustomTouchableOpacity
          type="transparent"
          size="small"
          text={t('consent_banner.learn_more')}
          textColor="secondary"
          textBoldness="semiBold"
          onPress={() => Linking.openURL('https://piquetapp.com/politica-de-privacidade-para-utilizadores/')}
          classes="mt-2"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1000,
  },
  content: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});

export default ConsentBanner;
