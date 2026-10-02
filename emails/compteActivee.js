const { emailLayout } = require("./emailLayout");

module.exports = function compteActivee({ user, appUrl }) {
  const actionUrl = appUrl;
  const name = `${user.prenom || ""} ${user.nom || ""}`.trim();
  const roleText = user.role === "donneur" ? "donneur" : "demandeur";
  
  return {
    subject: "Votre compte BloodLink a été activé",
    text: `Bonjour ${name}, votre compte ${roleText} BloodLink a été activé. Accédez à votre espace : ${actionUrl}`,
    html: emailLayout({
      title: "Compte activé",
      intro: `Bonjour ${name}, votre compte ${roleText} BloodLink a été activé avec succès. Vous pouvez maintenant accéder à votre espace personnel et utiliser tous les services disponibles.`,
      details: [
        { label: "Nom", value: name },
        { label: "Statut", value: "Actif" }
      ],
      actionUrl,
      actionLabel: "Accéder à mon espace",
    }),
  };
};
