import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, Clock3, LoaderCircle, LockKeyhole, Mail, Moon, Sun, UserRound, X } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import './account.css';

export function AuthScreen({ configured, darkMode, setDarkMode }) {
  const [view, setView] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isSignup = view === 'signup';

  function switchView(next) {
    setView(next);
    setMessage('');
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!configured) {
      setError('O Supabase ainda não está configurado neste endereço. Adicione as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na Vercel e publique novamente.');
      return;
    }
    if (isSignup && password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      if (isSignup) {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (authError) throw authError;
        if (data.session) return;
        setPassword('');
        setView('login');
        setMessage('Cadastro criado. Confirme seu e-mail e depois entre na sua conta.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      }
    } catch (authError) {
      setError(friendlyAuthError(authError.message));
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell">
    <section className="auth-visual">
      <div className="auth-brand"><span className="brand-mark"><Clock3 size={20} strokeWidth={2.4} /></span><span>Ponto<span className="brand-dot">.</span></span></div>
      <div className="visual-copy"><span className="visual-kicker"><i /> SUA ROTINA, MAIS LEVE</span><h1>Seu tempo<br />merece <em>cuidado.</em></h1><p>Uma forma mais simples de acompanhar sua jornada e cuidar de cada hora do seu dia.</p><div className="visual-clock"><div className="visual-clock-face"><Clock3 size={26} /></div><span><b>8h 48min</b><small>sua jornada, no seu ritmo</small></span><ArrowRight size={17} /></div></div>
      <div className="visual-footer"><span>CONTROLE DE PONTO PESSOAL</span><span>BRASIL · UTC−3</span></div>
      <div className="visual-orb orb-one" /><div className="visual-orb orb-two" />
    </section>
    <section className="auth-panel"><button className="auth-theme-button" onClick={() => setDarkMode((mode) => !mode)} aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}>{darkMode ? <Sun size={16} /> : <Moon size={16} />}<span>{darkMode ? 'Modo claro' : 'Modo escuro'}</span></button>
      <div className="auth-card"><div className="auth-card-heading"><span className="auth-small-brand"><span className="brand-mark"><Clock3 size={17} /></span> Ponto<span className="brand-dot">.</span></span><p className="eyebrow">{isSignup ? 'COMECE POR AQUI' : 'BEM-VINDO DE VOLTA'}</p><h2>{isSignup ? 'Crie sua conta' : 'Entre na sua conta'}</h2><p className="auth-subtitle">{isSignup ? 'Seu espaço para acompanhar o seu tempo.' : 'Seu dia continua de onde você parou.'}</p></div>
        {message && <div className="auth-message success"><Check size={16} />{message}</div>}
        {error && <div className="auth-message error">{error}</div>}
        <form className="auth-form" onSubmit={submit}>
          {isSignup && <label className="auth-field"><span>Seu nome</span><div className="auth-input-wrap"><UserRound size={17} /><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos te chamar?" required disabled={busy} /></div></label>}
          <label className="auth-field"><span>E-mail</span><div className="auth-input-wrap"><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" required disabled={busy} /></div></label>
          <label className="auth-field"><span>Senha</span><div className="auth-input-wrap"><LockKeyhole size={17} /><input type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? 'Pelo menos 8 caracteres' : 'Sua senha'} required disabled={busy} minLength={isSignup ? 8 : undefined} /></div></label>
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} />Aguarde…</> : <>{isSignup ? 'Criar minha conta' : 'Entrar'}<ArrowRight size={16} /></>}</button>
        </form>
        <div className="auth-switch">{isSignup ? <><span>Já tem uma conta?</span><button onClick={() => switchView('login')}><ArrowLeft size={14} />Voltar para o login</button></> : <><span>Ainda não tem uma conta?</span><button onClick={() => switchView('signup')}>Criar cadastro <ArrowRight size={14} /></button></>}</div>
        <p className="auth-privacy"><LockKeyhole size={12} /> Seus registros ficam associados à sua conta.</p>
      </div>
      <div className="auth-bottom">Feito para uma rotina mais leve.</div>
    </section>
  </main>;
}

function friendlyAuthError(message = '') {
  const text = message.toLowerCase();
  if (text.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (text.includes('user already registered') || text.includes('already been registered')) return 'Já existe uma conta com esse e-mail. Entre ou use outro endereço.';
  if (text.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (text.includes('password should be at least')) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (text.includes('rate limit')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  return message || 'Não foi possível concluir. Confira seus dados e tente novamente.';
}

export function ProfileModal({ profile, onSave, onClose }) {
  const [name, setName] = useState(profile.name || '');
  const [photo, setPhoto] = useState(profile.photo || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Escolha um arquivo de imagem.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('A imagem precisa ter menos de 8 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 512 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) { setError('Não consegui preparar essa imagem.'); return; }
          const compressed = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setPhotoFile(compressed);
          setPhoto(URL.createObjectURL(compressed));
          setError('');
        }, 'image/jpeg', 0.84);
      };
      image.onerror = () => setError('Não consegui abrir essa imagem.');
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) { setError('Informe seu nome.'); return; }
    setBusy(true);
    setError('');
    try { await onSave({ name, photoFile }); }
    catch (saveError) { setError(saveError.message || 'Não foi possível salvar o perfil. Confira a configuração do Storage no Supabase.'); }
    finally { setBusy(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title"><div className="modal-top"><div><p className="eyebrow">SUA CONTA</p><h2 id="profile-title">Editar perfil</h2></div><button className="icon-button close-button" onClick={onClose} aria-label="Fechar"><X size={19} /></button></div><form onSubmit={submit}><div className="profile-photo-editor"><div className="profile-photo-preview">{photo ? <img src={photo} alt="Prévia da foto de perfil" /> : <UserRound size={31} />}</div><label className="photo-upload-button"><Camera size={15} />Alterar foto<input type="file" accept="image/*" onChange={choosePhoto} /></label><span>JPG ou PNG. Até 8 MB.</span></div><label className="auth-field profile-name-field"><span>Nome</span><div className="auth-input-wrap"><UserRound size={17} /><input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoComplete="name" required /></div></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button className="profile-cancel" type="button" onClick={onClose}>Cancelar</button><button className="done-button" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar perfil'}</button></div></form></section></div>;
}
