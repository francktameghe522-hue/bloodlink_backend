const User = require("../models/Utilisateur");

const TROIS_MOIS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Vérifie si le délai de 3 mois est écoulé depuis le dernier don.
 * Si oui, remet automatiquement dateDernierDon à null sur le compte
 * du donneur (il redevient éligible sans intervention manuelle).
 *
 * @param {string|ObjectId} donneurId  - L'ID de l'utilisateur donneur
 * @returns {Promise<{ eligible: boolean, joursRestants: number, dateEligibilite: Date|null }>}
 */
async function verifierEtReactiverDonneur(donneurId) {
  const donneur = await User.findById(donneurId).select("dateDernierDon role");

  // Pas un donneur ou pas de don enregistré → éligible
  if (!donneur || !donneur.dateDernierDon) {
    return { eligible: true, joursRestants: 0, dateEligibilite: null };
  }

  const ecoulé = Date.now() - new Date(donneur.dateDernierDon).getTime();

  if (ecoulé >= TROIS_MOIS_MS) {
    // Les 3 mois sont passés → on remet dateDernierDon à null
    // pour signifier qu'il est à nouveau disponible
    await User.findByIdAndUpdate(donneurId, { dateDernierDon: null });

    return { eligible: true, joursRestants: 0, dateEligibilite: null };
  }

  // Encore dans la période d'indisponibilité
  const joursRestants = Math.ceil(
    (TROIS_MOIS_MS - ecoulé) / (24 * 60 * 60 * 1000)
  );

  const dateEligibilite = new Date(
    new Date(donneur.dateDernierDon).getTime() + TROIS_MOIS_MS
  );

  return { eligible: false, joursRestants, dateEligibilite };
}

module.exports = { verifierEtReactiverDonneur, TROIS_MOIS_MS };
