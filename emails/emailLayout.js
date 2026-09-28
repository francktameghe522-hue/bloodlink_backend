function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function emailLayout({ title, intro, details = [], actionUrl, actionLabel }) {
  const rows = details.map(({ label, value }) => `
    <tr><td style="padding:8px 0;color:#6b7280">${escapeHtml(label)}</td><td style="padding:8px 0;font-weight:600;text-align:right">${escapeHtml(value)}</td></tr>
  `).join("");

  return `
    <main style="max-width:620px;margin:0 auto;padding:28px;font-family:Arial,sans-serif;color:#202124">
      <h1 style="margin:0 0 20px;color:#a51f29">BloodLink</h1>
      <h2 style="margin:0 0 14px">${escapeHtml(title)}</h2>
      <p style="line-height:1.6">${escapeHtml(intro)}</p>
      ${rows ? `<table style="width:100%;margin:22px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb">${rows}</table>` : ""}
      <a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 18px;background:#a51f29;color:#ffffff;text-decoration:none;border-radius:7px">${escapeHtml(actionLabel)}</a>
      <p style="margin-top:28px;color:#6b7280;font-size:12px">Cet email a été envoyé par BloodLink.</p>
    </main>
  `;
}

module.exports = { emailLayout };
