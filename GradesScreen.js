import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { fetchGrades } from '../services/subjectsService';

function gradeColor(grade) {
  if (!grade || grade === '-') return '#2a4a62';
  const n = parseInt(grade);
  if (n >= 5) return '#43a047';
  if (n === 4) return '#1e88e5';
  if (n === 3) return '#fb8c00';
  if (n <= 2) return '#e53935';
  return '#2a4a62';
}

function gradeLabel(avg) {
  if (!avg) return null;
  const n = parseFloat(avg);
  if (n >= 4.5) return { text: 'Отлично', color: '#43a047' };
  if (n >= 3.5) return { text: 'Хорошо', color: '#1e88e5' };
  if (n >= 2.5) return { text: 'Удовл.', color: '#fb8c00' };
  return { text: 'Плохо', color: '#e53935' };
}

function GradeCell({ grade }) {
  const color = gradeColor(grade);
  const hasGrade = grade && grade !== '-' && !isNaN(parseInt(grade));
  return (
    <View style={[styles.gradeBox, hasGrade && { borderColor: color, backgroundColor: color + '18' }]}>
      <Text style={[styles.gradeText, { color: hasGrade ? color : '#1e3a4f' }]}>
        {hasGrade ? grade : '·'}
      </Text>
    </View>
  );
}

// Сортировки
const SORT_MODES = [
  { key: 'date_asc', label: 'Дата ↑' },
  { key: 'date_desc', label: 'Дата ↓' },
  { key: 'grade_desc', label: 'Оценка ↓' },
  { key: 'grade_asc', label: 'Оценка ↑' },
  { key: 'graded_only', label: 'Только с оценкой' },
];

function sortLessons(lessons, mode) {
  let list = [...lessons];
  if (mode === 'graded_only') list = list.filter((l) => l.grade && l.grade !== '-' && !isNaN(parseInt(l.grade)));
  else if (mode === 'grade_desc') list.sort((a, b) => (parseInt(b.grade) || 0) - (parseInt(a.grade) || 0));
  else if (mode === 'grade_asc') list.sort((a, b) => (parseInt(a.grade) || 0) - (parseInt(b.grade) || 0));
  else if (mode === 'date_desc') list.reverse();
  // date_asc — дефолт, не трогаем
  return list;
}

function LessonRow({ item, index }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, delay: Math.min(index * 25, 500), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[styles.row, index % 2 === 1 && styles.rowAlt, { opacity: fadeAnim }]}>
      <Text style={styles.date}>{item.date}</Text>
      <Text style={styles.theme} numberOfLines={2}>{item.theme}</Text>
      <GradeCell grade={item.grade} />
    </Animated.View>
  );
}

