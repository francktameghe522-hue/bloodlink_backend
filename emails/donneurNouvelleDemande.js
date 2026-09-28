const { emailLayout } = require("./emailLayout");

module.exports = function donneurNouvelleDemande({ demande, appUrl }) {
  const actionUrl = `${appUrl}/donneur/alertes`;
  return {
    subject: `BloodLink - Nouvelle demande de sang (${demande.groupeSanguinPatient})`,
    text: `Une nouvelle demande de sang est disponible. Consultez les alertes : ${actionUrl}`,
    html: emailLayout({
      title: "Nouvelle demande de sang",
      intro: "Une demande de sang est disponible. Consultez votre espace pour indiquer votre disponibilite.",
      details: [
        { label: "Reference", value: demande.idDemande },
        { label: "Groupe sanguin", value: demande.groupeSanguinPatient },
        { label: "Poches demandees", value: demande.nombreDePocheDeSang },
      ],
      actionUrl,
      actionLabel: "Voir les alertes",
    }),
  };
};
