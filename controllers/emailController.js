const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_ID,
        pass: process.env.MP,
      },
    });
  }

  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  if (!process.env.MAIL_ID || !process.env.MP) {
    console.warn("Email non envoye : MAIL_ID ou MP est manquant.");
    return null;
  }

  return getTransporter().sendMail({
    from: process.env.MAIL_FROM || `"BloodLink" <${process.env.MAIL_ID}>`,
    to,
    subject,
    text,
    html,
  });
}

async function sendEmailSafely(email) {
  try {
    return await sendEmail(email);
  } catch (error) {
    // L'email est secondaire : une erreur SMTP ne doit jamais annuler l'action metier.
    console.error("Erreur lors de l'envoi d'email :", error.message);
    return null;
  }
}

module.exports = { sendEmail, sendEmailSafely };
