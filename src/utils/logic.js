// src/utils/logic.js

// 1. Les dates approximatives des fêtes (À ajuster chaque année ou via API)
const HOLIDAYS = [
  { name: "Aïd el-Fitr (Est.)", date: "2025-03-31" }, // Date mathématique approx
  { name: "Aïd al-Adha (Est.)", date: "2025-06-06" }, // Date mathématique approx
  { name: "Aïd el-Fitr (2026)", date: "2026-03-20" }
];

// 2. Ajouter des jours à une date
export const addDays = (dateStr, days) => {
  const result = new Date(dateStr);
  result.setDate(result.getDate() + parseInt(days));
  return result.toISOString().split('T')[0]; // Format YYYY-MM-DD
};

// 3. Vérifier les collisions avec les fêtes
export const checkConflicts = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const conflicts = HOLIDAYS.filter(h => {
    const hDate = new Date(h.date);
    return hDate >= start && hDate <= end;
  });

  return conflicts; // Retourne la liste des fêtes qui tombent dans cette période
};

// 4. Le Moteur "Domino"
// Il prend la date de départ et la liste des durées, et recalcule toutes les dates
export const calculateTimeline = (initialDate, blocks) => {
  let currentDate = initialDate;
  
  return blocks.map(block => {
    const start = currentDate;
    const end = addDays(start, block.duration);
    
    // Détection de conflit (Est-ce que je rate l'Aïd ?)
    // Si c'est du TRAVAIL, c'est mauvais. Si c'est PERMISSION, c'est bien.
    const conflicts = checkConflicts(start, end);
    
    // Mise à jour pour le prochain bloc (le lendemain de la fin)
    currentDate = end; // Le prochain bloc commence le jour même ou +1 selon ta logique (ici collé)

    return {
      ...block,
      computedStart: start,
      computedEnd: end,
      conflicts: conflicts
    };
  });
};
