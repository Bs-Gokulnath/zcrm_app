import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, RefreshCw } from 'lucide-react-native';
import { AppHeader } from '../../components/ui/AppHeader';
import { OlaMap, type MapMarker } from '../../components/ui/OlaMap';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { boardsApi } from '../../services/boards';
import { groupsApi, type BoardItem } from '../../services/board-groups';
import { resolveItem, clearAllCaches } from '../../services/geocoding';

interface RawItem extends BoardItem {
  boardId: string;
  boardName: string;
  groupName: string;
  groupColor: string;
}

export default function MapScreen() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [selectedItem, setSelectedItem] = useState<MapMarker | null>(null);
  const cancelRef = useRef(false);

  async function load(clearCache = false) {
    cancelRef.current = true; // cancel any previous run
    await new Promise(r => setTimeout(r, 50));
    cancelRef.current = false;

    if (clearCache) clearAllCaches();
    setLoading(true);
    setMarkers([]);
    setProgress({ done: 0, total: 0 });

    try {
      const boardsRes = await boardsApi.getAll();
      const boards = Array.isArray(boardsRes) ? boardsRes : (boardsRes as any).data ?? [];

      const rawItems: RawItem[] = [];
      await Promise.all(
        boards.map(async (board: any) => {
          try {
            const groupsRes = await groupsApi.getAll(board.id);
            const groups = Array.isArray(groupsRes) ? groupsRes : (groupsRes as any).data ?? [];
            for (const group of groups) {
              for (const item of group.items) {
                rawItems.push({
                  ...item,
                  boardId: board.id,
                  boardName: board.name,
                  groupName: group.name,
                  groupColor: group.color,
                });
              }
            }
          } catch { /* skip boards with errors */ }
        }),
      );

      setProgress({ done: 0, total: rawItems.length });

      const plotted: MapMarker[] = [];
      let done = 0;

      for (const item of rawItems) {
        if (cancelRef.current) break;
        const coords = await resolveItem(item);
        done++;
        if (!cancelRef.current) setProgress({ done, total: rawItems.length });
        if (coords) {
          plotted.push({
            id: item.id,
            latitude: coords[0],
            longitude: coords[1],
            title: item.name,
            city: item.city,
            state: item.state,
            location: item.location,
            status: item.status,
            priority: item.priority,
            owner: item.owner,
            phone: item.phone,
            email: item.email,
            investment: item.investment,
            powerAvailability: item.powerAvailability,
            availableParking: item.availableParking,
            propertyType: item.propertyType,
            googleRating: item.googleRating,
            noOfRatings: item.noOfRatings,
            landOwnerContact: item.landOwnerContact,
            notes: item.notes,
            groupName: item.groupName,
            groupColor: item.groupColor,
          });
        }
      }

      if (!cancelRef.current) setMarkers(plotted);
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => { cancelRef.current = true; };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <AppHeader
        right={
          <TouchableOpacity onPress={() => load(true)}
            className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center">
            <RefreshCw size={16} color="#374151" />
          </TouchableOpacity>
        }
      />

      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0073EA" />
            <Text style={styles.loadingTitle}>Plotting locations…</Text>
            {progress.total > 0 && (
              <>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, {
                    width: `${Math.round((progress.done / progress.total) * 100)}%` as any,
                  }]} />
                </View>
                <Text style={styles.loadingCount}>
                  {progress.done} / {progress.total} items
                </Text>
              </>
            )}
          </View>
        ) : (
          <>
            <OlaMap
              markers={markers}
              onMarkerPress={setSelectedItem}
              style={StyleSheet.absoluteFillObject}
            />
            {markers.length > 0 && (
              <View style={styles.legend}>
                <Text style={styles.legendText}>
                  {markers.length} / {progress.total} plotted
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Item detail modal — OlaMap handles this internally, but global map uses its own */}
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
                  {selectedItem.title}
                </Text>
                {selectedItem.groupName && (
                  <Text className="text-xs mt-0.5" style={{ color: selectedItem.groupColor ?? '#6b7280' }}>
                    {selectedItem.groupName}
                  </Text>
                )}
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
                { label: 'Location', value: selectedItem.location },
                { label: 'Property Type', value: selectedItem.propertyType },
                { label: 'Owner', value: selectedItem.owner },
                { label: 'Phone', value: selectedItem.phone },
                { label: 'Email', value: selectedItem.email },
                { label: 'Power Availability', value: selectedItem.powerAvailability },
                { label: 'Investment', value: selectedItem.investment },
                { label: 'Parking', value: selectedItem.availableParking },
                { label: 'Land Owner', value: selectedItem.landOwnerContact },
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
  mapContainer: { flex: 1, position: 'relative' },
  loadingOverlay: {
    flex: 1, backgroundColor: '#f9fafb',
    justifyContent: 'center', alignItems: 'center', gap: 14, padding: 24,
  },
  loadingTitle: { fontSize: 15, fontWeight: '600', color: '#323338' },
  progressBar: {
    width: 260, height: 6, backgroundColor: '#E6E9EF', borderRadius: 99, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#0073EA', borderRadius: 99 },
  loadingCount: { fontSize: 13, color: '#676879' },
  legend: {
    position: 'absolute', bottom: 24, left: 12,
    backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  legendText: { fontSize: 12, fontWeight: '600', color: '#323338' },
});
