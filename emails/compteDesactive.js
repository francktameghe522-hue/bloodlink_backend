const { emailLayout } = require("./emailLayout");

module.exports = function compteDesactive({ user, appUrl }) {
  const name = `${user.prenom || ""} ${user.nom || ""}`.trim();
  const roleText = user.role === "donneur" ? "donneur" : "demandeur";
  
  return {
    subject: "Votre compte BloodLink a été désactivé",
    text: `Bonjour ${name}, votre compte ${roleText} BloodLink a été désactivé. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'équipe d'administration.`,
    html: emailLayout({
      title: "Compte désactivé",
      intro: `Bonjour ${name}, votre compte ${roleText} BloodLink a été désactivé. Vous ne pouvez plus accéder à votre espace personnel. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'équipe d'administration de BloodLink.`,
      details: [
        { label: "Nom", value: name },
        { label: "Statut", value: "Désactivé" }
      ],
      actionUrl: `${appUrl}/contact`,
      actionLabel: "Contacter l'administration",
    }),
  };
};
