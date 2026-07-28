import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { AuthSession } from '../models/onboarding';
import { API_BASE_URL } from './api';

const CHAT_NOTIFICATION_TYPES = ['agent_reply', 'pending_query_resolved', 'agent_initiated'];
const PUSH_TOKEN_KEY = 'kormic.expoPushToken';
let expoPushToken: string | undefined;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId;
}

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined';
}

async function savePushToken(token: string) {
  expoPushToken = token;

  if (Platform.OS === 'web') {
    if (canUseLocalStorage()) {
      localStorage.setItem(PUSH_TOKEN_KEY, token);
    }
    return;
  }

  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
}

async function getSavedPushToken() {
  if (expoPushToken) {
    return expoPushToken;
  }

  if (Platform.OS === 'web') {
    return canUseLocalStorage() ? localStorage.getItem(PUSH_TOKEN_KEY) ?? undefined : undefined;
  }

  return (await SecureStore.getItemAsync(PUSH_TOKEN_KEY)) ?? undefined;
}

async function clearSavedPushToken() {
  expoPushToken = undefined;

  if (Platform.OS === 'web') {
    if (canUseLocalStorage()) {
      localStorage.removeItem(PUSH_TOKEN_KEY);
    }
    return;
  }

  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

async function postNotificationToken(
  path: '/notifications/register-token/' | '/notifications/unregister-token/',
  accessToken: string,
  body: Record<string, string>,
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text().catch(() => '');

  console.log('[notifications] backend response', {
    path,
    status: response.status,
    ok: response.ok,
    body: responseText,
  });

  if (!response.ok) {
    throw new Error(`Notification token request failed with status ${response.status}: ${responseText}`);
  }

  try {
    return responseText ? JSON.parse(responseText) : {};
  } catch {
    return {};
  }
}

export async function registerForPushNotifications(session?: AuthSession) {
  console.log('[notifications] register start', {
    hasAccess: Boolean(session?.access),
    isDevice: Device.isDevice,
    platform: Platform.OS,
    user: session?.user,
    apiBaseUrl: API_BASE_URL, 
  });

  if (!session?.access) {
    console.log('[notifications] skip: missing auth access token');
    return undefined;
  }

  if (!Device.isDevice) {
    console.log('[notifications] skip: physical device required');
    return undefined;
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    console.log('[notifications] skip: unsupported platform', Platform.OS);
    return undefined;
  }

  if (session.user && !session.user.totp_enrolled) {
    console.log('[notifications] skip: TOTP not enrolled');
    return undefined;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let status = existingStatus;

  console.log('[notifications] existing permission:', existingStatus);

  if (status !== 'granted') {
    const permission = await Notifications.requestPermissionsAsync();
    status = permission.status;
    console.log('[notifications] requested permission result:', permission);
  }

  console.log('[notifications] final permission:', status);

  if (status !== 'granted') {
    console.log('[notifications] skip: permission not granted');
    return undefined;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }

  const projectId = getProjectId();
  console.log('[notifications] projectId:', projectId);

 let tokenResponse;

try {
  tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  console.log('[notifications] raw token response:', tokenResponse);
} catch (error) {
  console.log('[notifications] getExpoPushTokenAsync failed:', error);
  throw error;
}

  const nextExpoPushToken = tokenResponse.data;
  console.log('[notifications] Expo push token:', nextExpoPushToken);
  console.log('[notifications] registering to backend:', `${API_BASE_URL}/notifications/register-token/`);

  await savePushToken(nextExpoPushToken);

  await postNotificationToken('/notifications/register-token/', session.access, {
    token: nextExpoPushToken,
    platform: Platform.OS,
  });

  console.log('[notifications] register complete');

  return nextExpoPushToken;
}

export async function unregisterPushNotifications(session?: AuthSession) {
  if (!session?.access) return;

  const savedToken = await getSavedPushToken();
  if (!savedToken) return;

  await postNotificationToken('/notifications/unregister-token/', session.access, {
    token: savedToken,
  });

  await clearSavedPushToken();
}

export function addNotificationReceivedListener(onAgentNotification: () => void) {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const type = notification.request.content.data?.type;

    console.log('[notifications] received foreground notification:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: notification.request.content.data,
    });

    if (typeof type === 'string' && CHAT_NOTIFICATION_TYPES.includes(type)) {
      onAgentNotification();
    }
  });

  return () => subscription.remove();
}

export function addNotificationTapListener(onOpenAgentChat: () => void) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const type = response.notification.request.content.data?.type;

    if (typeof type === 'string' && CHAT_NOTIFICATION_TYPES.includes(type)) {
      onOpenAgentChat();
    }
  });

  return () => subscription.remove();
}

export async function shouldOpenAgentChatFromLastNotification() {
  const response = await Notifications.getLastNotificationResponseAsync();
  const type = response?.notification.request.content.data?.type;

  return typeof type === 'string' && CHAT_NOTIFICATION_TYPES.includes(type);
}

type NotificationPayload = {
  id?: number;
  event_type?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  created_at?: string;
};

type NotificationPollResponse = {
  results?: NotificationPayload[];
  server_time?: string;
};

function getNotificationType(data: Record<string, unknown> | undefined, fallbackType?: unknown) {
  const type = data?.type ?? fallbackType;
  return typeof type === 'string' ? type : undefined;
}

function isAgentNotificationType(type: string | undefined) {
  return Boolean(type && CHAT_NOTIFICATION_TYPES.includes(type));
}

export async function pollNotifications(session?: AuthSession, since?: string) {
  if (!session?.access) {
    return { nextSince: since, hasAgentNotification: false };
  }

  const params = new URLSearchParams({ limit: '20' });
  if (since) params.set('since', since);

  const response = await fetch(`${API_BASE_URL}/notifications/poll/?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access}`,
    },
  });

  const responseText = await response.text().catch(() => '');

  console.log('[notifications] poll response', {
    status: response.status,
    ok: response.ok,
    body: responseText,
  });

  if (!response.ok) {
    throw new Error(`Notification poll failed with status ${response.status}: ${responseText}`);
  }

  const data = responseText ? (JSON.parse(responseText) as NotificationPollResponse) : {};
  const results = data.results ?? [];

  const agentNotifications = results.filter((item) =>
    isAgentNotificationType(getNotificationType(item.data, item.event_type)),
  );

  for (const item of agentNotifications) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title || 'Aria replied',
        body: item.body || 'Your agent reply is ready.',
        sound: 'default',
        data: {
          ...(item.data ?? {}),
          type: getNotificationType(item.data, item.event_type) ?? 'agent_reply',
        },
      },
      trigger: null,
    });
  }

  return {
    nextSince: data.server_time ?? since,
    hasAgentNotification: agentNotifications.length > 0,
  };
}