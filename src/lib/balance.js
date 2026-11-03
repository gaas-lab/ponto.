export const META = 528;
export const TOLERANCIA = 10;

export const toMin = (hhmm) => {
  const [hours, minutes] = hhmm.replaceAll('*', '').split(':').map(Number);
  return hours * 60 + minutes;
};

export function saldoDia(batidas) {
  if (!batidas || batidas.length !== 4 || batidas.some((mark) => mark.includes('--'))) return 0;
  const [e1, s1, e2, s2] = batidas.map(toMin);
  const saldo = (s1 - e1) + (s2 - e2) - META;
  return Math.abs(saldo) <= TOLERANCIA ? 0 : saldo;
}

export const saldoMes = (dias) => dias.reduce((total, dia) => total + saldoDia(dia), 0);
