import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MapPin, MessageSquare, User } from 'lucide-react-native';
import { StatusBadge } from '../ui/StatusBadge';
import type { BoardItem } from '../../services/board-groups';

interface ItemCardProps {
  item: BoardItem;
  onPress: () => void;
}

export function ItemCard({ item, onPress }: ItemCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-xl px-4 py-3 mb-2 border border-gray-100 active:opacity-75"
    >
      <Text className="text-sm font-medium text-gray-900 mb-2" numberOfLines={2}>
        {item.name}
      </Text>

      <View className="flex-row flex-wrap gap-1.5 mb-2">
        {item.status && <StatusBadge label={item.status} type="status" />}
        {item.priority && <StatusBadge label={item.priority} type="priority" />}
      </View>

      <View className="flex-row items-center gap-3">
        {item.owner && (
          <View className="flex-row items-center gap-1">
            <User size={11} color="#94a3b8" />
            <Text className="text-xs text-gray-400" numberOfLines={1}>{item.owner}</Text>
          </View>
        )}
        {item.city && (
          <View className="flex-row items-center gap-1">
            <MapPin size={11} color="#94a3b8" />
            <Text className="text-xs text-gray-400" numberOfLines={1}>{item.city}</Text>
          </View>
        )}
        {(item._count?.updates ?? 0) > 0 && (
          <View className="flex-row items-center gap-1 ml-auto">
            <MessageSquare size={11} color="#94a3b8" />
            <Text className="text-xs text-gray-400">{item._count?.updates}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
