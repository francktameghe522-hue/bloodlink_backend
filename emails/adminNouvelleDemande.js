const { emailLayout } = require("./emailLayout");

module.exports = function adminNouvelleDemande({ demande, appUrl }) {
  const actionUrl = `${appUrl}/admin/demandes`;
  return {
    subject: `BloodLink - Nouvelle demande a valider (${demande.idDemande})`,
    text: `Une nouvelle demande ${demande.idDemande} attend votre validation. Ouvrir : ${actionUrl}`,
    html: emailLayout({
      title: "Nouvelle demande a valider",
      intro: "Une demande de sang vient d'etre creee et doit etre examinee.",
      details: [
        { label: "Reference", value: demande.idDemande },
        { label: "Patient", value: demande.nomPatient },
        { label: "Groupe sanguin", value: demande.groupeSanguinPatient },
        { label: "Poches demandees", value: demande.nombreDePocheDeSang },
      ],
      actionUrl,
      actionLabel: "Examiner la demande",
    }),
  };
};
