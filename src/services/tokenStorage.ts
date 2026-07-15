import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'kormic.access';
const REFRESH_TOKEN_KEY = 'kormic.refresh';

type SavedTokens = {
  access: string;
  refresh?: string;
};

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined';
}

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (canUseLocalStorage()) {
      localStorage.setItem(key, value);
    }
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string) {
  if (Platform.OS === 'web') {
    return canUseLocalStorage() ? localStorage.getItem(key) : null;
  }

  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    if (canUseLocalStorage()) {
      localStorage.removeItem(key);
    }
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function saveAccessToken(accessToken: string) {
  await setItem(ACCESS_TOKEN_KEY, accessToken);
}

export async function saveRefreshToken(refreshToken: string) {
  await setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function saveTokens(tokens: { access?: string; refresh?: string }) {
  if (tokens.access) {
    await saveAccessToken(tokens.access);
  }
  if (tokens.refresh) {
    await saveRefreshToken(tokens.refresh);
  }
}

export async function getSavedRefreshToken() {
  return (await getItem(REFRESH_TOKEN_KEY)) ?? undefined;
}

export async function getSavedTokens(): Promise<SavedTokens | undefined> {
  const access = await getItem(ACCESS_TOKEN_KEY);
  if (!access) {
    return undefined;
  }

  return {
    access,
    refresh: (await getItem(REFRESH_TOKEN_KEY)) ?? undefined,
  };
}

export async function clearSavedTokens() {
  await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(REFRESH_TOKEN_KEY)]);
}
