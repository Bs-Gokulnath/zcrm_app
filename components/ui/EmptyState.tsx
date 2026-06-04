import React from 'react';
import { Text, View } from 'react-native';
import { Inbox } from 'lucide-react-native';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, subtitle, icon }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8 py-16">
      {icon ?? <Inbox size={48} color="#94a3b8" />}
      <Text className="text-lg font-semibold text-gray-700 text-center">{title}</Text>
      {subtitle && <Text className="text-sm text-gray-400 text-center">{subtitle}</Text>}
    </View>
  );
}
