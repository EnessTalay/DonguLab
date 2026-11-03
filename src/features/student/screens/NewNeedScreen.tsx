import { colors } from '@/theme/tokens';
import { router } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/screen';
import { NeedForm } from '@/features/student/components/NeedForm';
import { studentService } from '@/features/student/service';

export default function NewNeedScreen() {
  const createdNeedId = useRef<string | null>(null);

  return (
    <Screen title="İhtiyacını oluştur">
      <Text style={styles.note}>
        Malzeme ihtiyaçlarını ve taleplerini buradan yönetebilirsin.
      </Text>
      <NeedForm
        onSubmit={async (need) => {
          const createdNeed = await studentService.createNeed({
            ...need,
          });
          createdNeedId.current = createdNeed.id;
        }}
        onSuccess={() => {
          const createdId = createdNeedId.current;
          if (!createdId) return;
          router.replace({
            pathname: '/student/needs/[id]',
            params: { id: createdId, created: '1' },
          });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    color: colors.warningText,
    backgroundColor: colors.warningSurface,
    padding: 16,
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 22,
  },
});
