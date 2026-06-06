import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

const getItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
};

const setItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
  await SecureStore.setItemAsync(key, value);
};

const deleteItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
  await SecureStore.deleteItemAsync(key);
};

export const storage = {
  getToken: () => getItem(TOKEN_KEY),
  setToken: (token: string) => setItem(TOKEN_KEY, token),
  removeToken: () => deleteItem(TOKEN_KEY),

  getUser: async () => {
    const raw = await getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user: object) => setItem(USER_KEY, JSON.stringify(user)),
  removeUser: () => deleteItem(USER_KEY),

  clear: async () => {
    await deleteItem(TOKEN_KEY);
    await deleteItem(USER_KEY);
  },
};
