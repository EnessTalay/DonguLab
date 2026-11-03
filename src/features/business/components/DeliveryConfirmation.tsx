import { colors } from '@/theme/tokens';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { BusinessModel } from '../use-business';
import { local } from '../styles';

type Props = {
  requestId: string;
  model: Pick<
    BusinessModel,
    | 'activeRequestAction'
    | 'deliveryCodes'
    | 'setDeliveryCodes'
    | 'handleDeliveryConfirmation'
  >;
};

export function DeliveryConfirmation({ requestId, model }: Props) {
  const {
    activeRequestAction,
    deliveryCodes,
    setDeliveryCodes,
    handleDeliveryConfirmation,
  } = model;
  const actionInProgress = activeRequestAction?.requestId === requestId;
  return (
    <View style={local.deliverySection}>
      <Text style={local.label}>Teslimat kodu</Text>
      <TextInput
        accessibilityLabel="6 haneli teslimat kodu"
        value={deliveryCodes[requestId] ?? ''}
        onChangeText={(value) => {
          const digits = value.replace(/\D/g, '').slice(0, 6);
          setDeliveryCodes((current) => ({ ...current, [requestId]: digits }));
        }}
        editable={activeRequestAction?.requestId !== requestId}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="6 rakam"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="oneTimeCode"
        style={[
          local.deliveryInput,
          activeRequestAction?.requestId === requestId && local.disabledButton,
        ]}
      />
      <Text style={local.codeHint}>
        Öğrencinin paylaştığı 6 rakamlı kodu girin.
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={activeRequestAction !== null}
        onPress={() => void handleDeliveryConfirmation(requestId)}
        style={[
          local.actionButton,
          local.approveButton,
          activeRequestAction !== null && local.disabledButton,
        ]}
      >
        {actionInProgress && activeRequestAction?.action === 'delivery' ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={local.actionButtonText}>Teslimatı doğrula</Text>
        )}
      </Pressable>
    </View>
  );
}