export default function GradesScreen({ subject, onBack }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState('date_asc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    fetchGrades(subject.url)
      .then(setLessons)
      .catch((e) => Alert.alert('Ошибка', e.message))
      .finally(() => setLoading(false));
  }, [subject.url]);

  const graded = lessons.filter((l) => l.grade && l.grade !== '-' && !isNaN(parseInt(l.grade)));
  const avg = graded.length > 0
    ? (graded.reduce((s, l) => s + parseInt(l.grade), 0) / graded.length).toFixed(2)
    : null;
  const label = gradeLabel(avg);
  const dist = [5, 4, 3, 2].map((n) => ({
    n, count: graded.filter((l) => parseInt(l.grade) === n).length, color: gradeColor(String(n)),
  }));

  const displayedLessons = sortLessons(lessons, sortMode);
  const currentSort = SORT_MODES.find((m) => m.key === sortMode);

  return (
    <View style={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onBack(); }} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={2}>{subject.name}</Text>
        <Text style={styles.teacherText}>{subject.teacher}</Text>
      </View>

      {/* Статистика */}
      {avg && (
        <View style={styles.statsBar}>
          <View style={styles.avgBlock}>
            <Text style={[styles.avgValue, { color: label?.color }]}>{avg}</Text>
            <Text style={styles.avgCaption}>средний балл</Text>
            {label && (
              <View style={[styles.labelBadge, { backgroundColor: label.color + '22' }]}>
                <Text style={[styles.labelText, { color: label.color }]}>{label.text}</Text>
              </View>
            )}
          </View>
          <View style={styles.distBlock}>
            {dist.map(({ n, count, color }) => (
              <View key={n} style={styles.distRow}>
                <Text style={[styles.distNum, { color }]}>{n}</Text>
                <View style={styles.distBarBg}>
                  <View style={[styles.distBarFill, { backgroundColor: color, width: graded.length > 0 ? `${(count / graded.length) * 100}%` : '0%' }]} />
                </View>
                <Text style={styles.distCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Панель сортировки */}
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Сортировка:</Text>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => { Haptics.selectionAsync(); setShowSortMenu(!showSortMenu); }}
        >
          <Text style={styles.sortBtnText}>{currentSort?.label} ▾</Text>
        </TouchableOpacity>
      </View>

      {/* Выпадающее меню сортировки */}
      {showSortMenu && (
        <View style={styles.sortMenu}>
          {SORT_MODES.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.sortMenuItem, sortMode === m.key && styles.sortMenuItemActive]}
              onPress={() => { Haptics.selectionAsync(); setSortMode(m.key); setShowSortMenu(false); }}
            >
              <Text style={[styles.sortMenuText, sortMode === m.key && styles.sortMenuTextActive]}>
                {sortMode === m.key ? '✓ ' : '  '}{m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4fc3f7" />
          <Text style={styles.loadingText}>Загружаем оценки...</Text>
        </View>
      ) : lessons.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>Занятия не найдены</Text>
        </View>
      ) : (
        <>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDate, styles.colHead]}>Дата</Text>
            <Text style={[styles.colTheme, styles.colHead]}>Тема занятия</Text>
            <Text style={[styles.colGrade, styles.colHead]}>Оц.</Text>
          </View>
          <FlatList
            data={displayedLessons}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => <LessonRow item={item} index={index} />}
            contentContainerStyle={styles.list}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080f17' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: '#0d1e30', borderBottomWidth: 1, borderBottomColor: '#142840' },
  backBtn: { marginBottom: 10 },
  backText: { color: '#4fc3f7', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#cce5f7', lineHeight: 24, marginBottom: 6 },
  teacherText: { color: '#2a5a7a', fontSize: 12 },
  statsBar: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#0a1825', borderBottomWidth: 1, borderBottomColor: '#142840', gap: 20 },
  avgBlock: { alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  avgValue: { fontSize: 36, fontWeight: '900', lineHeight: 40 },
  avgCaption: { color: '#2a5a7a', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2, marginBottom: 8 },
  labelBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  labelText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  distBlock: { flex: 1, justifyContent: 'center', gap: 5 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distNum: { width: 12, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  distBarBg: { flex: 1, height: 6, backgroundColor: '#0d1e30', borderRadius: 3, overflow: 'hidden' },
  distBarFill: { height: '100%', borderRadius: 3, minWidth: 4 },
  distCount: { width: 20, color: '#2a5a7a', fontSize: 11, textAlign: 'right' },
  sortBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#0d1e30',
  },
  sortLabel: { color: '#1e3a4f', fontSize: 11, letterSpacing: 0.5 },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#0d1e30', borderRadius: 8, borderWidth: 1, borderColor: '#142840' },
  sortBtnText: { color: '#4fc3f7', fontSize: 12, fontWeight: '700' },
  sortMenu: {
    position: 'absolute', right: 16, top: 200, zIndex: 100,
    backgroundColor: '#0d1e30', borderRadius: 12, borderWidth: 1, borderColor: '#142840',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  sortMenuItem: { paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#0a1420' },
  sortMenuItemActive: { backgroundColor: '#0a2040' },
  sortMenuText: { color: '#4a7fa0', fontSize: 13, fontFamily: 'monospace' },
  sortMenuTextActive: { color: '#4fc3f7', fontWeight: '700' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0d1e30', borderBottomWidth: 1, borderBottomColor: '#142840' },
  colHead: { color: '#2a5a7a', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  list: { paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#0a1420' },
  rowAlt: { backgroundColor: '#0a1420' },
  date: { width: 70, color: '#2a5a7a', fontSize: 11, marginRight: 10 },
  theme: { flex: 1, color: '#8ab4cc', fontSize: 13, lineHeight: 18, marginRight: 10 },
  gradeBox: { width: 34, height: 34, borderRadius: 8, borderWidth: 1.5, borderColor: '#0d1e30', justifyContent: 'center', alignItems: 'center' },
  gradeText: { fontSize: 15, fontWeight: '900' },
  colDate: { width: 70, marginRight: 10 },
  colTheme: { flex: 1, marginRight: 10 },
  colGrade: { width: 34, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#4a7fa0', marginTop: 12, fontSize: 14 },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyText: { color: '#2a4a62', fontSize: 15 },
});
