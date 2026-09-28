const { emailLayout } = require("./emailLayout");

module.exports = function demandeurDonneurDisponible({ demande, donneur, appUrl }) {
  const actionUrl = `${appUrl}/demandeur/demandes/${demande._id}`;
  const donorName = `${donneur.prenom || ""} ${donneur.nom || ""}`.trim() || "Un donneur";
  return {
    subject: `BloodLink - Un donneur est disponible (${demande.idDemande})`,
    text: `${donorName} a indique sa disponibilite pour votre demande. Consultez-la : ${actionUrl}`,
    html: emailLayout({
      title: "Un donneur est disponible",
      intro: `${donorName} a indique sa disponibilite pour votre demande de sang.`,
      details: [
        { label: "Donneur", value: donorName },
        { label: "Telephone", value: donneur.telephone || "Non renseigne" },
        { label: "Email", value: donneur.email || "Non renseigne" },
        { label: "Groupe sanguin", value: donneur.groupeSanguin || "Non renseigne" },
      ],
      actionUrl,
      actionLabel: "Voir ma demande",
    }),
  };
};
