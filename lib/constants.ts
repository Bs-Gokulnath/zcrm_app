export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
export const OLA_MAPS_API_KEY = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY ?? '';

export const STATUS_COLORS: Record<string, string> = {
  'Done': '#22c55e',
  'Working on it': '#f59e0b',
  'Stuck': '#ef4444',
  'Not Started': '#94a3b8',
  'In Progress': '#3b82f6',
  'Commissioned': '#00C875',
  'Proposed': '#FDAB3D',
  'Identified': '#0073EA',
  'Rejected': '#E2445C',
};

export const PRIORITY_COLORS: Record<string, string> = {
  'High': '#ef4444',
  'Medium': '#f59e0b',
  'Low': '#22c55e',
  'Critical': '#7c3aed',
};

export const GROUP_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#f97316',
];
