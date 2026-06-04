import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Image,
         Modal, ScrollView, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { OLA_MAPS_API_KEY, STATUS_COLORS, PRIORITY_COLORS } from '../../lib/constants';
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

function buildHTML(apiKey: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"/>
  <style>
    html,body{margin:0;padding:0;width:100%;height:100%;background:#e5e7eb;}
    #map{position:absolute;top:0;bottom:0;left:0;right:0;}
    #status{position:absolute;top:8px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.65);color:#fff;font-size:12px;padding:5px 12px;
      border-radius:20px;font-family:sans-serif;z-index:999;white-space:nowrap;}
  </style>
</head>
<body>
<div id="map"></div>
<div id="status">Loading OLA Maps…</div>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script>
var KEY = '${apiKey}';
var STATUS = document.getElementById('status');
function post(o){ try{ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }catch(e){} }

var map = new maplibregl.Map({
  container:'map',
  style:'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key='+KEY,
  center:[78.9629,20.5937], zoom:4,
  attributionControl:false,
  transformRequest:function(url){
    if(url.indexOf('api.olamaps.io')!==-1 && url.indexOf('api_key=')===-1)
      return{url:url+(url.indexOf('?')!==-1?'&':'?')+'api_key='+KEY};
    return{url:url};
  }
});
map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');

map.on('error',function(e){
  var msg = e.error?e.error.message:'';
  var fatal = msg.indexOf('401')!==-1||msg.indexOf('403')!==-1||msg.indexOf('Failed to fetch')!==-1;
  if(fatal){ STATUS.textContent='Error: '+msg; post({type:'MAP_ERROR',message:msg}); }
});

map.on('load',function(){
  STATUS.style.display='none';
  post({type:'MAP_READY'});
});

function addMarkers(features){
  if(map.getSource('locs')){
    map.getSource('locs').setData({type:'FeatureCollection',features:features});
    return;
  }
  map.addSource('locs',{
    type:'geojson',
    data:{type:'FeatureCollection',features:features},
    cluster:true, clusterMaxZoom:14, clusterRadius:50
  });

  map.addLayer({id:'c-ring',type:'circle',source:'locs',filter:['has','point_count'],
    paint:{'circle-color':'#E2445C','circle-radius':['step',['get','point_count'],32,10,40,50,48],'circle-opacity':0.22}});
  map.addLayer({id:'c-ring2',type:'circle',source:'locs',filter:['has','point_count'],
    paint:{'circle-color':'#E2445C','circle-radius':['step',['get','point_count'],24,10,31,50,38],'circle-opacity':0.42}});
  map.addLayer({id:'clusters',type:'circle',source:'locs',filter:['has','point_count'],
    paint:{'circle-color':'#E2445C','circle-radius':['step',['get','point_count'],18,10,24,50,30]}});
  map.addLayer({id:'c-count',type:'symbol',source:'locs',filter:['has','point_count'],
    layout:{'text-field':'{point_count_abbreviated}','text-size':13},
    paint:{'text-color':'#ffffff'}});

  map.addLayer({id:'pts',type:'circle',source:'locs',filter:['!',['has','point_count']],
    paint:{
      'circle-radius':9,
      'circle-stroke-width':2.5,'circle-stroke-color':'#fff',
      'circle-color':['case',
        ['==',['get','status'],'Commissioned'],'#00C875',
        ['==',['get','status'],'Proposed'],'#FDAB3D',
        ['==',['get','status'],'Identified'],'#0073EA',
        ['==',['get','status'],'In Progress'],'#A25DDC',
        ['==',['get','status'],'Rejected'],'#E2445C',
        ['==',['get','status'],'Done'],'#00C875',
        ['==',['get','status'],'Stuck'],'#E2445C',
        '#0073EA']
    }
  });

  function clusterClick(e){
    var fs=map.queryRenderedFeatures(e.point,{layers:['clusters']});
    if(!fs||!fs.length)return;
    var cid=fs[0].properties.cluster_id, ctr=fs[0].geometry.coordinates;
    var src=map.getSource('locs');
    var r=src.getClusterExpansionZoom(cid,function(err,z){if(!err)map.easeTo({center:ctr,zoom:z+1});});
    if(r&&r.then)r.then(function(z){map.easeTo({center:ctr,zoom:z+1});}).catch(function(){});
  }
  ['clusters','c-ring','c-ring2'].forEach(function(l){ map.on('click',l,clusterClick); });

  map.on('click','pts',function(e){
    if(!e.features||!e.features.length)return;
    var p=e.features[0].properties;
    var coords=e.features[0].geometry.coordinates;
    post({type:'MARKER_PRESS',id:p.id,lng:coords[0],lat:coords[1]});
  });

  ['clusters','c-ring','c-ring2','pts'].forEach(function(l){
    map.on('mouseenter',l,function(){map.getCanvas().style.cursor='pointer';});
    map.on('mouseleave',l,function(){map.getCanvas().style.cursor='';});
  });

  if(features.length===1){
    map.flyTo({center:features[0].geometry.coordinates,zoom:13,duration:600});
  } else if(features.length>1){
    var lngs=features.map(function(f){return f.geometry.coordinates[0];});
    var lats=features.map(function(f){return f.geometry.coordinates[1];});
    map.fitBounds([[Math.min.apply(null,lngs),Math.min.apply(null,lats)],[Math.max.apply(null,lngs),Math.max.apply(null,lats)]],
      {padding:60,maxZoom:13,animate:false});
  }
}

window.addEventListener('message',function(e){
  try{
    var m=JSON.parse(e.data);
    if(m.type==='SET_MARKERS') addMarkers(m.features);
  }catch(ex){}
});
</script>
</body>
</html>`;
}

function ItemDetailModal({ marker, onClose }: { marker: MapMarker; onClose: () => void }) {
  const address = [marker.location, marker.city, marker.state].filter(Boolean).join(', ');
  const thumbUrl = `https://api.olamaps.io/tiles/v1/static/${marker.longitude},${marker.latitude},14/360x160.png?api_key=${OLA_MAPS_API_KEY}`;

  const fields = [
    { label: 'Group',              value: marker.groupName },
    { label: 'State',              value: marker.state },
    { label: 'City',               value: marker.city },
    { label: 'Location',           value: marker.location },
    { label: 'Property Type',      value: marker.propertyType },
    { label: 'Google Rating',      value: marker.googleRating != null ? `${marker.googleRating} ★${marker.noOfRatings ? ` (${marker.noOfRatings})` : ''}` : null },
    { label: 'Land Owner',         value: marker.landOwnerContact },
    { label: 'Phone',              value: marker.phone },
    { label: 'Email',              value: marker.email },
    { label: 'Power Availability', value: marker.powerAvailability },
    { label: 'Owner',              value: marker.owner },
    { label: 'Investment',         value: marker.investment },
    { label: 'Parking',            value: marker.availableParking },
    { label: 'Notes',              value: marker.notes },
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
              <Text style={styles.fieldValue}>{f.value}</Text>
            </View>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function MarkerCard({ marker, onClose, onViewDetail }: {
  marker: MapMarker; onClose: () => void; onViewDetail: () => void;
}) {
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
  const webRef = useRef<WebView>(null);
  const mapReady = useRef(false);
  // Always keep the latest markers accessible without stale closures
  const markersRef = useRef<MapMarker[]>(markers);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  function sendMarkers(list: MapMarker[]) {
    if (!mapReady.current || !webRef.current) return;
    const features = list.map(m => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [m.longitude, m.latitude] },
      properties: { id: m.id, status: m.status ?? '', groupName: m.groupName ?? '' },
    }));
    // injectJavaScript is more reliable than postMessage on mobile WebViews
    webRef.current.injectJavaScript(
      `try{addMarkers(${JSON.stringify(features)})}catch(e){};true;`
    );
  }

  useEffect(() => {
    markersRef.current = markers;
    sendMarkers(markers);
  }, [markers]);

  function handleMessage(e: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'MAP_READY') {
        mapReady.current = true;
        setLoading(false);
        // Use ref so we always send the latest markers, not the stale closure value
        sendMarkers(markersRef.current);
      }
      if (msg.type === 'MAP_ERROR') {
        setLoading(false);
        setError(msg.message);
      }
      if (msg.type === 'MARKER_PRESS') {
        const m = markersRef.current.find(x => x.id === msg.id);
        if (m) {
          const marker = { ...m, latitude: msg.lat, longitude: msg.lng };
          if (onMarkerPress) {
            onMarkerPress(marker);
          } else {
            setSelected(marker);
            setShowDetail(false);
          }
        }
      }
    } catch {}
  }

  return (
    <View style={[styles.root, style]}>
      <WebView
        ref={webRef}
        source={{ html: buildHTML(OLA_MAPS_API_KEY) }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        onError={e => { setLoading(false); setError(e.nativeEvent.description); }}
      />

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#0073EA" />
          <Text style={styles.overlayText}>Loading OLA Maps…</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>Map error: {error}</Text>
        </View>
      )}

      {selected && !showDetail && (
        <View style={styles.cardWrapper}>
          <MarkerCard
            marker={selected}
            onClose={() => setSelected(null)}
            onViewDetail={() => setShowDetail(true)}
          />
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
  webview: { flex: 1, backgroundColor: 'transparent' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', gap: 12 },
  overlayText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  errorOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 13, color: '#dc2626', textAlign: 'center' },
  cardWrapper: { position: 'absolute', top: 12, right: 12, left: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
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
