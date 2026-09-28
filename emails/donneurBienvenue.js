const { emailLayout } = require("./emailLayout");

module.exports = function donneurBienvenue({ user, appUrl }) {
  const actionUrl = `${appUrl}/donneur/accueil`;
  const name = `${user.prenom || ""} ${user.nom || ""}`.trim();
  return {
    subject: "Bienvenue sur BloodLink",
    text: `Bienvenue ${name}. Votre compte donneur est actif. Accedez a votre espace : ${actionUrl}`,
    html: emailLayout({
      title: "Bienvenue dans la communaute des donneurs",
      intro: `Bonjour ${name}, votre compte donneur BloodLink est maintenant actif. Vous pourrez consulter les alertes auxquelles vous etes eligible et indiquer votre disponibilite.`,
      details: [
        { label: "Nom", value: name },
        { label: "Groupe sanguin", value: user.groupeSanguin || "Non renseigne" },
      ],
      actionUrl,
      actionLabel: "Acceder a mon espace donneur",
    }),
  };
};
