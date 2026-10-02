const User = require("../models/Utilisateur");

const DELAI_ELIGIBILITE_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Vérifie si le délai de 30 jours est écoulé depuis le dernier don.
 * La date du dernier don est conservée pour filtrer les alertes créées
 * pendant la période d'indisponibilité.
 *
 * @param {string|ObjectId} donneurId  - L'ID de l'utilisateur donneur
 * @returns {Promise<{ eligible: boolean, joursRestants: number, dateEligibilite: Date|null, dateDernierDon: Date|null }>}
 */
async function verifierEtReactiverDonneur(donneurId) {
  const donneur = await User.findById(donneurId).select("dateDernierDon role");

  // Pas un donneur ou pas de don enregistré → éligible
  if (!donneur || !donneur.dateDernierDon) {
    return { eligible: true, joursRestants: 0, dateEligibilite: null, dateDernierDon: null };
  }

  const ecoulé = Date.now() - new Date(donneur.dateDernierDon).getTime();

  const dateEligibilite = new Date(
    new Date(donneur.dateDernierDon).getTime() + DELAI_ELIGIBILITE_MS
  );

  if (ecoulé >= DELAI_ELIGIBILITE_MS) {
    return { eligible: true, joursRestants: 0, dateEligibilite, dateDernierDon: donneur.dateDernierDon };
  }

  // Encore dans la période d'indisponibilité
  const joursRestants = Math.ceil(
    (DELAI_ELIGIBILITE_MS - ecoulé) / (24 * 60 * 60 * 1000)
  );

  return { eligible: false, joursRestants, dateEligibilite, dateDernierDon: donneur.dateDernierDon };
}

module.exports = { verifierEtReactiverDonneur, DELAI_ELIGIBILITE_MS };
