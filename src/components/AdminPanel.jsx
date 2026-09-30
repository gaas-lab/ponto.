import React, { useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle, Save, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase.js';

export function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [records, setRecords] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadUsers() {
    setBusy(true); setError('');
    const { data, error: queryError } = await supabase.rpc('admin_list_users');
    if (queryError) setError(queryError.message);
    else setUsers(data || []);
    setBusy(false);
  }
  async function openUser(user) {
    setSelected(user); setBusy(true); setError(''); setNotice('');
    const { data, error: queryError } = await supabase.from('attendance_records').select('user_id, work_date, marks').eq('user_id', user.id).order('work_date', { ascending: false });
    if (queryError) setError(queryError.message);
    else setRecords(data || []);
    setBusy(false);
  }
  useEffect(() => { loadUsers(); }, []);

  async function saveRecord(record) {
    setError(''); setNotice('');
    const marks = record.marks.map((mark) => mark.trim()).filter(Boolean);
    if (marks.length > 4 || marks.some((mark) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(mark)) || marks.some((mark, i) => i > 0 && mark <= marks[i - 1])) {
      setError('Use até quatro horários válidos (HH:MM), em ordem.'); return;
    }
    const { error: saveError } = await supabase.from('attendance_records').upsert({ user_id: record.user_id, work_date: record.work_date, marks }, { onConflict: 'user_id,work_date' });
    if (saveError) { setError(saveError.message); return; }
    setRecords((current) => current.map((item) => item.work_date === record.work_date ? { ...item, marks } : item));
    setNotice('Registro salvo.');
  }
  async function deleteRecord(record) {
    if (!window.confirm(`Apagar os pontos de ${record.work_date}?`)) return;
    const { error: deleteError } = await supabase.from('attendance_records').delete().eq('user_id', record.user_id).eq('work_date', record.work_date);
    if (deleteError) { setError(deleteError.message); return; }
    setRecords((current) => current.filter((item) => item.work_date !== record.work_date));
    setNotice('Registro apagado.');
  }
  function addRecord() {
    const date = window.prompt('Data do registro (AAAA-MM-DD):');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (records.some((record) => record.work_date === date)) { setError('Já existe um registro para essa data.'); return; }
    setRecords((current) => [{ user_id: selected.id, work_date: date, marks: [] }, ...current]);
  }

  return <div className="modal-backdrop admin-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-panel" role="dialog" aria-modal="true" aria-labelledby="admin-title">
    <div className="modal-top"><div>{selected && <button className="text-button" onClick={() => { setSelected(null); setRecords([]); loadUsers(); }}><ArrowLeft size={15} /> Usuários</button>}<p className="eyebrow">ACESSO MASTER</p><h2 id="admin-title">{selected ? selected.full_name || selected.email : 'Administrar usuários'}</h2>{selected && <small>{selected.email}</small>}</div><button className="icon-button close-button" onClick={onClose} aria-label="Fechar administração"><X size={19} /></button></div>
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="sheet-feedback" role="status">{notice}</p>}
    {busy ? <div className="admin-loading"><LoaderCircle className="spin" size={20} /> Carregando…</div> : selected ? <><div className="admin-toolbar"><span>{records.length} dia(s) com registro</span><button className="tool-button" onClick={addRecord}>Adicionar data</button></div><div className="admin-record-list">{records.map((record) => <AdminRecord key={record.work_date} record={record} onSave={saveRecord} onDelete={deleteRecord} />)}{!records.length && <p className="admin-empty">Este usuário ainda não tem pontos registrados.</p>}</div></> : <div className="admin-user-list">{users.map((user) => <button key={user.id} className="admin-user" onClick={() => openUser(user)}><span><strong>{user.full_name || 'Sem nome'}</strong><small>{user.email}</small></span><span>{user.record_count} dia(s)</span></button>)}{!users.length && <p className="admin-empty">Nenhum usuário encontrado.</p>}</div>}
  </section></div>;
}

function AdminRecord({ record, onSave, onDelete }) {
  const [marks, setMarks] = useState([...record.marks, ...Array(Math.max(0, 4 - record.marks.length)).fill('')]);
  return <div className="admin-record"><strong>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'medium' }).format(new Date(`${record.work_date}T12:00:00Z`))}</strong><div className="admin-times">{marks.map((mark, index) => <input key={index} aria-label={`Batida ${index + 1}`} type="time" value={mark} onChange={(event) => setMarks((current) => current.map((value, i) => i === index ? event.target.value : value))} />)}</div><div className="admin-record-actions"><button className="tool-button" onClick={() => onSave({ ...record, marks })} aria-label="Salvar batidas"><Save size={14} />Salvar</button><button className="tool-button admin-delete" onClick={() => onDelete(record)} aria-label="Apagar dia"><Trash2 size={14} /></button></div></div>;
}
