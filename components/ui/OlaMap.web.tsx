import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Image,
         Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import maplibregl from 'maplibre-gl';
import { OLA_MAPS_API_KEY } from '../../lib/constants';
import { StatusBadge } from './StatusBadge';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  city?: string;
  state?: string;
  location?: string;
  status?: string;
  priority?: string;
  owner?: string;
  phone?: string;
  email?: string;
  investment?: string;
  powerAvailability?: string;
  availableParking?: string;
  propertyType?: string;
  googleRating?: number | null;
  noOfRatings?: number | null;
  landOwnerContact?: string;
  notes?: string;
  groupName?: string;
  groupColor?: string;
}

interface OlaMapProps {
  markers?: MapMarker[];
  style?: object;
  onMarkerPress?: (marker: MapMarker) => void;
  initialCenter?: { latitude: number; longitude: number };
  initialZoom?: number;
}

const OLA_STYLE = `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${OLA_MAPS_API_KEY}`;

function fixOlaUrl(url: string): string {
  if (!url.includes('api.olamaps.io')) return url;
  url = url.replace(/([?&])key=(?![a-zA-Z])[^&]*/g, (_, s) => s === '?' ? '?' : '')
           .replace(/\?&/g, '?').replace(/&&/g, '&').replace(/[?&]$/, '');
  if (url.includes('/fonts/')) {
    url = url.replace(/(\/fonts\/[^,/?#]*)[^/]*/, (_, p) => p);
  }
  if (!url.includes('api_key=')) {
    url += (url.includes('?') ? '&' : '?') + `api_key=${OLA_MAPS_API_KEY}`;
  }
  return url;
}

function ItemDetailModal({ marker, onClose }: { marker: MapMarker; onClose: () => void }) {
  const address = [marker.location, marker.city, marker.state].filter(Boolean).join(', ');
  const thumbUrl = `https://api.olamaps.io/tiles/v1/static/${marker.longitude},${marker.latitude},14/360x160.png?api_key=${OLA_MAPS_API_KEY}`;
  const fields = [
    { label: 'Group', value: marker.groupName },
    { label: 'State', value: marker.state },
    { label: 'City', value: marker.city },
    { label: 'Location', value: marker.location },
    { label: 'Property Type', value: marker.propertyType },
    { label: 'Google Rating', value: marker.googleRating != null ? `${marker.googleRating} ★${marker.noOfRatings ? ` (${marker.noOfRatings})` : ''}` : null },
    { label: 'Land Owner', value: marker.landOwnerContact },
    { label: 'Phone', value: marker.phone },
    { label: 'Email', value: marker.email },
    { label: 'Power Availability', value: marker.powerAvailability },
    { label: 'Owner', value: marker.owner },
    { label: 'Investment', value: marker.investment },
    { label: 'Parking', value: marker.availableParking },
    { label: 'Notes', value: marker.notes },
  ].filter(f => f.value);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.detailModal}>
        <View style={styles.detailHeader}>
          <View style={{ flex: 1, marginRight: 12 }}>
            {marker.groupName && (
              <View style={[styles.groupTag, { backgroundColor: (marker.groupColor || '#0073EA') + '22', borderColor: (marker.groupColor || '#0073EA') + '55' }]}>
                <View style={[styles.groupDot, { backgroundColor: marker.groupColor || '#0073EA' }]} />
                <Text style={[styles.groupTagText, { color: marker.groupColor || '#0073EA' }]}>{marker.groupName}</Text>
              </View>
            )}
            <Text style={styles.detailTitle}>{marker.title}</Text>
            {address ? <Text style={styles.detailAddress}>📍 {address}</Text> : null}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={18} color="#676879" />
          </TouchableOpacity>
        </View>
        <View style={styles.thumbContainer}>
          <Image source={{ uri: thumbUrl }} style={styles.thumbImage} resizeMode="cover" />
        </View>
        <View style={styles.badgeRow}>
          {marker.status && <StatusBadge label={marker.status} type="status" />}
          {marker.priority && <StatusBadge label={marker.priority} type="priority" />}
        </View>
        <ScrollView style={{ flex: 1 }}>
          {fields.map(f => (
            <View key={f.label} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <Text style={styles.fieldValue}>{f.value as string}</Text>
            </View>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function MarkerCard({ marker, onClose, onViewDetail }: { marker: MapMarker; onClose: () => void; onViewDetail: () => void }) {
  const address = [marker.location, marker.city, marker.state].filter(Boolean).join(', ');
  const thumbUrl = `https://api.olamaps.io/tiles/v1/static/${marker.longitude},${marker.latitude},14/320x140.png?api_key=${OLA_MAPS_API_KEY}`;
  return (
    <View style={styles.card}>
      <View style={styles.cardThumb}>
        <Image source={{ uri: thumbUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <TouchableOpacity onPress={onClose} style={styles.cardClose}>
          <X size={14} color="#323338" />
        </TouchableOpacity>
      </View>
      <View style={styles.cardBody}>
        {marker.groupName && (
          <View style={[styles.groupTag, { backgroundColor: (marker.groupColor || '#0073EA') + '22', borderColor: (marker.groupColor || '#0073EA') + '55', marginBottom: 6 }]}>
            <View style={[styles.groupDot, { backgroundColor: marker.groupColor || '#0073EA' }]} />
            <Text style={[styles.groupTagText, { color: marker.groupColor || '#0073EA' }]}>{marker.groupName}</Text>
          </View>
        )}
        <Text style={styles.cardTitle} numberOfLines={2}>{marker.title}</Text>
        {address ? <Text style={styles.cardAddress} numberOfLines={2}>📍 {address}</Text> : null}
        <View style={styles.cardBadges}>
          {marker.status && <StatusBadge label={marker.status} type="status" />}
          {marker.priority && <StatusBadge label={marker.priority} type="priority" />}
        </View>
        <TouchableOpacity style={styles.viewBtn} onPress={onViewDetail}>
          <Text style={styles.viewBtnText}>View Item</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function OlaMap({ markers = [], style, onMarkerPress }: OlaMapProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<MapMarker[]>(markers);
  const onMarkerPressRef = useRef(onMarkerPress);
  onMarkerPressRef.current = onMarkerPress;
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Inject maplibre CSS once
  useEffect(() => {
    const id = 'maplibre-css';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
    document.head.appendChild(link);
  }, []);

  const updateMarkers = (map: maplibregl.Map, list: MapMarker[]) => {
    const src = map.getSource('locs') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const features = list.map(m => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [m.longitude, m.latitude] },
      properties: { id: m.id, status: m.status ?? '' },
    }));
    src.setData({ type: 'FeatureCollection', features });
    if (list.length === 1) {
      map.flyTo({ center: [list[0].longitude, list[0].latitude], zoom: 13, duration: 600 });
    } else if (list.length > 1) {
      const lngs = list.map(m => m.longitude);
      const lats = list.map(m => m.latitude);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, maxZoom: 13, animate: false }
      );
    }
  };

  const setupLayers = (map: maplibregl.Map) => {
    map.addSource('locs', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true, clusterMaxZoom: 14, clusterRadius: 50,
    });
    map.addLayer({ id: 'c-ring', type: 'circle', source: 'locs', filter: ['has', 'point_count'], paint: { 'circle-color': '#E2445C', 'circle-radius': ['step', ['get', 'point_count'], 32, 10, 40, 50, 48], 'circle-opacity': 0.22 } });
    map.addLayer({ id: 'c-ring2', type: 'circle', source: 'locs', filter: ['has', 'point_count'], paint: { 'circle-color': '#E2445C', 'circle-radius': ['step', ['get', 'point_count'], 24, 10, 31, 50, 38], 'circle-opacity': 0.42 } });
    map.addLayer({ id: 'clusters', type: 'circle', source: 'locs', filter: ['has', 'point_count'], paint: { 'circle-color': '#E2445C', 'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 30] } });
    map.addLayer({ id: 'c-count', type: 'symbol', source: 'locs', filter: ['has', 'point_count'], layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 13 }, paint: { 'text-color': '#ffffff' } });
    map.addLayer({
      id: 'pts', type: 'circle', source: 'locs', filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 9, 'circle-stroke-width': 2.5, 'circle-stroke-color': '#fff',
        'circle-color': ['case',
          ['==', ['get', 'status'], 'Commissioned'], '#00C875',
          ['==', ['get', 'status'], 'Proposed'], '#FDAB3D',
          ['==', ['get', 'status'], 'Identified'], '#0073EA',
          ['==', ['get', 'status'], 'In Progress'], '#A25DDC',
          ['==', ['get', 'status'], 'Rejected'], '#E2445C',
          ['==', ['get', 'status'], 'Done'], '#00C875',
          ['==', ['get', 'status'], 'Stuck'], '#E2445C',
          '#0073EA',
        ],
      },
    });

    ['clusters', 'c-ring', 'c-ring2'].forEach(layer => {
      map.on('click', layer, (e) => {
        const fs = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!fs.length) return;
        const cid = fs[0].properties.cluster_id;
        const coords = (fs[0].geometry as GeoJSON.Point).coordinates as [number, number];
        const s = map.getSource('locs') as maplibregl.GeoJSONSource;
        Promise.resolve(s.getClusterExpansionZoom(cid)).then((z: number) => {
          map.easeTo({ center: coords, zoom: z + 1 });
        }).catch(() => {});
      });
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });

    map.on('click', 'pts', (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const m = markersRef.current.find(x => x.id === feat.properties?.id);
      if (!m) return;
      if (onMarkerPressRef.current) onMarkerPressRef.current(m);
      else { setSelected(m); setShowDetail(false); }
    });
    map.on('mouseenter', 'pts', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'pts', () => { map.getCanvas().style.cursor = ''; });
  };

  // Callback ref — fires when the div mounts in the DOM
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    if (!el || mapRef.current) return;
    const map = new maplibregl.Map({
      container: el,
      style: OLA_STYLE,
      center: [78.9629, 20.5937],
      zoom: 4,
      attributionControl: false,
      transformRequest: (url: string) => ({ url: fixOlaUrl(url) }),
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('load', () => {
      setLoading(false);
      setupLayers(map);
      updateMarkers(map, markersRef.current);
    });
    mapRef.current = map;
  }, []);

  useEffect(() => {
    markersRef.current = markers;
    const map = mapRef.current;
    if (map?.loaded()) updateMarkers(map, markers);
  }, [markers]);

  useEffect(() => {
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  const mapDiv = React.createElement('div', {
    ref: containerRef,
    style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  });

  return (
    <View style={[styles.root, style]}>
      {mapDiv as React.ReactElement}
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#0073EA" />
          <Text style={styles.overlayText}>Loading OLA Maps…</Text>
        </View>
      )}
      {selected && !showDetail && (
        <View style={styles.cardWrapper}>
          <MarkerCard marker={selected} onClose={() => setSelected(null)} onViewDetail={() => setShowDetail(true)} />
        </View>
      )}
      {selected && showDetail && (
        <ItemDetailModal marker={selected} onClose={() => { setShowDetail(false); setSelected(null); }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e5e7eb' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', gap: 12 },
  overlayText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  cardWrapper: { position: 'absolute', top: 12, right: 12, left: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.18)' } as object,
  cardThumb: { height: 140, backgroundColor: '#dde3ea', position: 'relative' },
  cardClose: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#323338', marginBottom: 4, lineHeight: 20 },
  cardAddress: { fontSize: 12, color: '#676879', marginBottom: 10, lineHeight: 18 },
  cardBadges: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  viewBtn: { backgroundColor: '#0073EA', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  viewBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  detailModal: { flex: 1, backgroundColor: '#fff' },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e6e9ef' },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#323338', lineHeight: 24, marginVertical: 6 },
  detailAddress: { fontSize: 12, color: '#676879', lineHeight: 18 },
  closeBtn: { width: 36, height: 36, backgroundColor: '#f5f6f8', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#d0d4e4' },
  thumbContainer: { height: 180, backgroundColor: '#dde3ea', overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  badgeRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 4, flexWrap: 'wrap' },
  fieldRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5f6f8', gap: 12 },
  fieldLabel: { width: 140, fontSize: 13, color: '#676879', fontWeight: '500', flexShrink: 0 },
  fieldValue: { flex: 1, fontSize: 13, color: '#323338', lineHeight: 20 },
  groupTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, borderWidth: 1, gap: 5, marginBottom: 4 },
  groupDot: { width: 7, height: 7, borderRadius: 4 },
  groupTagText: { fontSize: 11, fontWeight: '600' },
});
