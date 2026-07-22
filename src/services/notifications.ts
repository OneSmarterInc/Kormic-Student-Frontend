import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

let initialized = false;

export async function notifyBotReplyReady(agentName = 'Aria') {
  if (!initialized) {
    initialized = true;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('bot-replies', {
        name: 'Bot replies',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }
  }

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${agentName} replied`,
      body: 'Your bot response is ready.',
      sound: 'default',
    },
    trigger: null,
  });
}
