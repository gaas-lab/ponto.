import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, Clock3, Coffee, Download, FileSpreadsheet, Info, LogOut, Moon, Plus, Sun, UserRound, X, Upload } from 'lucide-react';
import { AuthScreen, ProfileModal } from './components/Account.jsx';
import { AdminPanel } from './components/AdminPanel.jsx';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import './styles.css';

const WORK_MINUTES = 8 * 60 + 48;
const BREAK_MINUTES = 60;
const KEY = 'ponto-days-v1';
const PROFILE_KEY = 'ponto-profile-v1';
const THEME_KEY = 'ponto-theme-v1';
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseTime = (s) => s ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)) : null;
const formatDuration = (mins) => `${Math.floor(mins / 60)}h ${pad(mins % 60)}min`;
const formatBalanceCompact = (mins) => `${mins >= 0 ? '+' : '−'}${Math.floor(Math.abs(mins) / 60)}h${pad(Math.abs(mins) % 60)}`;
const minutesToTime = (mins) => `${pad(Math.floor((mins % 1440) / 60))}:${pad(mins % 60)}`;
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
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(null);
  const userDaysKey = `${KEY}:${session.user.id}`;
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
  const [adminOpen, setAdminOpen] = useState(false);
  const isMasterAdmin = session.user.email?.toLowerCase() === 'gaasbrel@gmail.com';
  const [rangeStart, setRangeStart] = useState(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`);
  const [rangeEnd, setRangeEnd] = useState(dateKey(today));
  const [sheetMessage, setSheetMessage] = useState('');
  const [sheetError, setSheetError] = useState('');
  const [sheetBusy, setSheetBusy] = useState(false);
  const importInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    async function loadAttendance() {
      setAttendanceLoading(true);
      setAttendanceError('');
      try {
        const { data, error } = await supabase.from('attendance_records').select('work_date, marks');
        if (error) throw error;
        const remoteDays = Object.fromEntries((data || []).map((row) => [row.work_date, { marks: row.marks }]));
        let localDays = {};
        try { localDays = JSON.parse(localStorage.getItem(userDaysKey) || localStorage.getItem(KEY) || '{}'); }
        catch { /* Ignore a malformed local cache; Supabase remains the source of truth. */ }
        const mergedDays = { ...localDays, ...remoteDays };
        const localOnlyRows = Object.entries(localDays)
          .filter(([date]) => !Object.hasOwn(remoteDays, date))
          .map(([work_date, record]) => ({ work_date, marks: record.marks || [] }));
        if (localOnlyRows.length) {
          const { error: migrationError } = await supabase.from('attendance_records').upsert(localOnlyRows, { onConflict: 'user_id,work_date' });
          if (migrationError) throw migrationError;
        }
        if (!active) return;
        lastDaysRef.current = mergedDays;
        localStorage.setItem(userDaysKey, JSON.stringify(mergedDays));
        localStorage.removeItem(KEY);
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
  }, [session.user.id, userDaysKey]);
  useEffect(() => {
    if (attendanceLoading || attendanceError) return;
    localStorage.setItem(userDaysKey, JSON.stringify(days));
    const previous = lastDaysRef.current;
    const changedRows = Object.entries(days)
      .filter(([date, record]) => JSON.stringify(previous[date]) !== JSON.stringify(record))
      .map(([work_date, record]) => ({ work_date, marks: record.marks || [] }));
    const removedDates = Object.keys(previous).filter((date) => !Object.hasOwn(days, date));
    lastDaysRef.current = days;
    if (!changedRows.length && !removedDates.length) return;
    syncQueueRef.current = syncQueueRef.current.then(async () => {
      if (changedRows.length) {
        const { error } = await supabase.from('attendance_records').upsert(changedRows, { onConflict: 'user_id,work_date' });
        if (error) throw error;
      }
      if (removedDates.length) {
        const { error } = await supabase.from('attendance_records').delete().in('work_date', removedDates);
        if (error) throw error;
      }
      setSyncError('');
    }).catch((error) => setSyncError(error.message || 'Não foi possível sincronizar seus pontos.'));
  }, [days, attendanceLoading, attendanceError, userDaysKey]);
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
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = first.getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells = Math.ceil((startOffset + count) / 7) * 7;
    return Array.from({ length: cells }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i - startOffset + 1));
  }, [month]);

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
  function removeMark(key, index) {
    updateDay(key, (record) => ({ ...record, marks: record.marks.filter((_, i) => i !== index) }));
  }
  function markLabel(index) { return ['Entrada', 'Saída para almoço', 'Volta do almoço', 'Fim do expediente'][index] || 'Batida'; }
  function nextMark(marks) { return marks.length < 4 ? markLabel(marks.length) : null; }
  function expectedExit(marks) {
    if (!marks.length) return null;
    const actualBreak = breakLength(marks);
    return minutesToTime(parseTime(marks[0]) + WORK_MINUTES + (actualBreak ?? BREAK_MINUTES));
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
    const XLSX = await import('xlsx');
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
      ['Carga diária', '8h 48min'],
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
    XLSX.writeFile(workbook, `Ponto_${startValue}_a_${endValue}.xlsx`);
  }
  async function downloadTemplate() {
    const XLSX = await import('xlsx');
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
    XLSX.writeFile(workbook, 'Modelo_importacao_pontos.xlsx');
  }
  async function importSpreadsheet(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setSheetError(''); setSheetMessage(''); setSheetBusy(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheet = workbook.Sheets.Registros || workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('A planilha não contém uma aba de registros.');
      const records = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      const normalize = (s) => String(s).trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const headers = Object.keys(records[0] || {}).reduce((out, key) => ({ ...out, [normalize(key)]: key }), {});
      const dateColumn = headers.data;
      const timeColumns = ['entrada', 'saida para almoco', 'volta do almoco', 'fim do expediente'].map((name) => headers[name]);
      if (!dateColumn || timeColumns.some((col) => !col)) throw new Error('Use o modelo padrão e mantenha os títulos das cinco colunas.');
      const todayKey = dateKey(new Date());
      const parsed = records.filter((row) => row[dateColumn] !== '').map((row, index) => {
        const rawDate = row[dateColumn];
        let key = '';
        if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) key = dateKey(rawDate);
        else {
          const value = String(rawDate).trim();
          const localDate = value.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
          const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (localDate) key = `${localDate[3]}-${pad(localDate[2])}-${pad(localDate[1])}`;
          else if (isoDate) key = `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || Number.isNaN(new Date(`${key}T12:00:00`).getTime()) || dateKey(new Date(`${key}T12:00:00`)) !== key) throw new Error(`Data inválida na linha ${index + 2}.`);
        if (key >= todayKey) throw new Error(`A linha ${index + 2} tem data de hoje ou futura. Só é permitido importar dias anteriores a hoje.`);
        const rawMarks = timeColumns.map((col) => String(row[col] ?? '').trim());
        const firstBlank = rawMarks.indexOf('');
        if (firstBlank >= 0 && rawMarks.slice(firstBlank).some(Boolean)) throw new Error(`Preencha as batidas em sequência na linha ${index + 2}.`);
        const marks = rawMarks.filter(Boolean).map((time) => {
          const normalized = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
          if (!normalized || Number(normalized[1]) > 23 || Number(normalized[2]) > 59) throw new Error(`Horário inválido na linha ${index + 2}: ${time}.`);
          return `${pad(normalized[1])}:${normalized[2]}`;
        });
        if (marks.length > 4 || marks.some((time, i) => i > 0 && parseTime(time) <= parseTime(marks[i - 1]))) throw new Error(`Confira a ordem das batidas na linha ${index + 2}.`);
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
  function changeMonth(delta) { setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1)); }

  const todayNext = nextMark(todayMarks);
  const todayExpected = expectedExit(todayMarks);

  if (attendanceLoading) return <div className="auth-loading"><span className="brand-mark"><Clock3 size={19} /></span><span>Carregando seus pontos…</span></div>;
  if (attendanceError) return <div className="auth-loading"><span>Não foi possível carregar seus pontos.</span><small>{attendanceError}</small><button className="done-button" onClick={() => window.location.reload()}>Tentar novamente</button></div>;

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Ponto início"><span className="brand-mark"><Clock3 size={19} strokeWidth={2.4} /></span><span>Ponto<span className="brand-dot">.</span></span></a>
      <div className="topbar-right"><span className="today-label">{new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(today)}</span>{isMasterAdmin && <button className="text-button" onClick={() => setAdminOpen(true)}>Administração</button>}<details className="profile-menu"><summary aria-label="Abrir opções do perfil">{profile.photo ? <img className="avatar avatar-photo" src={profile.photo} alt="" /> : <span className="avatar">{(profile.name || 'P').trim().slice(0, 1).toUpperCase()}</span>}<span className="profile-name">{profile.name || 'Meu perfil'}</span><ChevronDown size={14} /></summary><div className="profile-dropdown"><div className="dropdown-identity">{profile.photo ? <img className="avatar avatar-photo" src={profile.photo} alt="" /> : <span className="avatar">{(profile.name || 'P').trim().slice(0, 1).toUpperCase()}</span>}<span><strong>{profile.name || 'Meu perfil'}</strong><small>{session.user.email}</small></span></div><button onClick={() => { setProfileOpen(true); document.querySelector('.profile-menu')?.removeAttribute('open'); }}><UserRound size={16} />Editar perfil</button><button onClick={() => setDarkMode((value) => !value)}>{darkMode ? <Sun size={16} /> : <Moon size={16} />}{darkMode ? 'Modo claro' : 'Modo escuro'}<span className={`theme-switch ${darkMode ? 'on' : ''}`} /></button><button onClick={onSignOut}><LogOut size={16} />Sair</button></div></details></div>
    </header>

    <section className="welcome-row"><div><p className="eyebrow">SEU TEMPO, BEM CUIDADO</p><h1>Bom dia<span className="greeting-dot">.</span></h1><p className="welcome-sub">Cada minuto conta. Acompanhe sua jornada.</p></div><div className="date-chip"><CalendarDays size={17} /><span>{new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(today)}</span></div></section>

    <section className="overview-grid">
      <article className="hero-card">
        <div className="hero-top"><div><div className="hero-label"><span className="live-dot" />JORNADA DE HOJE</div><div className="hero-hours">{formatDuration(workedToday)}<span className="hero-total"> / 8h 48min</span></div></div><div className="ring" style={{ '--progress': `${Math.min(workedToday / WORK_MINUTES, 1) * 100}%` }}><span>{Math.min(Math.round(workedToday / WORK_MINUTES * 100), 100)}<small>%</small></span></div></div>
        <div className="progress-track"><span style={{ width: `${Math.min(workedToday / WORK_MINUTES, 1) * 100}%` }} /></div>
        <div className="hero-bottom"><span>{workedToday >= WORK_MINUTES ? 'Jornada completa' : `${formatDuration(Math.max(WORK_MINUTES - workedToday, 0))} restantes`}</span><span>{todayMarks.length}/4 batidas</span></div>
      </article>
      <article className="exit-card"><div className="exit-icon"><Clock3 size={19} /></div><div className="exit-label">PREVISÃO DE SAÍDA</div>{todayExpected ? <><div className="exit-time">{todayExpected}<span>h</span></div><div className="exit-note">Considerando 1h de almoço</div></> : <><div className="exit-placeholder">— — : — —</div><div className="exit-note">Registre a entrada para calcular</div></>}</article>
    </section>

    <section className="calendar-section" id="calendar">
      <div className="section-heading"><div><p className="eyebrow">ACOMPANHAMENTO</p><h2>Seu calendário</h2></div><div className="month-controls"><button className="icon-button" onClick={() => changeMonth(-1)} aria-label="Mês anterior"><ArrowLeft size={17} /></button><span className="month-title">{monthName(month)}</span><button className="icon-button" onClick={() => changeMonth(1)} aria-label="Próximo mês"><ArrowRight size={17} /></button><button className="export-button" onClick={() => exportRange(`${month.getFullYear()}-${pad(month.getMonth() + 1)}-01`, `${month.getFullYear()}-${pad(month.getMonth() + 1)}-${pad(new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate())}`)} aria-label="Exportar este mês para Excel" title="Exportar este mês para Excel"><FileSpreadsheet size={16} /><span>Exportar mês</span><Download size={13} /></button></div></div>
      <div className="spreadsheet-tools">
        <div className="spreadsheet-actions"><button className="tool-button" onClick={downloadTemplate}><FileSpreadsheet size={15} />Baixar modelo</button><button className="tool-button" onClick={() => importInputRef.current?.click()} disabled={sheetBusy}><Upload size={15} />{sheetBusy ? 'Importando…' : 'Importar planilha'}</button><input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={importSpreadsheet} hidden /></div>
        <form className="period-export" onSubmit={(e) => { e.preventDefault(); exportRange(); }}><label>De <input aria-label="Data inicial do período" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} required /></label><label>Até <input aria-label="Data final do período" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} required /></label><button className="tool-button primary" type="submit"><Download size={15} />Exportar período</button></form>
        {(sheetError || sheetMessage) && <p className={`sheet-feedback ${sheetError ? 'error' : ''}`} role="status">{sheetError || sheetMessage}</p>}
      </div>
      <div className="calendar-card">
        <div className="weekdays">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => <div key={d}>{d}</div>)}</div>
        <div className="calendar-grid">{calendarDays.map((day, idx) => {
          const key = dateKey(day); const inMonth = day.getMonth() === month.getMonth(); const isToday = key === dateKey(today); const record = days[key]; const marks = record?.marks || []; const progress = workedMinutes(marks); const completed = marks.length === 4; const balance = progress - WORK_MINUTES; const holiday = holidays[key];
          return <button key={`${key}-${idx}`} className={`day-cell ${inMonth ? '' : 'outside'} ${isToday ? 'is-today' : ''} ${holiday ? 'is-holiday' : ''}`} onClick={() => setSelected(day)} aria-label={`${dayLong(day)}${holiday ? `, feriado ${holiday}` : ''}`}>
            <span className="day-number">{day.getDate()}</span>{holiday && <span className="holiday-dot" />}{completed ? <span className={`day-status day-balance ${balance >= 0 ? 'complete' : 'shortfall'}`} title={`Saldo: ${balance >= 0 ? '+' : '−'}${formatDuration(Math.abs(balance))}`}><i />{formatBalanceCompact(balance)}</span> : marks.length ? <span className="day-status"><i />{progress ? formatDuration(progress) : 'Em andamento'}</span> : <span className="day-empty">{holiday ? 'Feriado' : ' '}</span>}
          </button>;
        })}</div>
        <div className="calendar-legend"><span><i className="legend-complete" />Jornada completa</span><span><i className="legend-progress" />Em andamento</span>{holidayState === 'loading' ? <span className="holiday-note">Buscando feriados…</span> : holidayState === 'error' ? <span className="holiday-note">Feriados indisponíveis</span> : <span><i className="legend-holiday" />Feriado nacional</span>}</div>
      </div>
    </section>

    <section className="bottom-grid"><article className="recent-card hours-card"><div className="card-heading"><div><p className="eyebrow">VISÃO GERAL DO MÊS</p><h3>Suas horas</h3></div><button className="text-button" onClick={() => document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth' })}>Ver calendário <ArrowRight size={15} /></button></div><div className={`monthly-balance ${monthlyBalance >= 0 ? 'positive' : 'negative'}`}><span className="monthly-balance-icon"><Clock3 size={19} /></span><div><small>SALDO ACUMULADO</small><strong>{workedDays ? `${monthlyBalance >= 0 ? '+' : '−'}${formatDuration(Math.abs(monthlyBalance))}` : '—'}</strong></div><span className="monthly-balance-label">{workedDays ? monthlyBalance >= 0 ? 'Horas extras' : 'Horas devidas' : 'Sem dias completos'}</span></div><div className="hours-card-foot"><span>{formatDuration(totalWorked)} trabalhadas</span><span>{workedDays} {workedDays === 1 ? 'dia completo' : 'dias completos'}</span></div></article>
      <article className="summary-card"><div className="card-heading"><div><p className="eyebrow">RESUMO DO MÊS</p><h3>Seu ritmo</h3></div><span className="summary-calendar"><CalendarDays size={17} /></span></div><div className="summary-stats"><div><strong>{workedDays}<small> dias</small></strong><span>Jornada completa</span></div><div><strong>{formatDuration(totalWorked)}</strong><span>Horas trabalhadas</span></div></div><div className="summary-foot"><Info size={14} /><span>O almoço de 1h não conta como hora trabalhada.</span></div></article></section>
    <footer className="footer"><span>Feito para uma rotina mais leve.</span><span><i /> Seus dados sincronizam com segurança</span></footer>
    {syncError && <div className="auth-message error" role="status">Falha ao sincronizar seus pontos: {syncError}</div>}

    {selected && <DayModal date={selected} record={openDay} holiday={holidays[dateKey(selected)]} onClose={() => setSelected(null)} onAdd={(time) => addMark(dateKey(selected), time)} onRemove={(idx) => removeMark(dateKey(selected), idx)} nextMark={nextMark(openDay.marks)} expected={expectedExit(openDay.marks)} worked={workedMinutes(openDay.marks)} breakLength={breakLength(openDay.marks)} />}
    {profileOpen && <ProfileModal profile={profile} onSave={saveProfile} onClose={() => setProfileOpen(false)} />}
    {adminOpen && isMasterAdmin && <AdminPanel onClose={() => setAdminOpen(false)} />}
    {toast && <div className="toast"><span><Check size={15} /></span>{toast}</div>}
  </main>;
}

