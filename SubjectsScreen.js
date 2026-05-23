import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Animated, TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { fetchSubjects, clearSubjectsCache } from '../services/subjectsService';
import { logout } from '../services/authService';

// Скелетон-карточка
function SkeletonCard({ index }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, delay: index * 100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.card, { opacity: pulse }]}>
      <View style={styles.skelNumber} />
      <View style={styles.skelBody}>
        <View style={styles.skelTitle} />
        <View style={styles.skelMeta} />
      </View>
    </Animated.View>
  );
}

function SubjectCard({ item, index, onPress }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress(item);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardNumber}>
          <Text style={styles.cardNumberText}>{String(index + 1).padStart(2, '0')}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.subjectName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.teacher} numberOfLines={1}>{item.teacher}</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SubjectsScreen({ onSelectSubject, onLogout }) {
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [activeSemester, setActiveSemester] = useState('Все');
  const [search, setSearch] = useState('');

  async function loadSubjects(force = false) {
    try {
      const result = await fetchSubjects({ forceRefresh: force });
      setAllSubjects(result.subjects);
      setFromCache(result.fromCache);

      // Если кэш устарел — обновим в фоне
      if (result.stale && !force) {
        fetchSubjects({ forceRefresh: true })
          .then((r) => { setAllSubjects(r.subjects); setFromCache(false); })
          .catch(() => {});
      }
    } catch (e) {
      if (e.message === 'auth') {
        onLogout();
      } else {
        Alert.alert('Ошибка', e.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadSubjects(); }, []);

  // Уникальные семестры из данных, сортируем по номеру
  const semesters = ['Все', ...Array.from(new Set(allSubjects.map((s) => s.semestr).filter(Boolean))).sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b);
    return isNaN(na) || isNaN(nb) ? a.localeCompare(b) : na - nb;
  })];

  // Фильтрация
  const filtered = allSubjects.filter((s) => {
    const matchSem = activeSemester === 'Все' || s.semestr === activeSemester;
    const matchSearch = !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) || s.teacher.toLowerCase().includes(search.toLowerCase());
    return matchSem && matchSearch;
  });

  function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearSubjectsCache();
    logout();
    onLogout();
  }

  return (
    <View style={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>УУСТР</Text>
          <Text style={styles.headerTitle}>Мои предметы</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </View>

      {/* Поиск */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по названию или преподавателю..."
          placeholderTextColor="#1e3a4f"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Фильтр по семестрам */}
      {semesters.length > 2 && (
        <View style={styles.semesterRow}>
          <FlatList
            data={semesters}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.semesterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.semTab, activeSemester === item && styles.semTabActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveSemester(item);
                }}
              >
                <Text style={[styles.semTabText, activeSemester === item && styles.semTabTextActive]}>
                  {item === 'Все' ? 'Все' : `${item} сем.`}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Счётчик + кэш-метка */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          {filtered.length} {filtered.length === 1 ? 'предмет' : filtered.length < 5 ? 'предмета' : 'предметов'}
        </Text>
        {fromCache && <Text style={styles.cacheHint}>из кэша</Text>}
      </View>

      {loading ? (
        <View style={styles.skelList}>
          {[0,1,2,3,4].map((i) => <SkeletonCard key={i} index={i} />)}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyText}>Ничего не найдено</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.url}
          renderItem={({ item, index }) => (
            <SubjectCard item={item} index={index} onPress={onSelectSubject} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadSubjects(true); }}
              tintColor="#4fc3f7"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080f17' },
  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18,
    backgroundColor: '#0d1e30', borderBottomWidth: 1, borderBottomColor: '#142840',
  },
  headerLabel: { fontSize: 11, color: '#2a5a7a', fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#e8f4fd' },
  logoutBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#1a0d0d', borderRadius: 10, borderWidth: 1, borderColor: '#3d1515' },
  logoutText: { color: '#ef5350', fontSize: 13, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d1e30', marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 12, borderWidth: 1, borderColor: '#142840',
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchIcon: { color: '#2a5a7a', fontSize: 18 },
  searchInput: { flex: 1, color: '#cce5f7', fontSize: 14, padding: 0 },
  searchClear: { color: '#2a5a7a', fontSize: 14, paddingHorizontal: 4 },
  semesterRow: { borderBottomWidth: 1, borderBottomColor: '#0d1e30' },
  semesterList: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  semTab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#142840',
    backgroundColor: '#0a1420',
  },
  semTabActive: { backgroundColor: '#0d3060', borderColor: '#1a6fbb' },
  semTabText: { color: '#2a5a7a', fontSize: 13, fontWeight: '600' },
  semTabTextActive: { color: '#64b5f6' },
  countBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 8,
  },
  countText: { color: '#1e3a4f', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  cacheHint: { color: '#1e3a4f', fontSize: 11 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  skelList: { paddingHorizontal: 16, paddingTop: 4 },
  card: {
    backgroundColor: '#0d1e30', borderRadius: 14, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#142840', flexDirection: 'row', alignItems: 'center',
  },
  cardNumber: { width: 28, alignItems: 'center', marginRight: 12 },
  cardNumberText: { fontSize: 11, fontWeight: '800', color: '#1e3a4f', letterSpacing: 1 },
  cardBody: { flex: 1 },
  subjectName: { fontSize: 15, fontWeight: '700', color: '#cce5f7', marginBottom: 5, lineHeight: 21 },
  teacher: { color: '#2a5a7a', fontSize: 12 },
  arrow: { color: '#1e3a4f', fontSize: 22, marginLeft: 8 },
  skelNumber: { width: 20, height: 12, backgroundColor: '#142840', borderRadius: 4, marginRight: 12 },
  skelBody: { flex: 1, gap: 8 },
  skelTitle: { height: 14, backgroundColor: '#142840', borderRadius: 4, width: '80%' },
  skelMeta: { height: 10, backgroundColor: '#0d1e30', borderRadius: 4, width: '50%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyText: { color: '#2a4a62', fontSize: 15 },
});
