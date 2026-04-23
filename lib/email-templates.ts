// HTML + plain-text email templates.
//
// Inline CSS only — email clients ignore <style> blocks in many cases
// (Gmail/Outlook). Keep styles minimal; lean on system fonts so it looks
// consistent everywhere without a font download.
//
// Palette matches the site: warm off-white, soft charcoal, muted accent.

export type ReceiptItem = {
  title: string;
  number: string;
  cityName?: string | null;
  downloadUrl: string; // absolute URL to /api/download/{token}
};

export type ReceiptEmail = {
  orderShortId: string; // last 8 chars of order id, same as UI
  totalEur: string; // "5.00"
  items: ReceiptItem[];
  orderUrl: string; // absolute URL to /checkout/success?sid=...
  supportEmail: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderReceipt(data: ReceiptEmail): { html: string; text: string } {
  const itemsHtml = data.items
    .map(
      (it) => `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #ece7df;vertical-align:top;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2a2724;">${esc(it.title)}</div>
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#86807a;letter-spacing:0.04em;margin-top:4px;">
            ${esc(it.number)}${it.cityName ? ` &middot; ${esc(it.cityName)}` : ''}
          </div>
        </td>
        <td style="padding:16px 0;border-bottom:1px solid #ece7df;vertical-align:top;text-align:right;">
          <a href="${esc(it.downloadUrl)}"
             style="display:inline-block;padding:10px 18px;background:#2a2724;color:#fbf7f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;border-radius:2px;">
            Download
          </a>
        </td>
      </tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#fbf7f0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fbf7f0;">
      <tr>
        <td align="center" style="padding:48px 24px;">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;">
            <tr>
              <td style="padding-bottom:32px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#2a2724;letter-spacing:0.02em;">
                  Linework <em style="font-style:italic;color:#86807a;">Studio</em>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#86807a;letter-spacing:0.1em;text-transform:uppercase;">
                Order ${esc(data.orderShortId)}
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#2a2724;line-height:1.25;">
                Your poster${data.items.length > 1 ? 's are' : ' is'} ready to download<em style="font-style:italic;color:#86807a;">.</em>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;color:#4a4540;line-height:1.6;">
                Thank you for the order. Your files are clean, unmarked, and yours to print. The links below are active for <strong>48 hours</strong> and allow up to <strong>5 downloads</strong> each &mdash; please save the files locally.
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #ece7df;">
                  ${itemsHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 0;text-align:right;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#2a2724;">
                Total (VAT incl.) &nbsp; <strong>&euro;${esc(data.totalEur)}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 0 24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#4a4540;line-height:1.6;">
                If a link expires before you&rsquo;ve saved the files, open your order page any time &mdash;
                <a href="${esc(data.orderUrl)}" style="color:#2a2724;">view order</a> &mdash;
                or email <a href="mailto:${esc(data.supportEmail)}" style="color:#2a2724;">${esc(data.supportEmail)}</a> and we&rsquo;ll re-issue it.
              </td>
            </tr>
            <tr>
              <td style="padding-top:24px;border-top:1px solid #ece7df;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#86807a;line-height:1.6;">
                Linework Studio &middot; Architectural posters, Luxembourg.<br/>
                Digital goods are non-refundable once the files have been downloaded.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Linework Studio — Order ${data.orderShortId}`,
    ``,
    `Your poster${data.items.length > 1 ? 's are' : ' is'} ready to download.`,
    ``,
    `Files are clean, unmarked, and yours to print.`,
    `Links are active for 48 hours, up to 5 downloads each.`,
    ``,
    ...data.items.flatMap((it) => [
      `— ${it.title} (${it.number}${it.cityName ? `, ${it.cityName}` : ''})`,
      `  ${it.downloadUrl}`,
      ``,
    ]),
    `Total (VAT incl.): €${data.totalEur}`,
    ``,
    `If a link expires before you've saved the files, visit your order page:`,
    `  ${data.orderUrl}`,
    `or email ${data.supportEmail} and we'll re-issue it.`,
    ``,
    `— Linework Studio · Luxembourg`,
    `Digital goods are non-refundable once the files have been downloaded.`,
  ].join('\n');

  return { html, text };
}
