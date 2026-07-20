import BackHeader from "@/components/app/BackHeader";
import ProgressBar from "@/components/auth/signup/ProgressBar";
import { CustomText } from "@/components/CustomText";
import AddressStep from "@/components/user/completeYourProfile/components/addressStep";
import PersonalInformationStep from "@/components/user/completeYourProfile/components/personalInformationStep";
import VerifyEmailStep from "@/components/user/completeYourProfile/components/verifyEmailStep";
import VerifyPhoneNumberStep from "@/components/user/completeYourProfile/components/verifyPhoneNumberStep";
import { useAppStateStatus } from "@/contexts/AppStateStatusContext";
import { useSession } from "@/contexts/SessionContext";
import { UserDataInterface } from "@/types/session";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMixpanel } from "@/contexts/MixpanelContext";

enum VerifySteps {
  instructions = 0,
  personalInformation = 1,
  address = 2,
  phoneVerification = 3,
  emailVerification = 4,
}

const CompleteProfile = () => {
  const { t } = useTranslation();
  const { userData, isLoadingUserData } = useSession();
  const { appStateStatus } = useAppStateStatus();
  const { setUserProfile, track } = useMixpanel();
  const [step, setStep] = useState<VerifySteps>(VerifySteps.instructions);
  const hasTrackedCompletionRef = useRef(false);

  const maxStep = Object.keys(VerifySteps).length / 2 - 1;
  const hasAssociatedEmail = !!userData?.email?.trim?.();

  const syncCompletedProfileToMixpanel = (data: UserDataInterface) => {
    if (hasTrackedCompletionRef.current) return;

    const fieldsFilled = [
      data?.name?.trim?.(),
      data?.gender_id !== null,
      !!data?.date_birthday,
      !!data?.address,
      data?.phone_number_verified_at !== null,
      !(data?.email?.trim?.()) || data?.email_verified_at !== null,
    ].filter(Boolean).length;

    setUserProfile({
      $name: data?.name,
      $email: data?.email,
      $phone: data?.phone_number,
      gender_id: data?.gender_id,
      date_birthday: data?.date_birthday,
      has_address: !!data?.address,
      phone_number_verified_at: data?.phone_number_verified_at,
      email_verified_at: data?.email_verified_at,
      nif: data?.nif,
    });
    track('profile_completed', { fields_filled: fieldsFilled });
    hasTrackedCompletionRef.current = true;
  };

  useEffect(() => {
    if (userData) {
      handleNextStep(userData);
    }
  }, [userData]);

  useEffect(() => {
    if (appStateStatus !== "active" || isLoadingUserData) {
      return;
    }

    handleGoBack();
  }, [appStateStatus, isLoadingUserData, userData]);

  const closeFlow = () => {
    if (router.canGoBack()) {
      return router.back();
    }

    router.replace("/(app)/(tabs)/home");
  };

  const handleGoBack = () => {
    if (
      !userData?.name?.trim?.() ||
      userData?.gender_id === null ||
      !userData?.date_birthday ||
      userData?.address === null ||
      userData?.phone_number_verified_at === null ||
      (hasAssociatedEmail && userData?.email_verified_at === null)
    ) {
      return;
    }

    syncCompletedProfileToMixpanel(userData as UserDataInterface);
    closeFlow();
  };

  const handleNextStep = (data: UserDataInterface) => {
    if (!data?.name?.trim?.() || data?.gender_id === null || !data?.date_birthday) {
      setStep(VerifySteps.personalInformation);
      return;
    }

    if (data?.address === null) {
      setStep(VerifySteps.address);
      return;
    }

    if (data?.phone_number_verified_at === null) {
      setStep(VerifySteps.phoneVerification);
      return;
    }

    if (data?.email?.trim?.() && data?.email_verified_at === null) {
      setStep(VerifySteps.emailVerification);
      return;
    }

    syncCompletedProfileToMixpanel(data);
    closeFlow();
  };

  return (
    <SafeAreaView className="flex-1 bg-support_secondary">
      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText size="medium" color="secondary" boldness="medium">
            {t("complete_profile.header")}
          </CustomText>
        )}
        otherClasses="p-5"
        onBack={closeFlow}
      />

      <ProgressBar percentage={(step / maxStep) * 100} />

      <View className="flex-1">
        {step === VerifySteps.personalInformation && (
          <PersonalInformationStep onNext={handleNextStep} />
        )}
        {step === VerifySteps.address && (
          <AddressStep onNext={handleNextStep} />
        )}
        {step === VerifySteps.phoneVerification && (
          <VerifyPhoneNumberStep onNext={handleNextStep} />
        )}
        {hasAssociatedEmail && step === VerifySteps.emailVerification && (
          <VerifyEmailStep onNext={handleNextStep} />
        )}
      </View>
    </SafeAreaView>
  );
};

export default CompleteProfile;
