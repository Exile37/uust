// =========================
// SCHEDULE SERVICE
// Парсинг расписания с edu.str.uust.ru
// Не требует авторизации
// =========================

const BASE_URL = 'https://edu.str.uust.ru';

function decodeHtml(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Извлекаем недели для навигации (пред. неделя / след. неделя)
function extractWeekLinks(html) {
  const result = { prev: null, current: null, next: null };
  
  // Ищем ссылки на недели
  const linkRegex = /<a[^>]+href="([^"]*)"[^>]*>([^<]*(?:нед|Нед|week)[^<]*)<\/a>/gi;
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    const href = m[1];
    const text = m[2].toLowerCase();
    if (text.includes('пред')) result.prev = href;
    if (text.includes('след')) result.next = href;
  }
  
  return result;
}

// Извлекаем заголовок недели
function extractWeekTitle(html) {
  const regex = /(\d{2}\/\d{2}\/\d{4})\s*[–-]\s*(\d{2}\/\d{2}\/\d{4})/;
  const m = html.match(regex);
  if (m) return `${m[1]} — ${m[2]}`;
  
  // Альтернативный формат
  const regex2 = /(\d{2}\.\d{2}\.\d{4})\s*[–-]\s*(\d{2}\.\d{2}\.\d{4})/;
  const m2 = html.match(regex2);
  if (m2) return `${m2[1]} — ${m2[2]}`;
  
  return '';
}

// Парсим таблицу расписания
function parseScheduleTable(html) {
  const days = [];
  
  // Находим таблицу
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return days;
  
  const tableHtml = tableMatch[1];
  
  // Извлекаем строки
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [];
  let m;
  while ((m = rowRegex.exec(tableHtml)) !== null) {
    rows.push(m[1]);
  }
  
  if (rows.length === 0) return days;
  
  // Первая строка — заголовки (дни недели)
  const headerRow = rows[0];
  const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
  const headers = [];
  let hm;
  while ((hm = thRegex.exec(headerRow)) !== null) {
    headers.push(decodeHtml(hm[1]));
  }
  
  // Инициализируем дни
  for (let i = 0; i < headers.length; i++) {
    days.push({ day: headers[i], lessons: [] });
  }
  
  // Остальные строки — пары
  for (let r = 1; r < rows.length; r++) {
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let cm;
    while ((cm = tdRegex.exec(rows[r])) !== null) {
      cells.push(cm[1]);
    }
    
    for (let c = 0; c < cells.length && c < days.length; c++) {
      const cellHtml = cells[c];
      if (!cellHtml.trim() || cellHtml.trim() === '&nbsp;') continue;
      
      const text = decodeHtml(cellHtml);
      if (!text.trim()) continue;
      
      // Извлекаем время
      const timeMatch = cellHtml.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
      const time = timeMatch ? `${timeMatch[1]} - ${timeMatch[2]}` : '';
      
      // Извлекаем номер пары
      const numMatch = text.match(/^(\d+)\./);
      const num = numMatch ? numMatch[1] : '';
      
      // Извлекаем аудиторию
      const roomMatch = cellHtml.match(/Пр\s+(\d+[^<\s]*)|ауд[.\s]*(\d+[^<\s]*)/i);
      const room = roomMatch ? (roomMatch[1] || roomMatch[2]) : '';
      
      // Название предмета — ищем жирный текст
      const boldMatch = cellHtml.match(/<b[^>]*>([\s\S]*?)<\/b>/i) || 
                        cellHtml.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
      const subject = boldMatch ? decodeHtml(boldMatch[1]) : text.replace(/^\d+\./, '').trim();
      
      // Преподаватель — последняя строка обычно
      const lines = text.split(/\n|\r/).filter(l => l.trim());
      const teacher = lines.length > 1 ? lines[lines.length - 1].trim() : '';
      
      if (subject) {
        days[c].lessons.push({ num, time, subject, teacher, room });
      }
    }
  }
  
  return days.filter(d => d.day && !d.day.includes('№'));
}

// =========================
// Основная функция получения расписания
// =========================
export async function fetchSchedule(groupName, url = null) {
  const targetUrl = url || `${BASE_URL}/index.php?group_name=${encodeURIComponent(groupName)}`;
  
  const resp = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  
  if (!resp.ok) throw new Error('Не удалось загрузить расписание');
  
  const html = await resp.text();
  
  if (html.includes('группа не найдена') || html.includes('не найден')) {
    throw new Error('Группа не найдена');
  }
  
  const weekTitle = extractWeekTitle(html);
  const weekLinks = extractWeekLinks(html);
  const days = parseScheduleTable(html);
  
  return { weekTitle, weekLinks, days, groupName };
}
