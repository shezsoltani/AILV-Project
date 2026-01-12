// Wandelt Formularwerte in Zahlen um, wirft Fehler bei ungültigen Werten
export const toNumber = (value: number | ''): number => {
  if (value === '') {
    throw new Error('Ungültiger Wert: Leere Felder sind nicht erlaubt.');
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) {
    throw new Error('Ungültiger numerischer Wert.');
  }
  return num;
};

