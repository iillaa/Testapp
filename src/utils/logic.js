// src/utils/logic.js

/**
 * Ajoute un nombre de jours à une date donnée.
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @param {number} days - Nombre de jours à ajouter
 * @returns {string} - Nouvelle date au format YYYY-MM-DD
 */
export const addDays = (dateStr, days) => {
  const result = new Date(dateStr);
  result.setDate(result.getDate() + parseInt(days));
  return result.toISOString().split("T")[0];
};

/**
 * Vérifie si des jours fériés tombent dans une période donnée.
 * @param {string} startDate - Début de la période
 * @param {string} endDate - Fin de la période
 * @param {Array} holidays - Liste des jours fériés fournis par l'utilisateur
 * @returns {Array} - Liste des conflits trouvés
 */
export const checkConflicts = (startDate, endDate, holidays) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // On filtre les fêtes qui tombent ENTRE start et end (inclus)
  return holidays.filter((h) => {
    const hDate = new Date(h.date);
    return hDate >= start && hDate <= end;
  });
};

/**
 * Calcule toute la timeline en fonction des blocs et des fêtes.
 * @param {string} initialDate - Date de début du premier bloc
 * @param {Array} blocks - Liste des rotations (durée, type...)
 * @param {Array} holidays - Liste des jours fériés pour la détection
 * @returns {Array} - La timeline calculée avec dates de début/fin et conflits
 */
export const calculateTimeline = (initialDate, blocks, holidays) => {
  let currentDate = initialDate;

  return blocks.map((block) => {
    const start = currentDate;
    // La fin est calculée en ajoutant la durée (ex: Start + 50j)
    const end = addDays(start, block.duration);

    // Détection des conflits avec la liste dynamique des fêtes
    const conflicts = checkConflicts(start, end, holidays);

    // Le prochain bloc commence là où celui-ci finit
    currentDate = end;

    return {
      ...block,
      computedStart: start,
      computedEnd: end,
      conflicts: conflicts,
    };
  });
};
