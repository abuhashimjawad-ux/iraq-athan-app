import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, ActivityIndicator, Alert 
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function AdminScreen() {
  // استخدام اسم متغير واضح لتجنب خطأ "Property doesn't exist"
  const [maqamatData, setMaqamatData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [subMaqam, setSubMaqam] = useState('');
  const [driveUrl, setDriveUrl] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // جلب البيانات وترتيبها أبجدياً
      const q = query(collection(db, "maqamat"), orderBy("sub_maqam", "asc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      setMaqamatData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert("خطأ", "فشل جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  const saveToFirebase = async () => {
    if (!name || !subMaqam || !driveUrl) return Alert.alert('تنبيه', 'يرجى ملء جميع الخانات');
    
    try {
      const fileId = driveUrl.match(/[-\w]{25,}/);
      if (!fileId) throw new Error('رابط غير صحيح');
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileId[0]}`;

      await addDoc(collection(db, "maqamat"), {
        name: name,
        sub_maqam: subMaqam,
        audioUrl: directUrl,
        createdAt: new Date()
      });

      Alert.alert('تم الحفظ بنجاح');
      setSubMaqam(''); setDriveUrl('');
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('خطأ', 'تأكد من الرابط');
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>إضافة للموسوعة (88 مقام)</Text>
          <TouchableOpacity onPress={fetchData}>
            <Ionicons name="refresh-circle" size={30} color="#D4AF37" />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <TextInput placeholder="اسم القارئ" value={name} onChangeText={setName} style={styles.input} textAlign="right" />
          <TextInput placeholder="المقام (مثال: 0 - صبا رئيسي)" value={subMaqam} onChangeText={setSubMaqam} style={styles.input} textAlign="right" />
          <TextInput placeholder="رابط جوجل درايف" value={driveUrl} onChangeText={setDriveUrl} style={styles.input} textAlign="right" />
          <TouchableOpacity onPress={saveToFirebase} style={styles.btn}>
            <Text style={{color: '#FFF', fontWeight: 'bold'}}>إضافة للموسوعة الآن</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{padding: 15}}>
          {loading ? (
            <ActivityIndicator size="large" color="#D4AF37" />
          ) : (
            maqamatData.map((item) => {
              // تمييز المقام الرئيسي بظهور أيقونة النجمة
              const isMain = item.sub_maqam?.includes('0') || item.sub_maqam?.includes('رئيسي');
              return (
                <View key={item.id} style={[styles.card, isMain && styles.mainCard]}>
                  <View style={styles.cardContent}>
                    {isMain && <Ionicons name="star" size={20} color="#D4AF37" style={{marginLeft: 10}} />}
                    <View>
                      <Text style={[styles.itemText, isMain && styles.mainText]}>{item.sub_maqam}</Text>
                      <Text style={styles.subText}>{item.name}</Text>
                    </View>
                  </View>
                  <Ionicons name="play-circle" size={24} color={isMain ? "#D4AF37" : "#CCC"} />
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold' },
  form: { padding: 15, backgroundColor: '#FFF', marginBottom: 5 },
  input: { backgroundColor: '#F0F2F5', padding: 12, borderRadius: 10, marginBottom: 10 },
  btn: { backgroundColor: '#D4AF37', padding: 15, borderRadius: 10, alignItems: 'center' },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  mainCard: { borderColor: '#D4AF37', borderWidth: 1.5, backgroundColor: '#FFFDF5' },
  cardContent: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1 },
  itemText: { fontSize: 16, color: '#333', fontWeight: '600', textAlign: 'right' },
  mainText: { color: '#B8860B', fontWeight: 'bold' },
  subText: { fontSize: 13, color: '#777', textAlign: 'right' }
});