export const calculatePercentage = (partial: number, total: number): number => {
  if (total === 0) return 0;

  const rawPercentage = (partial / total) * 100;
  return +rawPercentage.toFixed(1);
}