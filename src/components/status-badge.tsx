import {
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { RequestStatus } from '@/types/domain';
import { requestStatusLabels } from '@/lib/labels';

const palette: Record<
  RequestStatus,
  { backgroundColor: string; borderColor: string; color: string }
> = {
  pending: {
    backgroundColor: '#fff4d9',
    borderColor: '#d9b765',
    color: '#8a6210',
  },
  approved: {
    backgroundColor: '#eaf8ee',
    borderColor: '#6dbc82',
    color: '#1d6a42',
  },
  rejected: {
    backgroundColor: '#fdece8',
    borderColor: '#d57a66',
    color: '#9a3e2c',
  },
  delivered: {
    backgroundColor: '#eaf2ff',
    borderColor: '#6d8fd9',
    color: '#234ea8',
  },
  cancelled: {
    backgroundColor: '#f2f2f2',
    borderColor: '#b7b7b7',
    color: '#5f5f5f',
  },
};

export function StatusBadge({
  status,
  label = requestStatusLabels[status],
  style,
  textStyle,
}: {
  status: RequestStatus;
  label?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { color, ...box } = palette[status];
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 999,
          borderWidth: 1,
        },
        box,
        style,
      ]}
    >
      <Text style={[{ fontSize: 12, fontWeight: '700', color }, textStyle]}>
        {label}
      </Text>
    </View>
  );
}
