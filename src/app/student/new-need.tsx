import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/screen';
import { NeedForm } from '@/features/student/components/NeedForm';
import { studentDemoService } from '@/features/student/service';

export default function NewNeedScreen() {
  return (
    <Screen title="İhtiyacını oluştur">
      <Text style={styles.note}>Örnek mod: veriler cihaz içinde geçici olarak tutulur. Sunucu kaydı ve gerçek kullanıcı bilgisi burada kullanılmaz.</Text>
      <NeedForm
        onSubmit={async (need) => {
          const createdNeed = await studentDemoService.createNeed({
            ...need,
            studentId: 'demo-student',
          });
          router.replace({ pathname: '/student/needs/[id]', params: { id: createdNeed.id } });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    color: '#6b582e',
    backgroundColor: '#fff3d7',
    padding: 16,
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 22,
  },
});
