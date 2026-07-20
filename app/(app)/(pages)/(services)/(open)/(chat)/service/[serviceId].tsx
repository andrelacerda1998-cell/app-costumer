import {Colors} from '@/constants/Colors';
import {Ionicons} from '@expo/vector-icons';
import React, {useEffect, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {FlatList, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View} from 'react-native';
import BackHeader from '@/components/app/BackHeader';
import {useSession} from '@/contexts/SessionContext';
import {CustomText} from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import {useApi} from "@/contexts/ApiContext";
import {API_ROUTES} from "@/constants/ApiRoutes";
import useEcho from "@/hooks/echo";
import {RSA} from "react-native-rsa-native";
import {useService} from "@/contexts/ServiceContext";
import XIcon from "@/assets/icons/x";
import {useDialog} from "@/contexts/DialogContext";
import { useTranslation } from "react-i18next";
import { useAppStateStatus } from "@/contexts/AppStateStatusContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

interface Message {
    isVendor: boolean;
    isCustomer: boolean;
    message: string;
    time: string;
}

const CustomerMessage = ({message, time}: { message: string, time: string }) => {
    return (
        <View className="space-y-2 self-end mb-5">
            <View className="bg-primary p-6 w-full rounded-3xl rounded-br-none">
                <CustomText size="small" color="secondary" boldness="regular">
                    {message}
                </CustomText>
            </View>
            <CustomText
                size="extraSmall"
                color="secondary"
                boldness="regular"
                classes="text-right"
            >
                {time}
            </CustomText>
        </View>
    )
}

const VendorMessage = ({message, time}: { message: string, time: string }) => {
    return (
        <View className="space-y-2 self-start mb-5">
            <View className="bg-support_primary p-6 w-full rounded-3xl rounded-bl-none">
                <CustomText size="small" color="secondary" boldness="regular">
                    {message}
                </CustomText>
            </View>
            <View className="self-start">
                <CustomText
                    size="extraSmall"
                    color="secondary"
                    boldness="regular"
                    classes="text-right"
                >
                    {time}
                </CustomText>
            </View>
        </View>
    )
}

// const HeaderRightItem = () => {
//     const [showPopUp, setShowPopUp] = useState(false);

//     const goToMakePayment = () => {
//         // router.push('/(app)/(pages)/(services)/(open)/(payment)/start/1');
//     };

//     return (
//         <View className="relative">
//             <CustomTouchableOpacity
//                 size="small"
//                 type="transparent"
//                 classes="p-0"
//                 onPress={() => setShowPopUp(prev => !prev)}
//             >
//                 <Entypo name="dots-three-vertical" size={24} color={Colors.secondary}/>
//             </CustomTouchableOpacity>
//             {showPopUp && (
//                 <View className="w-44 bg-support_secondary rounded-md absolute top-10 right-0 p-2">
//                     <CustomTouchableOpacity
//                         size="small"
//                         type="transparent"
//                         onPress={() => {
//                             setShowPopUp(prev => !prev);
//                             goToMakePayment();
//                         }}
//                         classes="p-0 mb-2"
//                     >
//                         <View className="w-full h-full rounded-md border border-secondary">
//                             <CustomText size="small" color="secondary" boldness="regular" classes="p-3">
//                                 Make payment
//                             </CustomText>
//                         </View>
//                     </CustomTouchableOpacity>
//                     <CustomTouchableOpacity
//                         size="small"
//                         type="transparent"
//                         onPress={() => setShowPopUp(prev => !prev)}
//                         classes="p-0"
//                     >
//                         <View className="w-full h-full rounded-md border border-secondary">
//                             <CustomText size="small" color="secondary" boldness="regular" classes="p-3">
//                                 Help
//                             </CustomText>
//                         </View>
//                     </CustomTouchableOpacity>
//                 </View>
//             )}
//         </View>
//     )
// }

const Service = () => {
    const {t} = useTranslation();
    const {api} = useApi();
    const echo = useEcho();
    const {userData} = useSession();
    const {openService, setIsChatScreenActive, setUnreadServiceMessages} = useService();
    const {openDialog} = useDialog();
    const serviceId = openService?.id;
    const [message, setMessage] = useState('');
    const [publicKey, setPublicKey] = useState<string>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [groupedMessages, setGroupedMessages] = useState<{ date: string, messages: Message[] }[]>([]);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const { appStateStatus } = useAppStateStatus();

    useEffect(() => {
        if (appStateStatus === "active") {
            fetchMessages();
        }
    }, [appStateStatus]);

    useEffect(() => {
        setIsChatScreenActive(true);
        setUnreadServiceMessages(0);
        return () => {
            setIsChatScreenActive(false);
        };
    }, [setIsChatScreenActive, setUnreadServiceMessages, serviceId]);

    useEffect(() => {
        api.get(API_ROUTES.GET_SERVICE_PUBLIC_KEY(serviceId as string)).then(res => {
            // console.log({res})
            setPublicKey(res.data.data.public_key);
        });
        subscribeToMessagesChannel();
        return () => {
            if (echo) {
                echo.leaveChannel(`common.services.${serviceId}`);
            }
        };
    }, [echo]);

    useEffect(() => {
        formatMessages(messages);
    }, [messages]);

    const formatDateToISO = (date: Date): string => {
        const pad = (num: number) => String(num).padStart(2, '0');
        const year = date.getUTCFullYear();
        const month = pad(date.getUTCMonth() + 1);
        const day = pad(date.getUTCDate());
        const hours = pad(date.getUTCHours());
        const minutes = pad(date.getUTCMinutes());
        const seconds = pad(date.getUTCSeconds());
        const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}000Z`;
    }

    const handleSendMessage = async () => {
        if (!publicKey) return;
        setSendingMessage(true);
        const messageToSend = message;
        setMessage('');

        const now = new Date(Date.now());
        const formattedDate = formatDateToISO(now);

        buildMessages({
            isVendor: false,
            isCustomer: true,
            time: formattedDate,
            message: messageToSend,
        });

        const signedData = await RSA.encrypt(messageToSend, publicKey);

        api.post(API_ROUTES.POST_MESSAGE(serviceId as string), {
            "message": signedData,
        })
            .then(() => setMessage(''))
            .catch((error) => {
                console.error(error);
                setMessage(messageToSend);
            })
            .finally(() => setSendingMessage(false));
    };

    const buildMessages = (message: Message) => {
        if (!userData) return;

        setMessages((prevMessages) => [...prevMessages, message]);
    };

    const subscribeToMessagesChannel = () => {
        if (!echo) return;

        const channel = echo.private(`common.services.${serviceId}`);
        if (!channel) return;

        channel.subscribed(() => {
            channel.error(console.error);
            channel.listen(".NewMessageEvent", handleNewMessage);
        });
    };

    const handleNewMessage = (messageToHandle: {
        message: string;
        messageDecrypted: string;
    }) => {
        const {user_id, updated_at, created_at, id} = JSON.parse(messageToHandle.message);

        if (!userData || user_id === userData.id) return;

        const newMessage: Message = {
            isVendor: user_id != userData.id,
            isCustomer: user_id === userData.id,
            message: messageToHandle.messageDecrypted,
            time: created_at,
        };

        buildMessages(newMessage);
    };

    const fetchMessages = () => {
        if (!loadingMessages) setLoadingMessages(true);
        api.get(API_ROUTES.GET_CHATS(serviceId as string))
            .then(res => {
                const data = res.data.data.messages;
                if (!userData) return;

                setMessages(data.map((message: { from: number; date: string; message: string }) => ({
                    ...message,
                    isVendor: message.from !== userData?.id,
                    isCustomer: message.from === userData?.id,
                    message: message.message,
                    time: message.date,
                })));
            })
            .catch((error) => {
                openDialog({
                    icon: <XIcon color={Colors.secondary}/>,
                    title: t('errors.title'),
                    subtitle: error?.response?.data?.metadata?.message || error?.response?.data?.message || t('errors.occurred_an_error'),
                    closeAfterMSeconds: 2000,
                    closeOnClickOutside: true,
                })
            })
            .finally(() => setLoadingMessages(false));
    };

    const formatIsoToTime = (isoString: string): string => {
        const date = new Date(isoString);
        const pad = (num: number) => String(num).padStart(2, '0');
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${hours}:${minutes}`;
    }

    const formatMessages = (messagesToFormat: Message[]) => {
        const newGroupedMessages = messagesToFormat
            .reduce((acc: { date: string, messages: Message[] }[], message: Message) => {
                const date = message.time.split('T')[0];
                const existingGroup = acc.find(group => group.date === date);

                if (existingGroup) {
                    existingGroup.messages.push(message);
                } else {
                    acc.push({date: date, messages: [message]});
                }
                return acc;
            }, [])
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setGroupedMessages(newGroupedMessages);
    }


    const formatDateSeparator = (date: string) => {
        const dateArray = date.split('-');
        const today = new Date();
        const dateToCheck = new Date(
            parseInt(dateArray[0]),
            parseInt(dateArray[1]) - 1,
            parseInt(dateArray[2])
        );

        const isToday =
            dateToCheck.getDate() === today.getDate() &&
            dateToCheck.getMonth() === today.getMonth() &&
            dateToCheck.getFullYear() === today.getFullYear();

        if (isToday) {
            return t('chat.dates.today');
        }

        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const isYesterday =
            dateToCheck.getDate() === yesterday.getDate() &&
            dateToCheck.getMonth() === yesterday.getMonth() &&
            dateToCheck.getFullYear() === yesterday.getFullYear();

        if (isYesterday) {
            return t('chat.dates.yesterday');
        }

        const dayNames = [t('chat.dates.sunday'), t('chat.dates.monday'), t('chat.dates.tuesday'), t('chat.dates.wednesday'), t('chat.dates.thursday'), t('chat.dates.friday'), t('chat.dates.saturday')];
        const dayOfWeek = dateToCheck.getDay();
        const dayName = dayNames[dayOfWeek];

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        if (dateToCheck >= sevenDaysAgo && dateToCheck <= today) {
            return dayName;
        }

        return `${dateArray[2]}/${dateArray[1]}/${dateArray[0]}`;
    };

    return (
        <SafeAreaView className="flex-1 bg-primary">
                {/* <StatusBar backgroundColor={Colors.primary}/> */}
            <View className="flex-1 bg-support_secondary">
                <BackHeader
                    backButtonColor="secondary"
                    middleItem={() => (
                        <View className="flex flex-row items-center">
                            <CustomText color="secondary" boldness="medium" numberOfLines={1}>
                                {openService?.vendor?.user?.name}
                            </CustomText>
                        </View>
                    )}
                    //rigthItem={() => <HeaderRightItem/>}
                    otherClasses="px-5 py-8 bg-primary rounded-b-3xl z-10"
                />
                <View className="flex-1 px-5 overflow-hidden">
                    {loadingMessages ? (
                        <View className="flex-1 justify-end">
                            <View className="space-y-5">
                                <View className="rounded-3xl rounded-bl-none overflow-hidden w-[50%]">
                                    <View className="w-full h-16 bg-gray_light"></View>
                                </View>
                                <View className="rounded-3xl rounded-bl-none overflow-hidden w-[70%]">
                                    <View className="w-full h-16 bg-gray_light"></View>
                                </View>
                                <View className="rounded-3xl rounded-br-none overflow-hidden w-[70%] self-end">
                                    <View className="w-full h-16 bg-gray_light"></View>
                                </View>
                                <View className="rounded-3xl rounded-bl-none overflow-hidden w-[70%]">
                                    <View className="w-full h-16 bg-gray_light"></View>
                                </View>
                                <View className="rounded-3xl rounded-br-none overflow-hidden w-[40%] self-end">
                                    <View className="w-full h-16 bg-gray_light"></View>
                                </View>
                                <View className="rounded-3xl rounded-br-none overflow-hidden w-[52%] self-end">
                                    <View className="w-full h-16 bg-gray_light"></View>
                                </View>
                                <View className="rounded-3xl rounded-bl-none overflow-hidden w-[35%]">
                                    <View className="w-full h-16 bg-gray_light"></View>
                                </View>
                                <View className="rounded-3xl rounded-br-none overflow-hidden w-[70%] self-end">
                                    <View className="w-full h-16 bg-gray_light"></View>
                                </View>
                                <View className="rounded-3xl rounded-bl-none overflow-hidden w-[57%]">
                                    <View className="w-full h-16 bg-gray_light"></View>
                                </View>
                                <View className="rounded-3xl rounded-bl-none overflow-hidden w-[70%]">
                                    <View className="w-full h-16 bg-gray_light"></View>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <FlatList
                            data={groupedMessages}
                            keyExtractor={(_, index) => `group-message-${index}`}
                            style={{
                                flex: 1,
                            }}
                            contentContainerStyle={{
                                justifyContent: 'flex-start',
                            }}
                            inverted={groupedMessages.length > 0}
                            renderItem={({item}) => {
                                return (
                                    <View className="space-y-2">
                                        <View className="items-center p-5">
                                            <CustomText
                                                size="extraSmall"
                                                color="primary"
                                                boldness="semiBold"
                                                numberOfLines={1}
                                                classes="px-3 py-1 bg-secondary rounded-full flex"
                                            >
                                                {formatDateSeparator(item.date)}
                                            </CustomText>
                                        </View>
                                        {item.messages.map((message, index) => {
                                            if (message.isVendor) {
                                                return (
                                                    <VendorMessage
                                                        key={`vendor-${index}`}
                                                        message={message.message}
                                                        time={formatIsoToTime(message.time)}
                                                    />
                                                );
                                            }
                                            if (message.isCustomer) {
                                                return (
                                                    <CustomerMessage
                                                        key={`customer-${index}`}
                                                        message={message.message}
                                                        time={formatIsoToTime(message.time)}
                                                    />
                                                );
                                            }
                                            return null;
                                        })}
                                    </View>
                                )
                            }}
                        />
                    )}
                    {!loadingMessages && groupedMessages.length === 0 && (
                        <CustomText size="medium" color="secondary" boldness="semiBold" classes="text-center">
                            {t('chat.no_messages')}
                        </CustomText>
                    )}
                    <View className="my-6 flex-row items-center">
                        <KeyboardAwareScrollView bottomOffset={40}>
                            <View className="flex-1">
                                <TextInput
                                    className="pl-5 pr-16 py-5 rounded-full bg-support_primary"
                                    placeholder={t('chat.input_placeholder')}
                                    placeholderTextColor={Colors.gray_medium}
                                    value={message}
                                    onChangeText={setMessage}
                                />
                                <View className="w-14 absolute right-0 h-full flex-1 items-center justify-center">
                                    <CustomTouchableOpacity
                                        size="small"
                                        type="transparent"
                                        classes="p-0 z-10"
                                        onPress={() => {
                                            if (message.trim() !== '') {
                                                handleSendMessage();
                                            }
                                        }}
                                        disabled={sendingMessage }
                                    >
                                        {message !== '' && (
                                            <Ionicons name="send" size={24} color={Colors.secondary}/>
                                        )}
                                    </CustomTouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAwareScrollView>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    )
}

export default Service;
