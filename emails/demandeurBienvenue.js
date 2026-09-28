const { emailLayout } = require("./emailLayout");

module.exports = function demandeurBienvenue({ user, appUrl }) {
  const actionUrl = `${appUrl}/demandeur/dashboard`;
  const name = `${user.prenom || ""} ${user.nom || ""}`.trim();
  return {
    subject: "Bienvenue sur BloodLink",
    text: `Bienvenue ${name}. Votre compte demandeur est actif. Accedez a votre espace : ${actionUrl}`,
    html: emailLayout({
      title: "Bienvenue sur BloodLink",
      intro: `Bonjour ${name}, votre compte demandeur est maintenant actif. Vous pouvez creer et suivre vos demandes de sang depuis votre espace personnel.`,
      details: [{ label: "Nom", value: name }],
      actionUrl,
      actionLabel: "Acceder a mon espace demandeur",
    }),
  };
};
