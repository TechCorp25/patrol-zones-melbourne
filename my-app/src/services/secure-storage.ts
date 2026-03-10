import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'secure:';

async function importSecureStore() {
  // eslint-disable-next-line import/no-unresolved
  return import('expo-secure-store');
}

export async function getSecureItem(key: string) {
  try {
    const mod = await importSecureStore();
    return await mod.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(`${KEY_PREFIX}${key}`);
  }
}

export async function setSecureItem(key: string, value: string) {
  try {
    const mod = await importSecureStore();
    await mod.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(`${KEY_PREFIX}${key}`, value);
  }
}

export async function deleteSecureItem(key: string) {
  try {
    const mod = await importSecureStore();
    await mod.deleteItemAsync(key);
  } catch {
    await AsyncStorage.removeItem(`${KEY_PREFIX}${key}`);
  }
}
