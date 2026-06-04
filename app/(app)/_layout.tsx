import { Tabs } from 'expo-router';
import { Briefcase, LayoutGrid, MapPin, Home, Shield } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f1f5f9',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Boards',
          tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-work"
        options={{
          title: 'My Work',
          tabBarIcon: ({ color, size }) => <Briefcase size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <MapPin size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: user?.role === 'ADMIN' ? undefined : null,
          tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
        }}
      />
      {/* Hidden from tab bar — accessible via header or links */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="workspaces" options={{ href: null }} />
    </Tabs>
  );
}
