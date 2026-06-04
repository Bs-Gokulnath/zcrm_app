import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, RefreshCw } from 'lucide-react-native';
import { OlaMap, type MapMarker } from '../../components/ui/OlaMap';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { boardsApi } from '../../services/boards';
import { groupsApi, type BoardItem } from '../../services/board-groups';
import { STATUS_COLORS } from '../../lib/constants';

interface MapItem extends BoardItem {
  boardId: string;
  boardName: string;
  latitude: number;
  longitude: number;
}

export default function MapScreen() {
  const [items, setItems] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MapItem | null>(null);

  async function load() {
    setLoading(true);
    try {
      const boardsRes = await boardsApi.getAll();
      const mapItems: MapItem[] = [];

      await Promise.all(
        boardsRes.data.map(async (board) => {
          try {
            const groupsRes = await groupsApi.getAll(board.id);
            for (const group of groupsRes.data) {
              for (const item of group.items) {
                if (item.location) {
                  const coords = parseCoords(item.location);
                  if (coords) {
                    mapItems.push({ ...item, boardId: board.id, boardName: board.name, ...coords });
                  }
                }
              }
            }
          } catch { /* skip */ }
        }),
      );

      setItems(mapItems);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function parseCoords(location: string): { latitude: number; longitude: number } | null {
    const parts = location.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { latitude: lat, longitude: lng };
      }
    }
    return null;
  }

  const markers: MapMarker[] = items.map(item => ({
    id: item.id,
    latitude: item.latitude,
    longitude: item.longitude,
    title: item.name,
    subtitle: [item.city, item.status].filter(Boolean).join(' · '),
    color: item.status ? (STATUS_COLORS[item.status] ?? '#2563eb') : '#2563eb',
  }));

  function handleMarkerPress(marker: MapMarker) {
    const item = items.find(i => i.id === marker.id);
    if (item) setSelectedItem(item);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <View>
          <Text className="text-xl font-bold text-gray-900">Site Map</Text>
          <Text className="text-xs text-gray-500">
            {loading ? 'Loading...' : `${items.length} locations`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={load}
          className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center"
        >
          <RefreshCw size={16} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        {loading ? (
          <LoadingSpinner message="Loading site locations..." />
        ) : (
          <OlaMap
            markers={markers}
            onMarkerPress={handleMarkerPress}
            initialCenter={{ latitude: 20.5937, longitude: 78.9629 }}
            initialZoom={4}
            style={StyleSheet.absoluteFillObject}
          />
        )}
      </View>

      {/* Item detail modal */}
      <Modal
        visible={!!selectedItem}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <View className="flex-1 bg-white">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
              <View className="flex-1 mr-4">
                <Text className="text-base font-bold text-gray-900" numberOfLines={2}>
                  {selectedItem.name}
                </Text>
                <Text className="text-xs text-blue-500 mt-0.5">{selectedItem.boardName}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <X size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4 py-3">
              <View className="flex-row flex-wrap gap-2 mb-4">
                {selectedItem.status && <StatusBadge label={selectedItem.status} type="status" />}
                {selectedItem.priority && <StatusBadge label={selectedItem.priority} type="priority" />}
              </View>

              {[
                { label: 'City', value: selectedItem.city },
                { label: 'State', value: selectedItem.state },
                { label: 'Location / Coordinates', value: selectedItem.location },
                { label: 'Property Type', value: selectedItem.propertyType },
                { label: 'Owner', value: selectedItem.owner },
                { label: 'Phone', value: selectedItem.phone },
                { label: 'Email', value: selectedItem.email },
                { label: 'Power Availability', value: selectedItem.powerAvailability },
                { label: 'Investment', value: selectedItem.investment },
                { label: 'Parking', value: selectedItem.availableParking },
                { label: 'Google Rating', value: selectedItem.googleRating?.toString() },
                { label: 'Notes', value: selectedItem.notes },
              ].filter(f => f.value).map(f => (
                <View key={f.label} className="py-2.5 border-b border-gray-100">
                  <Text className="text-xs text-gray-400">{f.label}</Text>
                  <Text className="text-sm text-gray-900 mt-0.5">{f.value}</Text>
                </View>
              ))}
              <View className="h-8" />
            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
});
