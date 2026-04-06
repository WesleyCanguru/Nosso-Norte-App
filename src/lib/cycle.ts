export const CYCLE_START_DATE = new Date(2026, 3, 6); // 06 de Abril de 2026 (Segunda-feira)
export const CYCLE_END_DATE = new Date(2026, 5, 28); // 28 de Junho de 2026 (Domingo)

export function getCycleInfo() {
  const totalDays = 84; // 12 semanas exatas
  
  const today = new Date();
  // Zera as horas para comparação de dias
  const start = new Date(CYCLE_START_DATE);
  start.setHours(0, 0, 0, 0);
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  let currentDay = diffDays;
  if (diffDays < 1) currentDay = 0;
  if (diffDays > totalDays) currentDay = totalDays;
  
  // Cálculo simples de semana (1 a 12)
  let currentWeek = Math.ceil(currentDay / 7);
  if (currentWeek < 1) currentWeek = 1;
  if (currentWeek > 12) currentWeek = 12;
  
  const cycleProgress = Math.round((currentDay / totalDays) * 100);

  return {
    startDate: CYCLE_START_DATE,
    endDate: CYCLE_END_DATE,
    totalDays: totalDays,
    currentDay,
    currentWeek,
    cycleProgress
  };
}
