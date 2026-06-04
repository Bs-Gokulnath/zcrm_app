import React from 'react';
import { Text, View } from 'react-native';
import { STATUS_COLORS, PRIORITY_COLORS } from '../../lib/constants';

interface StatusBadgeProps {
  label: string;
  type?: 'status' | 'priority';
}

export function StatusBadge({ label, type = 'status' }: StatusBadgeProps) {
  const colorMap = type === 'status' ? STATUS_COLORS : PRIORITY_COLORS;
  const color = colorMap[label] ?? '#94a3b8';

  return (
    <View
      style={{ backgroundColor: color + '20', borderColor: color, borderWidth: 1 }}
      className="rounded-full px-2 py-0.5"
    >
      <Text style={{ color }} className="text-xs font-medium">
        {label}
      </Text>
    </View>
  );
}
