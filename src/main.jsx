import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, BarChart3, CalendarDays, Check, ChevronDown, Clock3, Download, FileSpreadsheet, FileText, Info, LogOut, Moon, Sun, UserRound, X, Upload, Trash2, History, Bell } from 'lucide-react';
import { AuthScreen, ProfileModal } from './components/Account.jsx';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import './styles.css';
import './design.css';

const DEFAULT_WORK_MINUTES = 8 * 60 + 48;
const BREAK_MINUTES = 60;
const KEY = 'ponto-days-v1';
const PROFILE_KEY = 'ponto-profile-v1';
const THEME_KEY = 'ponto-theme-v1';
const CALENDAR_VIEW_KEY = 'ponto-calendar-view-v1';
const EXIT_BALANCE_KEY = 'ponto-exit-balance-v1';
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseTime = (s) => s ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)) : null;
const formatDuration = (mins) => `${Math.floor(mins / 60)}h ${pad(mins % 60)}min`;
const formatBalanceCompact = (mins) => `${mins >= 0 ? '+' : '−'}${Math.floor(Math.abs(mins) / 60)}h${pad(Math.abs(mins) % 60)}`;
const minutesToTime = (mins) => {
  const normalized = ((mins % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
};
const monthName = (d) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d);
const dayLong = (d) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(THEME_KEY) === 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  if (authLoading) return <div className="auth-loading"><span className="brand-mark"><Clock3 size={19} /></span><span>Carregando seu espaço…</span></div>;
  if (!session) return <AuthScreen configured={isSupabaseConfigured} darkMode={darkMode} setDarkMode={setDarkMode} />;
  return <ClockApp key={session.user.id} session={session} darkMode={darkMode} setDarkMode={setDarkMode} onSignOut={() => supabase.auth.signOut()} />;
}

