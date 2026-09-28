const { emailLayout } = require("./emailLayout");

module.exports = function demandeurDemandeCreee({ demande, appUrl }) {
  const actionUrl = `${appUrl}/demandeur/demandes/${demande._id}`;
  return {
    subject: `BloodLink - Demande ${demande.idDemande} enregistree`,
    text: `Votre demande ${demande.idDemande} a ete enregistree. Consultez-la : ${actionUrl}`,
    html: emailLayout({
      title: "Votre demande est enregistree",
      intro: "Votre demande de sang a ete recue et attend maintenant sa validation.",
      details: [
        { label: "Reference", value: demande.idDemande },
        { label: "Patient", value: demande.nomPatient },
        { label: "Groupe sanguin", value: demande.groupeSanguinPatient },
        { label: "Poches demandees", value: demande.nombreDePocheDeSang },
        { label: "Bon de sang", value: demande.numeroBonDeSang },
      ],
      actionUrl,
      actionLabel: "Voir ma demande",
    }),
  };
};
