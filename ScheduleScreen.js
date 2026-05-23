// =========================
// ЭКРАН РАСПИСАНИЯ
// =========================
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { fetchSchedule } from '../services/scheduleService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

// Цвет для типа занятия
function lessonColor(subject) {
  const s = subject.toLowerCase();
  if (s.includes('лекц') || s.includes('лек')) return '#1565c0';
  if (s.includes('практ') || s.includes('пр ') || s.includes('пр.')) return '#2e7d32';
  if (s.includes('лаб')) return '#6a1b9a';
  if (s.includes('тест') || s.includes('экзам') || s.includes('зачёт')) return '#b71c1c';
  return '#0d47a1';
}

function LessonCard({ lesson }) {
  const color = lessonColor(lesson.subject);
  return (
    <View style={[styles.lessonCard, { borderLeftColor: color }]}>
      <View style={styles.lessonHeader}>
        {lesson.time ? (
          <Text style={styles.lessonTime}>{lesson.time}</Text>
        ) : null}
        {lesson.room ? (
          <View style={[styles.roomBadge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.roomText, { color }]}>{lesson.room}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.lessonSubject}>{lesson.subject}</Text>
      {lesson.teacher ? (
        <Text style={styles.lessonTeacher}>{lesson.teacher}</Text>
      ) : null}
    </View>
  );
}

export default function ScheduleScreen() {
  const [groupInput, setGroupInput] = useState('');
  const [savedGroup, setSavedGroup] = useState('');
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Загружаем сохранённую группу
  useEffect(() => {
    AsyncStorage.getItem('savedGroup').then(g => {
      if (g) {
        setSavedGroup(g);
        setGroupInput(g);
        loadSchedule(g);
      }
    });
  }, []);

  // Определяем текущий день недели
  useEffect(() => {
    const day = new Date().getDay();
    // 0=вс, 1=пн...6=сб -> нам нужно 0=пн...5=сб
    const mapped = day === 0 ? 4 : Math.min(day - 1, 5);
    setSelectedDay(mapped);
  }, []);

  async function loadSchedule(group, url = null) {
    setLoading(true);
    try {
      const data = await fetchSchedule(group || groupInput, url);
      setSchedule(data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!groupInput.trim()) return;
    await AsyncStorage.setItem('savedGroup', groupInput.trim());
    setSavedGroup(groupInput.trim());
    fadeAnim.setValue(0);
    loadSchedule(groupInput.trim());
  }

  const currentDayData = schedule?.days?.[selectedDay];

  return (
    <View style={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Расписание</Text>
      </View>

      {/* Поиск группы */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Группа (напр. К-4М21)"
          placeholderTextColor="#8a9bb0"
          value={groupInput}
          onChangeText={setGroupInput}
          autoCapitalize="characters"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Найти</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4fc3f7" />
          <Text style={styles.loadingText}>Загружаем расписание...</Text>
        </View>
      ) : schedule ? (
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          {/* Заголовок недели */}
          {schedule.weekTitle ? (
            <View style={styles.weekHeader}>
              <Text style={styles.weekTitle}>{schedule.weekTitle}</Text>
            </View>
          ) : null}

          {/* Дни недели */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysRow}>
            {schedule.days.map((day, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dayTab, selectedDay === i && styles.dayTabActive]}
                onPress={() => setSelectedDay(i)}
              >
                <Text style={[styles.dayTabText, selectedDay === i && styles.dayTabTextActive]}>
                  {DAYS_SHORT[i] || day.day.slice(0, 2)}
                </Text>
                {day.lessons.length > 0 && (
                  <View style={[styles.dotBadge, selectedDay === i && styles.dotBadgeActive]} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Название дня */}
          {currentDayData && (
            <Text style={styles.dayFullName}>{currentDayData.day}</Text>
          )}

          {/* Занятия */}
          <ScrollView contentContainerStyle={styles.lessonsContainer}>
            {currentDayData?.lessons?.length > 0 ? (
              currentDayData.lessons.map((lesson, i) => (
                <LessonCard key={i} lesson={lesson} />
              ))
            ) : (
              <View style={styles.emptyDay}>
                <Text style={styles.emptyDayText}>🎉 Занятий нет</Text>
                <Text style={styles.emptyDaySubText}>Свободный день!</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Введите номер группы</Text>
          <Text style={styles.emptySubText}>например: К-4М21</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1b2a' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#132233',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a4f',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#e8f4fd' },
  searchRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    backgroundColor: '#0f2030',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a4f',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#132233',
    borderWidth: 1,
    borderColor: '#1e3a4f',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#e8f4fd',
  },
  searchBtn: {
    backgroundColor: '#1565c0',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  weekHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0f2030',
  },
  weekTitle: { color: '#8a9bb0', fontSize: 12, textAlign: 'center' },
  daysRow: {
    flexGrow: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#132233',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a4f',
  },
  dayTab: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 6,
    minWidth: 44,
  },
  dayTabActive: { backgroundColor: '#1565c0' },
  dayTabText: { color: '#8a9bb0', fontSize: 14, fontWeight: '600' },
  dayTabTextActive: { color: '#fff' },
  dotBadge: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: '#4fc3f7', marginTop: 3,
  },
  dotBadgeActive: { backgroundColor: '#fff' },
  dayFullName: {
    color: '#4fc3f7',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  lessonsContainer: { padding: 16, paddingBottom: 32 },
  lessonCard: {
    backgroundColor: '#132233',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1565c0',
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lessonTime: { color: '#8a9bb0', fontSize: 12, fontWeight: '600' },
  roomBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roomText: { fontSize: 11, fontWeight: '700' },
  lessonSubject: {
    color: '#e8f4fd',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  lessonTeacher: { color: '#8a9bb0', fontSize: 12 },
  emptyDay: { alignItems: 'center', paddingTop: 60 },
  emptyDayText: { fontSize: 32, marginBottom: 8 },
  emptyDaySubText: { color: '#8a9bb0', fontSize: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#8a9bb0', marginTop: 12, fontSize: 14 },
  emptyText: { color: '#e8f4fd', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubText: { color: '#8a9bb0', fontSize: 14 },
});