function ClockApp({ session, darkMode, setDarkMode, onSignOut }) {
  const today = new Date();
  const [clockNow, setClockNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const isMasterAdmin = session.user.email?.toLowerCase() === 'gaasbrel@gmail.com';
  const [workMinutes, setWorkMinutes] = useState(DEFAULT_WORK_MINUTES);
  const [workMinutesInput, setWorkMinutesInput] = useState('08:48');
  const [workMinutesBusy, setWorkMinutesBusy] = useState(false);
  const [workMinutesMessage, setWorkMinutesMessage] = useState('');
  const [workMinutesError, setWorkMinutesError] = useState('');
  const formatWorkTimeInput = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  useEffect(() => {
    let active = true;
    const loadWorkMinutes = async () => {
      const { data, error } = await supabase.from('app_settings').select('work_minutes').eq('id', 1).maybeSingle();
      if (!active) return;
      if (!error && Number.isInteger(data?.work_minutes) && data.work_minutes > 0) {
        setWorkMinutes(data.work_minutes);
        setWorkMinutesInput(formatWorkTimeInput(data.work_minutes));
      }
    };
    loadWorkMinutes();
    const channel = supabase.channel('app-settings-work-minutes').on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'id=eq.1' }, (payload) => {
      const next = payload.new?.work_minutes;
      if (Number.isInteger(next) && next > 0) { setWorkMinutes(next); setWorkMinutesInput(formatWorkTimeInput(next)); }
    }).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, []);
  async function saveWorkMinutes(event) {
    event.preventDefault();
    if (!isMasterAdmin) return;
    const [hours, minutes] = workMinutesInput.split(':').map(Number);
    const next = hours * 60 + minutes;
    if (!Number.isInteger(next) || next < 1 || next > 1440 || minutes > 59) { setWorkMinutesError('Informe uma jornada entre 00:01 e 24:00.'); return; }
    setWorkMinutesBusy(true); setWorkMinutesError(''); setWorkMinutesMessage('');
    const { error } = await supabase.from('app_settings').upsert({ id: 1, work_minutes: next }, { onConflict: 'id' });
    if (error) setWorkMinutesError(error.message || 'Não foi possível salvar a carga horária.');
    else { setWorkMinutes(next); setWorkMinutesMessage('Carga horária atualizada para todos os usuários.'); }
    setWorkMinutesBusy(false);
  }
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [currentPage, setCurrentPage] = useState('clock');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('ponto-notifications-v1') === 'true');
  const [calendarView, setCalendarView] = useState(() => localStorage.getItem(CALENDAR_VIEW_KEY) || 'month');
  const [calendarFocus, setCalendarFocus] = useState(today);
  const [useBalanceForExit, setUseBalanceForExit] = useState(() => localStorage.getItem(EXIT_BALANCE_KEY) !== 'false');
  const [selected, setSelected] = useState(null);
  const [viewingUser, setViewingUser] = useState({ id: session.user.id, email: session.user.email, full_name: session.user.user_metadata?.full_name || 'Meus pontos' });
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersError, setAdminUsersError] = useState('');
  const activeUser = isMasterAdmin ? viewingUser : { id: session.user.id, email: session.user.email, full_name: session.user.user_metadata?.full_name || 'Meus pontos' };
  const WORK_MINUTES = workMinutes;
  const isViewingOwnData = activeUser.id === session.user.id;
  const userDaysKey = `${KEY}:${activeUser.id}`;
  const [days, setDays] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState('');
  const [syncError, setSyncError] = useState('');
  const lastDaysRef = useRef({});
  const syncQueueRef = useRef(Promise.resolve());
  const [holidays, setHolidays] = useState({});
  const [holidayState, setHolidayState] = useState('loading');
  const [toast, setToast] = useState('');
  const userProfileKey = `${PROFILE_KEY}:${session.user.id}`;
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userProfileKey) || 'null') || { name: session.user.user_metadata?.full_name || 'Meu perfil', photo: '', photoPath: session.user.user_metadata?.avatar_path || '' }; }
    catch { return { name: session.user.user_metadata?.full_name || 'Meu perfil', photo: '', photoPath: session.user.user_metadata?.avatar_path || '' }; }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`);
  const [rangeEnd, setRangeEnd] = useState(dateKey(today));
  const [sheetMessage, setSheetMessage] = useState('');
  const [sheetError, setSheetError] = useState('');
  const [sheetBusy, setSheetBusy] = useState(false);
  const [monthDeleteBusy, setMonthDeleteBusy] = useState(false);
  const importInputRef = useRef(null);

  useEffect(() => localStorage.setItem(CALENDAR_VIEW_KEY, calendarView), [calendarView]);
  useEffect(() => localStorage.setItem(EXIT_BALANCE_KEY, String(useBalanceForExit)), [useBalanceForExit]);
  useEffect(() => {
    if (!notificationsEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      setNotificationsEnabled(false);
      localStorage.setItem('ponto-notifications-v1', 'false');
    }
  }, []);

  useEffect(() => {
    if (!isMasterAdmin) return;
    let active = true;
    supabase.rpc('admin_list_users').then(({ data, error }) => {
      if (!active) return;
      if (error) setAdminUsersError(error.message);
      else { setAdminUsers(data || []); setAdminUsersError(''); }
    });
    return () => { active = false; };
  }, [isMasterAdmin]);

  function changeViewedUser(userId) {
    const nextUser = adminUsers.find((user) => user.id === userId);
    if (!nextUser || nextUser.id === activeUser.id) return;
    setAttendanceLoading(true);
    setAttendanceError('');
    setSyncError('');
    setSelected(null);
    setDays({});
    lastDaysRef.current = {};
    setViewingUser(nextUser);
  }

  async function deleteViewedMonth() {
    if (!isMasterAdmin || monthDeleteBusy) return;
    const start = `${month.getFullYear()}-${pad(month.getMonth() + 1)}-01`;
    const end = dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    const person = activeUser.full_name || activeUser.email;
    if (!window.confirm(`Apagar todos os pontos de ${person} em ${monthName(month)}? Essa ação não pode ser desfeita.`)) return;
    setMonthDeleteBusy(true);
    setSheetError('');
    setSheetMessage('');
    setAttendanceLoading(true);
    try {
      await syncQueueRef.current;
      const { error } = await supabase.from('attendance_records').delete().eq('user_id', activeUser.id).gte('work_date', start).lte('work_date', end);
      if (error) throw error;
      const remainingDays = Object.fromEntries(Object.entries(days).filter(([date]) => date < start || date > end));
      lastDaysRef.current = remainingDays;
      setDays(remainingDays);
      if (isViewingOwnData) localStorage.setItem(userDaysKey, JSON.stringify(remainingDays));
      setSheetMessage(`Pontos de ${monthName(month)} apagados para ${person}.`);
    } catch (error) {
      setSheetError(error.message || 'Não foi possível apagar os pontos do mês.');
    } finally {
      setAttendanceLoading(false);
      setMonthDeleteBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function loadAttendance() {
      setAttendanceLoading(true);
      setAttendanceError('');
      try {
        const { data, error } = await supabase.from('attendance_records').select('work_date, marks').eq('user_id', activeUser.id);
        if (error) throw error;
        const remoteDays = Object.fromEntries((data || []).map((row) => [row.work_date, { marks: row.marks }]));
        let localDays = {};
        try { if (isViewingOwnData) localDays = JSON.parse(localStorage.getItem(userDaysKey) || localStorage.getItem(KEY) || '{}'); }
        catch { /* Ignore a malformed local cache; Supabase remains the source of truth. */ }
        const mergedDays = { ...localDays, ...remoteDays };
        const localOnlyRows = isViewingOwnData ? Object.entries(localDays)
          .filter(([date]) => !Object.hasOwn(remoteDays, date))
          .map(([work_date, record]) => ({ user_id: activeUser.id, work_date, marks: record.marks || [] })) : [];
        if (localOnlyRows.length) {
          const { error: migrationError } = await supabase.from('attendance_records').upsert(localOnlyRows, { onConflict: 'user_id,work_date' });
          if (migrationError) throw migrationError;
        }
        if (!active) return;
        lastDaysRef.current = mergedDays;
        if (isViewingOwnData) {
          localStorage.setItem(userDaysKey, JSON.stringify(mergedDays));
          localStorage.removeItem(KEY);
        }
        setDays(mergedDays);
        setAttendanceLoading(false);
      } catch (error) {
        if (!active) return;
        setAttendanceError(error.message || 'Não foi possível carregar seus pontos.');
        setAttendanceLoading(false);
      }
    }
    loadAttendance();
    return () => { active = false; };
  }, [activeUser.id, isViewingOwnData, userDaysKey]);
  useEffect(() => {
    if (attendanceLoading || attendanceError) return;
    if (isViewingOwnData) localStorage.setItem(userDaysKey, JSON.stringify(days));
    const previous = lastDaysRef.current;
    const changedRows = Object.entries(days)
      .filter(([date, record]) => JSON.stringify(previous[date]) !== JSON.stringify(record))
      .map(([work_date, record]) => ({ user_id: activeUser.id, work_date, marks: record.marks || [] }));
    const removedDates = Object.keys(previous).filter((date) => !Object.hasOwn(days, date));
    lastDaysRef.current = days;
    if (!changedRows.length && !removedDates.length) return;
    syncQueueRef.current = syncQueueRef.current.then(async () => {
      if (changedRows.length) {
        const { error } = await supabase.from('attendance_records').upsert(changedRows, { onConflict: 'user_id,work_date' });
        if (error) throw error;
      }
      if (removedDates.length) {
        const { error } = await supabase.from('attendance_records').delete().eq('user_id', activeUser.id).in('work_date', removedDates);
        if (error) throw error;
      }
      setSyncError('');
    }).catch((error) => setSyncError(error.message || 'Não foi possível sincronizar seus pontos.'));
  }, [days, attendanceLoading, attendanceError, userDaysKey, activeUser.id, isViewingOwnData]);
  useEffect(() => { localStorage.setItem(userProfileKey, JSON.stringify(profile)); }, [profile, userProfileKey]);
  useEffect(() => {
    const path = session.user.user_metadata?.avatar_path || profile.photoPath;
    if (!path) return;
    let active = true;
    supabase.storage.from('avatars').createSignedUrl(path, 60 * 60 * 24 * 7).then(({ data, error }) => {
      if (active && !error && data?.signedUrl) setProfile((current) => ({ ...current, photo: data.signedUrl, photoPath: path }));
    });
    return () => { active = false; };
  }, [session.user.user_metadata?.avatar_path, profile.photoPath]);
  useEffect(() => {
    let alive = true;
    setHolidayState('loading');
    fetch(`https://brasilapi.com.br/api/feriados/v1/${month.getFullYear()}`)
      .then((res) => { if (!res.ok) throw new Error('Feriados indisponíveis'); return res.json(); })
      .then((data) => { if (alive) { setHolidays(Object.fromEntries(data.map((h) => [h.date, h.name]))); setHolidayState('ok'); } })
      .catch(() => { if (alive) setHolidayState('error'); });
    return () => { alive = false; };
  }, [month.getFullYear()]);

  const calendarDays = useMemo(() => {
    if (calendarView === 'day') return [new Date(calendarFocus)];
    if (calendarView === 'week') {
      const start = new Date(calendarFocus);
      start.setDate(start.getDate() - start.getDay());
      return Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
    }
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = first.getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells = Math.ceil((startOffset + count) / 7) * 7;
    return Array.from({ length: cells }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i - startOffset + 1));
  }, [month, calendarView, calendarFocus]);

  const monthEntries = Object.entries(days).filter(([key, record]) => key.startsWith(`${month.getFullYear()}-${pad(month.getMonth() + 1)}`) && record.marks?.length);
  const totalWorked = monthEntries.reduce((sum, [, record]) => sum + workedMinutes(record.marks), 0);
  const completedMonthEntries = monthEntries.filter(([, record]) => record.marks.length === 4);
  const workedDays = completedMonthEntries.length;
  const monthlyBalance = completedMonthEntries.reduce((sum, [, record]) => sum + workedMinutes(record.marks) - WORK_MINUTES, 0);
  const openDay = selected ? days[dateKey(selected)] || { marks: [] } : null;
  const workedToday = days[dateKey(today)] ? workedMinutes(days[dateKey(today)].marks) : 0;
  const todayMarks = days[dateKey(today)]?.marks || [];

  function updateDay(key, updater) {
    setDays((prev) => {
      const current = prev[key] || { marks: [] };
      return { ...prev, [key]: updater(current) };
    });
  }
  function addMark(key, mark) {
    updateDay(key, (record) => ({ ...record, marks: [...record.marks, mark] }));
    setToast('Batida adicionada');
    window.setTimeout(() => setToast(''), 2200);
  }
  function saveMarks(key, marks) {
    updateDay(key, (record) => ({ ...record, marks }));
    setToast('Horários salvos');
    window.setTimeout(() => setToast(''), 2200);
  }
  function markLabel(index) { return ['Entrada', 'Saída para almoço', 'Volta do almoço', 'Fim do expediente'][index] || 'Batida'; }
  function nextMark(marks) { return marks.length < 4 ? markLabel(marks.length) : null; }
  function expectedExit(marks) {
    if (!marks.length) return null;
    const actualBreak = breakLength(marks);
    return minutesToTime(parseTime(marks[0]) + WORK_MINUTES + (actualBreak ?? BREAK_MINUTES));
  }
  function adjustedExit(marks) {
    const offset = exitOffset(marks);
    return offset == null ? null : minutesToTime(parseTime(marks[0]) + offset);
  }
  function exitOffset(marks) {
    if (!marks.length) return null;
    const entryMinutes = parseTime(marks[0]);
    let normalOffset = parseTime(expectedExit(marks)) - entryMinutes;
    if (normalOffset < 0) normalOffset += 1440;
    const balanceBeforeToday = useBalanceForExit ? completedMonthEntries
      .filter(([key]) => key !== dateKey(today))
      .reduce((sum, [, record]) => sum + workedMinutes(record.marks) - WORK_MINUTES, 0) : 0;
    return normalOffset - balanceBeforeToday;
  }
  function minutesUntilExit(marks) {
    const offset = exitOffset(marks);
    if (offset == null) return null;
    const target = new Date(clockNow);
    target.setHours(Math.floor(parseTime(marks[0]) / 60), parseTime(marks[0]) % 60, 0, 0);
    target.setMinutes(target.getMinutes() + offset);
    return Math.floor((target.getTime() - clockNow.getTime()) / 1000);
  }
  function formatCountdown(seconds) {
    const remaining = Math.max(0, seconds);
    return `${pad(Math.floor(remaining / 3600))}:${pad(Math.floor((remaining % 3600) / 60))}:${pad(remaining % 60)}`;
  }
  function markNow() {
    if (todayMarks.length >= 4) return;
    const now = new Date();
    const value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (todayMarks.length && parseTime(value) <= parseTime(todayMarks[todayMarks.length - 1])) {
      setToast('O horário atual precisa ser depois da batida anterior');
      window.setTimeout(() => setToast(''), 2500);
      return;
    }
    addMark(dateKey(today), value);
  }
  async function changeExitNotification(event) {
    const enabled = event.target.checked;
    if (!enabled) {
      setNotificationsEnabled(false);
      localStorage.setItem('ponto-notifications-v1', 'false');
      return;
    }
    if (!window.isSecureContext || !('Notification' in window)) {
      setToast('Este navegador não permite notificações neste endereço.');
      window.setTimeout(() => setToast(''), 3000);
      return;
    }
    try {
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') {
        setToast(permission === 'denied' ? 'Permita notificações nas configurações do navegador.' : 'Permissão para notificações não concedida.');
        window.setTimeout(() => setToast(''), 3000);
        return;
      }
      setNotificationsEnabled(true);
      localStorage.setItem('ponto-notifications-v1', 'true');
      setToast('Aviso de saída ativado: 10 minutos antes.');
      window.setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Não foi possível ativar as notificações neste navegador.');
      window.setTimeout(() => setToast(''), 3000);
    }
  }
  function workedMinutes(marks = []) {
    if (marks.length < 2) return 0;
    let total = 0;
    for (let i = 0; i + 1 < marks.length; i += 2) {
      const a = parseTime(marks[i]);
      let b = parseTime(marks[i + 1]);
      if (a == null || b == null) continue;
      if (b < a) b += 1440;
      total += b - a;
    }
    return total;
  }
  function breakLength(marks) {
    if (marks.length < 3) return null;
    let back = parseTime(marks[2]); let out = parseTime(marks[1]);
    if (back < out) back += 1440;
    return back - out;
  }
  async function exportRange(startValue = rangeStart, endValue = rangeEnd) {
    setSheetError('');
    if (!startValue || !endValue || startValue > endValue) return setSheetError('Escolha um período válido, com a data inicial antes da final.');
    const XLSX = await import('./lib/spreadsheet.js');
    const dates = [];
    for (let date = new Date(`${startValue}T12:00:00`); dateKey(date) <= endValue; date.setDate(date.getDate() + 1)) dates.push(new Date(date));
    const rows = dates.map((date) => {
      const key = dateKey(date);
      const marks = days[key]?.marks || [];
      const complete = marks.length === 4;
      const worked = workedMinutes(marks);
      const balance = complete ? worked - WORK_MINUTES : null;
      return [
        new Intl.DateTimeFormat('pt-BR').format(date),
        new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date),
        holidays[key] || '',
        marks[0] || '', marks[1] || '', marks[2] || '', marks[3] || '',
        marks.length >= 3 ? formatDuration(breakLength(marks)) : '',
        marks.length ? formatDuration(worked) : '',
        balance == null ? '' : `${balance >= 0 ? '+' : '−'}${formatDuration(Math.abs(balance))}`,
        complete ? 'Completo' : marks.length ? 'Incompleto' : 'Sem batidas',
      ];
    });
    const rangeEntries = Object.entries(days).filter(([key, record]) => key >= startValue && key <= endValue && record.marks?.length);
    const rangeWorked = rangeEntries.reduce((sum, [, record]) => sum + workedMinutes(record.marks), 0);
    const rangeComplete = rangeEntries.filter(([, record]) => record.marks.length === 4);
    const rangeBalance = rangeComplete.reduce((sum, [, record]) => sum + workedMinutes(record.marks) - WORK_MINUTES, 0);
    const punchCount = rangeEntries.reduce((sum, [, record]) => sum + record.marks.length, 0);
    const balanceText = rangeComplete.length ? `${rangeBalance >= 0 ? '+' : '−'}${formatDuration(Math.abs(rangeBalance))}` : 'Sem dias completos';
    const summary = XLSX.utils.aoa_to_sheet([
      ['RESUMO DO PERÍODO', `${new Intl.DateTimeFormat('pt-BR').format(new Date(`${startValue}T12:00:00`))} a ${new Intl.DateTimeFormat('pt-BR').format(new Date(`${endValue}T12:00:00`))}`],
      ['Carga diária', formatDuration(WORK_MINUTES)],
      ['Horas trabalhadas', formatDuration(rangeWorked)],
      ['Total de batidas', punchCount],
      ['Dias com quatro batidas', rangeComplete.length],
      ['Saldo acumulado', balanceText],
      ['Como o saldo é calculado', 'Soma dos saldos diários dos dias com quatro batidas.'],
      [],
      ['Saldo diário positivo indica horas extras; negativo indica horas devidas.'],
    ]);
    summary['!cols'] = [{ wch: 31 }, { wch: 76 }];
    const records = XLSX.utils.aoa_to_sheet([
      ['Data', 'Dia da semana', 'Feriado nacional', 'Entrada', 'Saída para almoço', 'Volta do almoço', 'Fim do expediente', 'Intervalo', 'Horas trabalhadas', 'Saldo do dia', 'Status'],
      ...rows,
    ]);
    records['!cols'] = [{ wch: 13 }, { wch: 17 }, { wch: 25 }, { wch: 12 }, { wch: 19 }, { wch: 17 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 17 }, { wch: 16 }];
    records['!autofilter'] = { ref: `A1:K${rows.length + 1}` };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summary, 'Resumo');
    XLSX.utils.book_append_sheet(workbook, records, 'Registros');
    const exportName = ((isViewingOwnData ? profile.name : activeUser.full_name) || activeUser.email || 'usuario').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    XLSX.writeFileXLSX(workbook, `Ponto_${exportName}_${startValue}_a_${endValue}.xlsx`);
  }
  function exportMonthlyPdf() {
    const start = `${month.getFullYear()}-${pad(month.getMonth() + 1)}-01`;
    const end = dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const dates = [];
    for (let date = new Date(`${start}T12:00:00`); dateKey(date) <= end; date.setDate(date.getDate() + 1)) dates.push(new Date(date));
    const rows = dates.map((date) => {
      const key = dateKey(date);
      const marks = days[key]?.marks || [];
      const complete = marks.length === 4;
      const worked = workedMinutes(marks);
      const balance = complete ? worked - WORK_MINUTES : null;
      return `<tr><td>${escapeHtml(new Intl.DateTimeFormat('pt-BR').format(date))}</td><td>${escapeHtml(new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date))}</td><td>${escapeHtml(marks[0] || '—')}</td><td>${escapeHtml(marks[1] || '—')}</td><td>${escapeHtml(marks[2] || '—')}</td><td>${escapeHtml(marks[3] || '—')}</td><td>${marks.length ? escapeHtml(formatDuration(worked)) : '—'}</td><td>${balance == null ? '—' : escapeHtml(formatBalanceCompact(balance))}</td><td>${complete ? 'Completo' : marks.length ? 'Incompleto' : 'Sem batidas'}</td></tr>`;
    }).join('');
    const person = escapeHtml((isViewingOwnData ? profile.name : activeUser.full_name) || activeUser.email || 'Usuário');
    const reportWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!reportWindow) {
      setSheetError('O navegador bloqueou a janela do relatório. Permita pop-ups para exportar em PDF.');
      return;
    }
    reportWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório mensal - ${escapeHtml(monthName(month))}</title><style>
      body{font:12px Arial,sans-serif;color:#24343a;padding:28px}h1{font-size:22px;margin:0 0 5px}p{color:#66757b;margin:5px 0 20px}.stats{display:flex;gap:12px;margin:18px 0}.stats div{border:1px solid #dce5e4;border-radius:8px;padding:12px;flex:1}.stats strong{display:block;font-size:17px;margin-top:5px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #dfe5e5;padding:7px 5px;text-align:left}th{background:#f0f4f3}footer{margin-top:20px;color:#738187;font-size:10px}@media print{body{padding:0}@page{size:landscape;margin:12mm}}</style></head><body>
      <h1>Relatório mensal de ponto</h1><p>${escapeHtml(person)} · ${escapeHtml(monthName(month))} · Jornada diária prevista: ${escapeHtml(formatDuration(WORK_MINUTES))}</p>
      <div class="stats"><div>Horas trabalhadas<strong>${escapeHtml(formatDuration(totalWorked))}</strong></div><div>Dias completos<strong>${workedDays}</strong></div><div>Saldo acumulado<strong>${workedDays ? escapeHtml(formatBalanceCompact(monthlyBalance)) : '—'}</strong></div></div>
      <table><thead><tr><th>Data</th><th>Dia</th><th>Entrada</th><th>Saída almoço</th><th>Volta almoço</th><th>Saída</th><th>Horas</th><th>Saldo</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
      <footer>Gerado pelo Ponto. O intervalo de almoço não conta como hora trabalhada.</footer>
      <script>window.addEventListener('load',()=>window.print());</script></body></html>`);
    reportWindow.document.close();
    setSheetMessage('Relatório aberto para impressão. Escolha “Salvar como PDF” no destino da impressão.');
  }

  async function downloadTemplate() {
    const XLSX = await import('./lib/spreadsheet.js');
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Data', 'Entrada', 'Saída para almoço', 'Volta do almoço', 'Fim do expediente'],
    ]);
    sheet['!cols'] = [{ wch: 16 }, { wch: 13 }, { wch: 21 }, { wch: 18 }, { wch: 21 }];
    const instructions = XLSX.utils.aoa_to_sheet([
      ['MODELO PARA IMPORTAÇÃO DE PONTOS ANTERIORES'],
      ['Preencha uma linha por dia. A data deve ser anterior a hoje.'],
      ['Use datas DD/MM/AAAA e horários HH:MM. As quatro batidas são opcionais, mas devem seguir a ordem.'],
      ['Não altere os títulos das colunas da aba Registros. Linhas sem data serão ignoradas.'],
    ]);
    instructions['!cols'] = [{ wch: 100 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Registros');
    XLSX.utils.book_append_sheet(workbook, instructions, 'Instruções');
    XLSX.writeFileXLSX(workbook, 'Modelo_importacao_pontos.xlsx');
  }
  async function importSpreadsheet(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setSheetError(''); setSheetMessage(''); setSheetBusy(true);
    try {
      const XLSX = await import('./lib/spreadsheet.js');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheet = workbook.Sheets.Registros || workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('A planilha não contém uma aba de registros.');
      const records = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
      const normalize = (s) => String(s).trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const headers = Object.keys(records[0] || {}).reduce((out, key) => ({ ...out, [normalize(key)]: key }), {});
      const dateColumn = headers.data;
      const timeColumns = ['entrada', 'saida para almoco', 'volta do almoco', 'fim do expediente'].map((name) => headers[name]);
      if (!dateColumn || timeColumns.some((col) => !col)) throw new Error('Use o modelo padrão e mantenha os títulos das cinco colunas.');
      function parseSpreadsheetDate(value) {
        if (value instanceof Date && !Number.isNaN(value.getTime())) return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
        if (typeof value === 'number' && Number.isFinite(value)) {
          const date = XLSX.SSF.parse_date_code(value);
          if (date) return `${date.y}-${pad(date.m)}-${pad(date.d)}`;
        }
        const text = String(value ?? '').trim();
        const localDate = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/);
        const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
        if (localDate) {
          const year = Number(localDate[3]) < 100 ? 2000 + Number(localDate[3]) : Number(localDate[3]);
          return `${year}-${pad(localDate[2])}-${pad(localDate[1])}`;
        }
        if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
        return '';
      }
      function parseSpreadsheetTime(value, rowNumber) {
        if (value === '' || value == null) return '';
        if (typeof value === 'string' && !value.trim()) return '';
        let hour; let minute;
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
          hour = value.getUTCHours(); minute = value.getUTCMinutes();
        } else if (typeof value === 'number' && Number.isFinite(value)) {
          const fraction = ((value % 1) + 1) % 1;
          const minutes = Math.round(fraction * 1440) % 1440;
          hour = Math.floor(minutes / 60); minute = minutes % 60;
        } else {
          const text = String(value).trim();
          const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
          if (!match) throw new Error(`Horário inválido na linha ${rowNumber}: ${text}.`);
          hour = Number(match[1]); minute = Number(match[2]);
          if (match[3]) {
            if (hour < 1 || hour > 12) throw new Error(`Horário inválido na linha ${rowNumber}: ${text}.`);
            hour = (hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
          }
        }
        if (hour > 23 || minute > 59) throw new Error(`Horário inválido na linha ${rowNumber}.`);
        return `${pad(hour)}:${pad(minute)}`;
      }
      const todayKey = dateKey(new Date());
      const parsed = records.filter((row) => row[dateColumn] !== '').map((row, index) => {
        const rawDate = row[dateColumn];
        let key = parseSpreadsheetDate(rawDate);
        if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) key = parseSpreadsheetDate(rawDate);
        else {
          const value = String(rawDate).trim();
          const localDate = value.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
          const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (localDate) key = `${localDate[3]}-${pad(localDate[2])}-${pad(localDate[1])}`;
          else if (isoDate) key = `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || Number.isNaN(new Date(`${key}T12:00:00`).getTime()) || dateKey(new Date(`${key}T12:00:00`)) !== key) throw new Error(`Data inválida na linha ${index + 2}.`);
        if (key >= todayKey) throw new Error(`A linha ${index + 2} tem data de hoje ou futura. Só é permitido importar dias anteriores a hoje.`);
        const rawMarks = timeColumns.map((col) => row[col] ?? '');
        const firstBlank = rawMarks.indexOf('');
        if (firstBlank >= 0 && rawMarks.slice(firstBlank).some(Boolean)) throw new Error(`Preencha as batidas em sequência na linha ${index + 2}.`);
        const marks = rawMarks.map((time) => parseSpreadsheetTime(time, index + 2)).filter(Boolean);
        if (marks.some((time, i) => i > 0 && parseTime(time) <= parseTime(marks[i - 1]))) throw new Error(`Confira a ordem das batidas na linha ${index + 2}.`);
        return [key, { marks }];
      });
      if (!parsed.length) throw new Error('Não encontrei linhas com datas para importar.');
      if (new Set(parsed.map(([key]) => key)).size !== parsed.length) throw new Error('A planilha tem mais de uma linha para a mesma data.');
      const collisions = parsed.filter(([key]) => days[key]?.marks?.length).length;
      if (collisions && !window.confirm(`${collisions} dia(s) já têm registros e serão substituídos. Deseja continuar?`)) return;
      setDays((current) => ({ ...current, ...Object.fromEntries(parsed) }));
      setSheetMessage(`${parsed.length} dia(s) importado(s). Os registros serão sincronizados com sua conta.`);
    } catch (error) { setSheetError(error.message || 'Não foi possível ler essa planilha.'); }
    finally { setSheetBusy(false); }
  }
  async function saveProfile({ name, photoFile }) {
    let photo = profile.photo;
    let photoPath = profile.photoPath || session.user.user_metadata?.avatar_path || '';
    if (photoFile) {
      photoPath = `${session.user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(photoPath, photoFile, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
      if (uploadError) throw uploadError;
      const { data, error: signedUrlError } = await supabase.storage.from('avatars').createSignedUrl(photoPath, 60 * 60 * 24 * 7);
      if (signedUrlError) throw signedUrlError;
      photo = data.signedUrl;
    }
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim(), avatar_path: photoPath || null } });
    if (error) throw error;
    setProfile({ name: name.trim(), photo, photoPath });
    setProfileOpen(false);
    setToast('Perfil atualizado');
    window.setTimeout(() => setToast(''), 2200);
  }
  function changePeriod(delta) {
    const next = new Date(calendarFocus);
    if (calendarView === 'month') next.setMonth(next.getMonth() + delta, 1);
    else if (calendarView === 'week') next.setDate(next.getDate() + delta * 7);
    else next.setDate(next.getDate() + delta);
    setCalendarFocus(next);
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }
  function changeCalendarView(view) {
    setCalendarView(view);
    if (view !== 'month') setCalendarFocus(selected || today);
  }
  const calendarTitle = calendarView === 'month' ? monthName(month) : calendarView === 'day' ? dayLong(calendarFocus) : `${new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(calendarDays[0])} – ${new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(calendarDays[6])}`;

  const todayExpected = expectedExit(todayMarks);
  const todayAdjustedExit = adjustedExit(todayMarks);
  const exitCountdown = minutesUntilExit(todayMarks);

  useEffect(() => {
    if (!notificationsEnabled || attendanceLoading || attendanceError || !isViewingOwnData || !todayMarks.length || !('Notification' in window) || Notification.permission !== 'granted') return;
    const entry = parseTime(todayMarks[0]);
    const offset = exitOffset(todayMarks);
    if (entry == null || offset == null) return;
    const target = new Date();
    target.setHours(Math.floor(entry / 60), entry % 60, 0, 0);
    target.setMinutes(target.getMinutes() + offset);
    const now = Date.now();
    if (target.getTime() <= now) return;
    const reminderAt = target.getTime() - 10 * 60 * 1000;
    const targetLabel = minutesToTime(target.getHours() * 60 + target.getMinutes());
    const reminderKey = `ponto-exit-notified:${session.user.id}:${dateKey(today)}:${targetLabel}`;
    if (localStorage.getItem(reminderKey) === 'true') return;
    const timer = window.setTimeout(() => {
      if (localStorage.getItem(reminderKey) === 'true' || Notification.permission !== 'granted') return;
      try {
        new Notification('Sua saída está chegando', {
          body: `Sua previsão de saída é às ${targetLabel}.`,
          tag: `ponto-saida-${dateKey(today)}-${targetLabel}`,
        });
        localStorage.setItem(reminderKey, 'true');
      } catch {
        setToast('Não foi possível mostrar o aviso de saída.');
        window.setTimeout(() => setToast(''), 3000);
      }
    }, Math.max(0, reminderAt - now));
    return () => window.clearTimeout(timer);
  }, [notificationsEnabled, attendanceLoading, attendanceError, isViewingOwnData, todayMarks.join('|'), useBalanceForExit, days, activeUser.id, session.user.id]);

  if (attendanceLoading) return <div className="auth-loading"><span className="brand-mark"><Clock3 size={19} /></span><span>Carregando seus pontos…</span></div>;
  if (attendanceError) return <div className="auth-loading"><span>Não foi possível carregar seus pontos.</span><small>{attendanceError}</small><button className="done-button" onClick={() => window.location.reload()}>Tentar novamente</button></div>;

  const allHistory = Object.entries(days).filter(([, record]) => record.marks?.length).sort(([a], [b]) => b.localeCompare(a));
  const navTo = (page) => { setCurrentPage(page); setSelected(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Ponto início"><span className="brand-mark"><Clock3 size={19} strokeWidth={2.4} /></span><span>Ponto<span className="brand-dot">.</span></span></a>
      <nav className="primary-nav" aria-label="Navegação principal">
        {[[Clock3,'Ponto','clock'],[BarChart3,'Dashboard','dashboard'],[FileText,'Relatórios','report'],[History,'Histórico','history']].map(([Icon,label,page])=><button type="button" key={page} className={currentPage===page?'active':''} onClick={() => navTo(page)} aria-current={currentPage===page?'page':undefined}><Icon size={16}/><span>{label}</span></button>)}
      </nav>
      <div className="topbar-right">
        {isMasterAdmin && <label className="calendar-user-picker"><span>Ver pontos de</span><select value={activeUser.id} onChange={(event) => changeViewedUser(event.target.value)} aria-label="Selecionar usuário para ver os pontos"><option value={session.user.id}>Meus pontos ({profile.name || session.user.email})</option>{adminUsers.filter((user) => user.id !== session.user.id).map((user) => <option key={user.id} value={user.id}>{user.full_name || user.email}</option>)}</select></label>}
        <details className="profile-menu"><summary aria-label="Abrir opções do perfil">{profile.photo ? <img className="avatar avatar-photo" src={profile.photo} alt="" /> : <span className="avatar">{(profile.name || 'P').trim().slice(0, 1).toUpperCase()}</span>}<span className="profile-name">{profile.name || 'Meu perfil'}</span><ChevronDown size={14} /></summary><div className="profile-dropdown"><div className="dropdown-identity">{profile.photo ? <img className="avatar avatar-photo" src={profile.photo} alt="" /> : <span className="avatar">{(profile.name || 'P').trim().slice(0, 1).toUpperCase()}</span>}<span><strong>{profile.name || 'Meu perfil'}</strong><small>{session.user.email}</small></span></div><button onClick={() => { setProfileOpen(true); document.querySelector('.profile-menu')?.removeAttribute('open'); }}><UserRound size={16} />Editar perfil</button><button onClick={() => setDarkMode((value) => !value)}>{darkMode ? <Sun size={16} /> : <Moon size={16} />}{darkMode ? 'Modo claro' : 'Modo escuro'}<span className={`theme-switch ${darkMode ? 'on' : ''}`} /></button><label className="profile-notification-toggle"><Bell size={16}/><span>Aviso da saída · 10 min antes</span><span className={`theme-switch ${notificationsEnabled?'on':''}`}/><input type="checkbox" checked={notificationsEnabled} onChange={changeExitNotification} aria-label="Avisar 10 minutos antes da previsão de saída"/></label><button onClick={onSignOut}><LogOut size={16} />Sair</button></div></details>
      </div>
    </header>

    <section className="welcome-row"><div><p className="eyebrow">{({clock:'SUA ROTINA',dashboard:'VISÃO GERAL',report:'ACOMPANHAMENTO',history:'SEUS REGISTROS',notifications:'PREFERÊNCIAS'})[currentPage]}</p><h1>{currentPage==='clock'?'Lançamento de horas':currentPage==='dashboard'?'Dashboard':({report:'Relatório mensal',history:'Histórico completo',notifications:'Notificações de horário'})[currentPage]}<span className="greeting-dot">.</span></h1><p className="welcome-sub">{currentPage==='clock'?'Acompanhe sua jornada e registre os horários do dia.':currentPage==='dashboard'?'Resumo das suas horas e do seu saldo neste mês.':'Acompanhe sua rotina de trabalho em um só lugar.'}</p>{adminUsersError && isMasterAdmin && <p className="form-error">Não foi possível carregar a lista de usuários: {adminUsersError}</p>}</div><div className="date-chip"><CalendarDays size={17} /><span>{new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(today)}</span></div></section>

    {currentPage==='clock'&&<section className="overview-grid" id="dashboard">
      <article className="recent-card hours-card"><div className="card-heading"><div><p className="eyebrow">VISÃO GERAL DO MÊS</p><h3>{isViewingOwnData ? 'Suas horas' : `Horas de ${activeUser.full_name || activeUser.email}`}</h3></div></div><div className={`monthly-balance ${monthlyBalance >= 0 ? 'positive' : 'negative'}`}><span className="monthly-balance-icon"><Clock3 size={19} /></span><div><small>SALDO ACUMULADO</small><strong>{workedDays ? `${monthlyBalance >= 0 ? '+' : '−'}${formatDuration(Math.abs(monthlyBalance))}` : '—'}</strong></div><span className="monthly-balance-label">{workedDays ? monthlyBalance >= 0 ? 'Horas extras' : 'Horas devidas' : 'Sem dias completos'}</span></div><div className="hours-card-foot"><span>{formatDuration(totalWorked)} trabalhadas</span><span>{workedDays} {workedDays === 1 ? 'dia completo' : 'dias completos'}</span></div></article>
      <article className="exit-card"><div className="exit-icon"><Clock3 size={19} /></div><div className="exit-label">PREVISÃO DE SAÍDA</div><label className="exit-balance-toggle"><input type="checkbox" checked={useBalanceForExit} onChange={(event) => setUseBalanceForExit(event.target.checked)} />Usar saldo de horas</label>{todayExpected ? <><div className="exit-estimates"><div><small>{useBalanceForExit ? 'Com saldo' : 'Prevista'}</small><strong>{useBalanceForExit ? todayAdjustedExit : todayExpected}</strong></div></div><div className="exit-note">{useBalanceForExit ? `Saldo acumulado: ${formatBalanceCompact(monthlyBalance)}` : 'Considerando apenas a jornada de hoje'}</div><div className="exit-countdown exit-countdown-card"><Clock3 size={14} /><strong>{exitCountdown > 0 ? `Faltam ${formatCountdown(exitCountdown)}` : 'Horário previsto atingido'}</strong><small>até a saída</small></div></> : <><div className="exit-placeholder">— — : — —</div><div className="exit-note">Registre a entrada para calcular</div><div className="exit-countdown exit-countdown-card waiting"><Clock3 size={14} /><strong>Contador aguardando entrada</strong></div></>}</article>
    </section>}

    {currentPage==='clock'&&<section className="calendar-section" id="calendar">
      <div className="section-heading"><div><p className="eyebrow">ACOMPANHAMENTO</p><h2>{isViewingOwnData ? 'Seu calendário' : `Calendário de ${activeUser.full_name || activeUser.email}`}</h2></div><div className="month-controls"><div className="calendar-view-picker" role="group" aria-label="Visualização do calendário">{[['month','Mês'],['week','Semana'],['day','Dia']].map(([view,label]) => <button key={view} className={calendarView === view ? 'active' : ''} onClick={() => changeCalendarView(view)} aria-pressed={calendarView === view}>{label}</button>)}</div><button className="icon-button" onClick={() => changePeriod(-1)} aria-label="Período anterior"><ArrowLeft size={17} /></button><span className="month-title">{calendarTitle}</span><button className="icon-button" onClick={() => changePeriod(1)} aria-label="Próximo período"><ArrowRight size={17} /></button></div></div>
      <div className={`calendar-card calendar-view-${calendarView}`}>
        {calendarView !== 'day' && <div className="weekdays">{(calendarView === 'week' ? calendarDays : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']).map((d) => <div key={typeof d === 'string' ? d : dateKey(d)}>{typeof d === 'string' ? d : new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric' }).format(d)}</div>)}</div>}
        <div className="calendar-grid">{calendarDays.map((day, idx) => {
          const key = dateKey(day); const inMonth = calendarView !== 'month' || day.getMonth() === month.getMonth(); const isToday = key === dateKey(today); const record = days[key]; const marks = record?.marks || []; const progress = workedMinutes(marks); const completed = marks.length === 4; const balance = progress - WORK_MINUTES; const holiday = holidays[key];
          if (calendarView === 'day') return <DayViewCard key={key} date={day} marks={marks} holiday={holiday} onSave={(nextMarks) => saveMarks(key, nextMarks)} workedMinutes={workedMinutes} expectedExit={expectedExit} onRegisterNow={(nextMarks) => saveMarks(key, nextMarks)} workMinutes={WORK_MINUTES} />;
          return <button key={`${key}-${idx}`} className={`day-cell ${inMonth ? '' : 'outside'} ${isToday ? 'is-today' : ''} ${holiday ? 'is-holiday' : ''}`} onClick={() => { setCalendarFocus(day); if (calendarView === 'month') setMonth(new Date(day.getFullYear(), day.getMonth(), 1)); setSelected(day); }} aria-label={`${dayLong(day)}${holiday ? `, feriado ${holiday}` : ''}`}>
            <span className="day-number">{day.getDate()}</span>{holiday && <span className="holiday-dot" />}{completed ? <span className={`day-status day-balance ${balance >= 0 ? 'complete' : 'shortfall'}`} title={`Saldo: ${balance >= 0 ? '+' : '−'}${formatDuration(Math.abs(balance))}`}><i />{formatBalanceCompact(balance)}</span> : marks.length ? <span className="day-status"><i />{progress ? formatDuration(progress) : 'Em andamento'}</span> : <span className="day-empty">{holiday ? 'Feriado' : ' '}</span>}
          </button>;
        })}</div>
        <div className="calendar-legend"><span><i className="legend-complete" />Jornada completa</span><span><i className="legend-progress" />Em andamento</span>{holidayState === 'loading' ? <span className="holiday-note">Buscando feriados…</span> : holidayState === 'error' ? <span className="holiday-note">Feriados indisponíveis</span> : <span><i className="legend-holiday" />Feriado nacional</span>}</div>
      </div>
    </section>}

    {currentPage==='dashboard'&&<section className="monthly-report-section dashboard-page" id="month-report">
      <div className="section-heading report-heading"><div><p className="eyebrow">DASHBOARD</p><h2>Horas por dia</h2></div><span className="month-title">{monthName(month)}</span></div>
      <div className="report-chart-card"><div className="report-chart" role="group" aria-label={`Gráfico de horas trabalhadas por dia em ${monthName(month)}`}>
        {Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => {
          const day = new Date(month.getFullYear(), month.getMonth(), index + 1);
          const key = dateKey(day);
          const marks = days[key]?.marks || [];
          const minutes = workedMinutes(marks);
          const balance = minutes - WORK_MINUTES;
          const status = marks.length !== 4 ? 'partial' : balance < 0 ? 'below' : balance === 0 ? 'exact' : 'above';
          const balanceLabel = marks.length === 4 ? `Saldo ${balance >= 0 ? '+' : '−'}${formatDuration(Math.abs(balance))}` : 'Dia em andamento';
          return <div className="chart-column" key={key} role="img" tabIndex="0" aria-label={`${day.getDate()} de ${monthName(month)}: ${marks.length ? `${formatDuration(minutes)} trabalhadas. ${balanceLabel}.` : 'sem registros'}`}><div className="chart-tooltip" aria-hidden="true"><strong>{marks.length ? formatDuration(minutes) : 'Sem registros'}</strong><span>{marks.length ? 'trabalhadas' : 'neste dia'}</span>{marks.length === 4 && <small>{balance >= 0 ? '+' : '−'}{formatDuration(Math.abs(balance))} de saldo</small>}</div><div className={`chart-bar ${status}`} style={{ height: `${Math.max(minutes ? Math.min(minutes / (WORK_MINUTES * 1.5) * 100, 100) : 0, minutes ? 4 : 1)}%` }} /><span className="chart-label">{day.getDate()}</span></div>;
        })}
      </div><div className="chart-axis"><span>0h</span><span>Meta diária: {formatDuration(WORK_MINUTES)}</span></div><div className="chart-legend"><span><i className="below"/>Abaixo da carga</span><span><i className="exact"/>Carga cumprida</span><span><i className="above"/>Acima da carga</span></div></div>
    </section>}

    {isMasterAdmin && <section className="page-panel work-settings"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h2>Carga horária global</h2><p>Esta jornada vale para todas as contas e atualiza os saldos e previsões.</p></div><form onSubmit={saveWorkMinutes}><label>Jornada diária <input type="time" value={workMinutesInput} onChange={(event) => setWorkMinutesInput(event.target.value)} required /></label><button className="tool-button primary" type="submit" disabled={workMinutesBusy}>{workMinutesBusy ? 'Salvando…' : 'Salvar para todos'}</button>{(workMinutesError || workMinutesMessage) && <p className={`sheet-feedback ${workMinutesError ? 'error' : ''}`} role="status">{workMinutesError || workMinutesMessage}</p>}</form></section>}

    {currentPage==='report'&&<section className="monthly-report-section report-page" id="month-report"><div className="section-heading report-heading"><div><p className="eyebrow">FECHAMENTO</p><h2>Relatório de {monthName(month)}</h2></div><button className="tool-button primary" onClick={exportMonthlyPdf}><FileText size={15} />Exportar PDF</button></div>
      <div className="report-table-card"><div className="report-summary-grid"><div><span>Horas trabalhadas</span><strong>{formatDuration(totalWorked)}</strong></div><div><span>Dias completos</span><strong>{workedDays}</strong></div><div><span>Saldo acumulado</span><strong className={monthlyBalance < 0 ? 'negative-text' : ''}>{workedDays ? formatBalanceCompact(monthlyBalance) : '—'}</strong></div><div><span>Batidas registradas</span><strong>{monthEntries.reduce((sum, [, record]) => sum + (record.marks?.length || 0), 0)}</strong></div></div></div>
      <div className="report-days-card"><div className="report-days-heading"><h3>Horas trabalhadas por dia</h3><span>{monthEntries.length} {monthEntries.length===1?'dia registrado':'dias registrados'}</span></div><div className="report-days-list">{monthEntries.slice().sort(([a],[b])=>a.localeCompare(b)).map(([key,record])=><div className="report-day-row" key={key}><span>{new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'numeric',month:'short'}).format(new Date(`${key}T12:00:00`))}</span><strong>{formatDuration(workedMinutes(record.marks))}</strong></div>)}</div>{monthEntries.length===0&&<p className="report-days-empty">Nenhuma hora registrada neste mês.</p>}</div>
      <div className="spreadsheet-tools" id="spreadsheet-tools"><div className="spreadsheet-actions"><button className="tool-button" onClick={downloadTemplate}><FileSpreadsheet size={15}/>Baixar modelo</button><button className="tool-button" onClick={()=>importInputRef.current?.click()} disabled={sheetBusy}><Upload size={15}/>{sheetBusy?'Importando…':'Importar planilha'}</button>{isMasterAdmin&&<button className="tool-button danger-button" onClick={deleteViewedMonth} disabled={monthDeleteBusy||attendanceLoading}><Trash2 size={14}/>{monthDeleteBusy?'Apagando…':'Apagar mês inteiro'}</button>}<input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={importSpreadsheet} hidden/></div>
        <form className="period-export" id="period-export" onSubmit={event=>{event.preventDefault();exportRange();}}><label>De <input aria-label="Data inicial do período" type="date" value={rangeStart} onChange={event=>setRangeStart(event.target.value)} required/></label><label>Até <input aria-label="Data final do período" type="date" value={rangeEnd} onChange={event=>setRangeEnd(event.target.value)} required/></label><button className="tool-button primary" type="submit"><Download size={15}/>Exportar Excel</button></form>
        {(sheetError||sheetMessage)&&<p className={`sheet-feedback ${sheetError?'error':''}`} role="status">{sheetError||sheetMessage}</p>}
      </div>
    </section>}

    {currentPage==='history'&&<section className="page-panel history-panel" id="history"><div className="section-heading"><div><p className="eyebrow">SEUS REGISTROS</p><h2>Histórico completo</h2></div><span className="month-title">{allHistory.length} dias registrados</span></div><div className="history-list">{allHistory.length?allHistory.map(([key,record])=><article key={key}><div><strong>{dayLong(new Date(`${key}T12:00:00`))}</strong><small>{record.marks.length===4?'Jornada completa':'Em andamento'}</small></div><span>{record.marks.map((mark,index)=><b key={index}>{['Entrada','Almoço','Retorno','Saída'][index]} <em>{mark}</em></b>)}</span><strong>{formatDuration(workedMinutes(record.marks))}</strong></article>):<p className="empty-history">Seus registros aparecerão aqui.</p>}</div></section>}
    <footer className="footer"><span>Feito para uma rotina mais leve.</span><span><i /> Seus dados sincronizam com segurança</span></footer>
    {syncError && <div className="auth-message error" role="status">Falha ao sincronizar seus pontos: {syncError}</div>}

    {selected && <DayModal date={selected} record={openDay} holiday={holidays[dateKey(selected)]} onClose={() => setSelected(null)} onSaveMarks={(marks) => saveMarks(dateKey(selected), marks)} expected={expectedExit(openDay.marks)} worked={workedMinutes(openDay.marks)} breakLength={breakLength(openDay.marks)} workMinutes={WORK_MINUTES} />}
    {profileOpen && <ProfileModal profile={profile} onSave={saveProfile} onClose={() => setProfileOpen(false)} />}
    {toast && <div className="toast"><span><Check size={15} /></span>{toast}</div>}
  </main>;
}

function DayViewCard({ date, marks, holiday, onSave, workedMinutes, expectedExit, onRegisterNow, workMinutes }) {
  const key = dateKey(date);
  const today = key === dateKey(new Date());
  const [times, setTimes] = useState(() => Array.from({ length: 4 }, (_, index) => marks[index] || ''));
  const [error, setError] = useState('');
  useEffect(() => {
    setTimes(Array.from({ length: 4 }, (_, index) => marks[index] || ''));
    setError('');
  }, [key, marks.join('|')]);
  const filled = times.filter(Boolean);
  const worked = workedMinutes(filled);
  const remaining = Math.max(workMinutes - worked, 0);
  const expected = expectedExit(filled);
  function validate(candidate) {
    if (candidate.some((time, index) => !time && candidate.slice(index + 1).some(Boolean))) return 'Preencha os horários em sequência, sem pular uma batida.';
    if (candidate.some((time, index) => time && !/^\d{2}:\d{2}$/.test(time))) return 'Confira os horários preenchidos.';
    if (candidate.some((time, index) => index > 0 && time && candidate[index - 1] && parseTime(time) <= parseTime(candidate[index - 1]))) return 'Os horários precisam estar em ordem crescente.';
    return '';
  }
  function save(candidate = times) {
    const validationError = validate(candidate);
    if (validationError) { setError(validationError); return false; }
    onSave(candidate.filter(Boolean));
    setError('');
    return true;
  }
  function registerNow() {
    const nextIndex = times.findIndex((time) => !time);
    if (nextIndex < 0) return;
    const now = new Date();
    const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const candidate = [...times];
    candidate[nextIndex] = currentTime;
    const validationError = validate(candidate);
    if (validationError) { setError(validationError); return; }
    setTimes(candidate);
    onRegisterNow(candidate.filter(Boolean));
    setError('');
  }
  function clearFrom(index) {
    const candidate = times.map((time, position) => position >= index ? '' : time);
    setTimes(candidate);
    setError('');
  }
  return <article className={`day-detail ${today ? 'is-today' : ''}`}>
    <div className="day-detail-heading">
      <div><p className="eyebrow">REGISTRO DO DIA</p><h3>{dayLong(date)}</h3></div>
      <span className="day-detail-count">{times.filter(Boolean).length}/4 batidas</span>
    </div>
    {holiday && <div className="holiday-banner"><CalendarDays size={15} />{holiday}</div>}
    <div className="day-detail-progress"><div><span>Horas trabalhadas</span><strong>{formatDuration(worked)} <small>/ {formatDuration(workMinutes)}</small></strong></div><div className="mini-progress"><span style={{ width: `${Math.min(worked / workMinutes, 1) * 100}%` }} /></div></div>
    <div className="day-detail-marks">{['Entrada', 'Saída para almoço', 'Volta do almoço', 'Saída'].map((label, index) => <label className="day-detail-mark" key={label}><span className={`day-detail-index ${times[index] ? 'done' : ''}`}>{index + 1}</span><span className="day-detail-label">{label}</span><input type="time" aria-label={label} value={times[index]} onChange={(event) => setTimes((current) => current.map((value, position) => position === index ? event.target.value : value))} /><button type="button" className="clear-mark-button" onClick={() => clearFrom(index)} disabled={!times[index]} aria-label={`Apagar ${label}`} title={index < 3 ? 'Apagar este horário e os seguintes' : `Apagar ${label}`}><X size={15} /></button></label>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="day-detail-footer"><span>{worked >= workMinutes ? `Jornada completa · ${formatDuration(Math.max(worked - workMinutes, 0))} de saldo` : `${formatDuration(remaining)} restantes`}{expected ? ` · Saída prevista ${expected}` : ''}</span><div>{today && times.some(Boolean) && times.filter(Boolean).length < 4 && <button type="button" className="tool-button" onClick={registerNow}><Clock3 size={14} />Registrar {['entrada', 'saída para almoço', 'volta do almoço', 'saída'][times.filter(Boolean).length]} agora</button>}<button type="button" className="tool-button primary" onClick={() => save()}>Salvar batidas</button></div></div>
  </article>;
}

function DayModal({ date, record, holiday, onClose, onSaveMarks, expected, worked, breakLength, workMinutes }) {
  const [error, setError] = useState('');
  const marks = record.marks || [];
  const [times, setTimes] = useState(() => Array.from({ length: 4 }, (_, index) => marks[index] || ''));
  function submit(e) {
    e.preventDefault(); setError('');
    if (times.some((time, index) => !time && times.slice(index + 1).some(Boolean))) return setError('Preencha os horários em sequência, sem pular uma batida.');
    const normalizedMarks = times.map((time) => time.trim()).filter(Boolean);
    if (normalizedMarks.some((time) => !/^\d{2}:\d{2}$/.test(time))) return setError('Confira os horários preenchidos.');
    if (normalizedMarks.some((time, index) => index > 0 && parseTime(time) <= parseTime(normalizedMarks[index - 1]))) return setError('Os horários precisam estar em ordem crescente.');
    onSaveMarks(normalizedMarks);
  }
  function clearFrom(index) {
    setTimes((current) => current.map((time, position) => position >= index ? '' : time));
    setError('');
  }
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="day-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-top"><div><p className="eyebrow">REGISTRO DO DIA</p><h2 id="modal-title">{dayLong(date)}</h2></div><button className="icon-button close-button" onClick={onClose} aria-label="Fechar"><X size={19} /></button></div>
    {holiday && <div className="holiday-banner"><CalendarDays size={15} />{holiday}</div>}
    <div className="modal-progress"><div><span>Jornada registrada</span><strong>{formatDuration(worked)} <small>/ {formatDuration(workMinutes)}</small></strong></div><div className="mini-progress"><span style={{ width: `${Math.min(worked / workMinutes, 1) * 100}%` }} /></div></div>
    {expected && <div className="expected-banner"><span className="expected-icon"><Clock3 size={16} /></span><div><small>PREVISÃO DE SAÍDA</small><strong>{expected}<span>h</span></strong></div><span className="expected-caption">Entrada + jornada<br />+ 1h de almoço</span></div>}
    <form className="batch-marks-form" onSubmit={submit}><div className="batch-marks-heading"><strong>Horários do dia</strong><span>Preencha as batidas que já aconteceram</span></div><div className="batch-mark-list">{['Entrada', 'Saída para almoço', 'Volta do almoço', 'Saída'].map((label, index) => <div className="batch-mark-row" key={label}><label className="batch-mark-field"><span>{label}</span><input aria-label={label} type="time" value={times[index]} onChange={(event) => setTimes((current) => current.map((value, position) => position === index ? event.target.value : value))} /></label><button className="clear-mark-button" type="button" onClick={() => clearFrom(index)} disabled={!times[index]} aria-label={`Apagar ${label}`} title={index < 3 ? 'Apagar este horário e os seguintes' : `Apagar ${label}`}><X size={15} /></button></div>)}</div>{error && <p className="form-error">{error}</p>}<p className="form-hint"><Info size={13} />Deixe em branco os horários que ainda não aconteceram. Apagar uma batida também limpa as seguintes.</p><button className="add-button batch-save-button" type="submit">Salvar horários</button></form>
    {marks.length === 4 && <div className={`balance-banner ${worked >= workMinutes ? 'positive' : 'negative'}`}><div className="balance-icon">{worked >= workMinutes ? <Check size={17} /> : <Clock3 size={17} />}</div><div><small>SALDO DO DIA</small><strong>{worked >= workMinutes ? '+' : '−'}{formatDuration(Math.abs(worked - workMinutes))}</strong><span>{worked >= workMinutes ? 'Hora extra' : 'Horas devidas'}</span></div><span className="balance-worked">{formatDuration(worked)} trabalhadas</span></div>}
    <div className="modal-actions"><button className="done-button" onClick={onClose}>Concluir</button></div></section></div>;
}

createRoot(document.getElementById('root')).render(<App />);
