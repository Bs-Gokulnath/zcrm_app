import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

interface Props {
  title?: string;
  right?: React.ReactNode;
}

export function AppHeader({ title, right }: Props) {
  const { user } = useAuth();
  const router = useRouter();

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <View className="flex-row items-center justify-between px-4 pt-3 pb-3 bg-white border-b border-gray-100">
      {/* ZCRM brand */}
      <Text className="text-xl font-black text-blue-600 tracking-tight">ZCRM</Text>

      {/* Screen title (center) */}
      {title ? (
        <Text className="text-base font-bold text-gray-900 absolute left-0 right-0 text-center" pointerEvents="none">
          {title}
        </Text>
      ) : null}

      {/* Right slot + avatar */}
      <View className="flex-row items-center gap-2">
        {right}
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          className="w-9 h-9 rounded-full bg-blue-600 items-center justify-center"
        >
          <Text className="text-sm font-bold text-white">{initials}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
