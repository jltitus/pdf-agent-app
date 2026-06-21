const LOGO_URL = 'https://pdf-agent-app-r6ih.vercel.app/jar-logosm.png'
const BRAND_NAME = 'MFP Volunteer Resource Hub'
const BRAND_COLOR = '#d73f09'

export function emailTemplate(body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f7f4ef;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f4ef;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};border-radius:16px 16px 0 0;padding:24px 32px;text-align:center;">
              <img src="${LOGO_URL}" alt="${BRAND_NAME}" height="48" style="display:block;margin:0 auto 8px;" />
              <p style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;opacity:0.9;">
                ${BRAND_NAME}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-left:1px solid #e5e1db;border-right:1px solid #e5e1db;">
              <div style="color:#1a1a1a;font-size:15px;line-height:1.7;">
                ${body}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f0ede9;border-radius:0 0 16px 16px;border:1px solid #e5e1db;border-top:none;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#888;line-height:1.5;">
                ${BRAND_NAME}<br />
                This is an automated message — please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
