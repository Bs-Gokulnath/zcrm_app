import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal,
  Text, TouchableOpacity, View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Upload, X } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { groupsApi } from '../../services/board-groups';

interface Props {
  visible: boolean;
  boardId: string;
  groupId: string;
  groupName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface PreviewRow {
  name: string;
  [key: string]: string;
}

export function ImportModal({ visible, boardId, groupId, groupName, onClose, onSuccess }: Props) {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setFileName(asset.name);

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const workbook = XLSX.read(base64, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (json.length === 0) {
        Alert.alert('Empty file', 'No data rows found in the spreadsheet.');
        return;
      }

      const cols = Object.keys(json[0]);
      setHeaders(cols);

      // Map rows — first column becomes the item name
      const preview: PreviewRow[] = json.slice(0, 100).map((row) => ({
        name: String(row[cols[0]] ?? '').trim(),
        ...Object.fromEntries(cols.slice(1).map((k) => [k, String(row[k] ?? '')])),
      }));

      setRows(preview.filter((r) => r.name));
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not read file.');
    }
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setProgress({ done: 0, total: rows.length });
    let done = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        await groupsApi.createItem(boardId, groupId, row.name);
        done++;
        setProgress({ done, total: rows.length });
      } catch {
        failed++;
      }
    }

    setImporting(false);
    if (failed === 0) {
      Alert.alert('Import complete', `${done} items added to "${groupName}".`);
    } else {
      Alert.alert('Import done with errors', `${done} added, ${failed} failed.`);
    }
    onSuccess();
    handleClose();
  }

  function handleClose() {
    setRows([]);
    setHeaders([]);
    setFileName('');
    setImporting(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
          <Text className="text-lg font-bold text-gray-900">Import from Excel</Text>
          <TouchableOpacity onPress={handleClose}><X size={22} color="#374151" /></TouchableOpacity>
        </View>

        <View className="px-4 pt-4 pb-2">
          <Text className="text-xs text-gray-500 mb-3">
            Import into group: <Text className="font-semibold text-gray-700">{groupName}</Text>
            {' · '}First column becomes the item name.
          </Text>

          <TouchableOpacity
            onPress={handlePickFile}
            className="flex-row items-center justify-center gap-3 border-2 border-dashed border-blue-300 rounded-2xl py-5 bg-blue-50"
          >
            <FileSpreadsheet size={22} color="#2563eb" />
            <View>
              <Text className="text-sm font-semibold text-blue-700">
                {fileName || 'Pick Excel / CSV file'}
              </Text>
              {!fileName && (
                <Text className="text-xs text-blue-400 text-center">.xlsx · .xls · .csv</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {rows.length > 0 && (
          <>
            <View className="px-4 py-2 flex-row items-center justify-between">
              <Text className="text-xs text-gray-500">
                {rows.length} rows found · {headers.length} columns
              </Text>
              <Text className="text-xs text-blue-600 font-medium">{fileName}</Text>
            </View>

            <FlatList
              data={rows.slice(0, 20)}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
              ListHeaderComponent={
                <View className="flex-row bg-gray-100 rounded-t-xl px-3 py-2 mb-1">
                  {headers.slice(0, 3).map((h) => (
                    <Text key={h} className="text-xs font-semibold text-gray-600 flex-1" numberOfLines={1}>
                      {h}
                    </Text>
                  ))}
                </View>
              }
              renderItem={({ item, index }) => (
                <View className={`flex-row px-3 py-2 rounded-lg mb-0.5 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  {headers.slice(0, 3).map((h) => (
                    <Text key={h} className="text-xs text-gray-700 flex-1" numberOfLines={1}>
                      {item[h] ?? item.name}
                    </Text>
                  ))}
                </View>
              )}
              ListFooterComponent={
                rows.length > 20 ? (
                  <Text className="text-xs text-gray-400 text-center py-2">
                    …and {rows.length - 20} more rows
                  </Text>
                ) : null
              }
            />
          </>
        )}

        {importing && (
          <View className="px-4 py-3 flex-row items-center gap-3 bg-blue-50 mx-4 rounded-xl mb-2">
            <ActivityIndicator size="small" color="#2563eb" />
            <Text className="text-sm text-blue-700">
              Importing… {progress.done} / {progress.total}
            </Text>
          </View>
        )}

        {rows.length > 0 && !importing && (
          <View className="px-4 pb-6">
            <Button
              title={`Import ${rows.length} items`}
              onPress={handleImport}
              loading={importing}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}
