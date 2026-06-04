import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3">
      <ActivityIndicator size="large" color="#2563eb" />
      {message && <Text className="text-gray-500 text-sm">{message}</Text>}
    </View>
  );
}