function DayModal({ date, record, holiday, onClose, onAdd, onRemove, nextMark, expected, worked, breakLength }) {
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const marks = record.marks || [];
  const currentLabel = nextMark || 'Todas as batidas registradas';
  function submit(e) {
    e.preventDefault(); setError('');
    if (!time) return setError('Escolha um horário para a batida.');
    const value = parseTime(time);
    if (marks.length && value <= parseTime(marks[marks.length - 1])) return setError('O horário precisa ser depois da batida anterior.');
    onAdd(time); setTime('');
  }
  const typeIcons = [<Clock3 size={17} />, <Coffee size={17} />, <Coffee size={17} />, <Check size={17} />];
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="day-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-top"><div><p className="eyebrow">REGISTRO DO DIA</p><h2 id="modal-title">{dayLong(date)}</h2></div><button className="icon-button close-button" onClick={onClose} aria-label="Fechar"><X size={19} /></button></div>
    {holiday && <div className="holiday-banner"><CalendarDays size={15} />{holiday}</div>}
    <div className="modal-progress"><div><span>Jornada registrada</span><strong>{formatDuration(worked)} <small>/ 8h 48min</small></strong></div><div className="mini-progress"><span style={{ width: `${Math.min(worked / WORK_MINUTES, 1) * 100}%` }} /></div></div>
    {expected && <div className="expected-banner"><span className="expected-icon"><Clock3 size={16} /></span><div><small>PREVISÃO DE SAÍDA</small><strong>{expected}<span>h</span></strong></div><span className="expected-caption">Entrada + jornada<br />+ 1h de almoço</span></div>}
    <div className="modal-timeline">{['Entrada', 'Saída para almoço', 'Volta do almoço', 'Fim do expediente'].map((label, i) => <div className={`mark-row ${marks[i] ? 'has-mark' : ''}`} key={label}><span className={`mark-icon ${marks[i] ? 'done' : ''}`}>{typeIcons[i]}</span><div className="mark-copy"><strong>{label}</strong>{i === 1 && <small>Início do intervalo</small>}{i === 2 && <small>{breakLength != null ? `Intervalo: ${formatDuration(breakLength)}` : 'Retorno do almoço'}</small>}</div>{marks[i] ? <><span className="mark-time">{marks[i]}</span><button className="remove-mark" onClick={() => onRemove(i)} aria-label={`Remover ${label}`}><X size={14} /></button></> : <span className="pending-label">Pendente</span>}</div>)}</div>
    {nextMark ? <form className="add-mark-form" onSubmit={submit}><div className="form-label-row"><label htmlFor="mark-time">Adicionar batida</label><span>Próxima: <b>{currentLabel}</b></span></div><div className="input-row"><input id="mark-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required /><button className="add-button" type="submit"><Plus size={17} />Adicionar</button></div>{error && <p className="form-error">{error}</p>}{marks.length === 2 && <p className="form-hint"><Info size={13} />O almoço pode durar 1 hora ou mais; a previsão de saída será ajustada.</p>}</form> : <div className={`balance-banner ${worked >= WORK_MINUTES ? 'positive' : 'negative'}`}><div className="balance-icon">{worked >= WORK_MINUTES ? <Check size={17} /> : <Clock3 size={17} />}</div><div><small>SALDO DO DIA</small><strong>{worked >= WORK_MINUTES ? '+' : '−'}{formatDuration(Math.abs(worked - WORK_MINUTES))}</strong><span>{worked >= WORK_MINUTES ? 'Hora extra' : 'Horas devidas'}</span></div><span className="balance-worked">{formatDuration(worked)} trabalhadas</span></div>}
    <div className="modal-actions"><button className="done-button" onClick={onClose}>Concluir</button></div></section></div>;
}

createRoot(document.getElementById('root')).render(<App />);
