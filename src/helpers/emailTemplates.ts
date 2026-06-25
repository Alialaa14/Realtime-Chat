export const otpEmailTemplate = ({
  name,
  otp,
  expiresInMinutes = 10,
  appName = "MyApp",
  supportEmail = "support@myapp.com",
}: {
  name: string;
  otp: string;
  expiresInMinutes?: number;
  appName?: string;
  supportEmail?: string;
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your OTP Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">${appName}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:0.5px;text-transform:uppercase;">Verification Code</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:44px 48px 36px;">

              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#111827;">Hi ${name} 👋</p>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                We received a request to verify your identity. Use the one-time code below to proceed. Do not share this code with anyone.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:28px 0;">
                    <div style="display:inline-block;background:#f5f3ff;border:2px dashed #7c3aed;border-radius:12px;padding:20px 48px;">
                      <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:2px;">Your OTP</p>
                      <p style="margin:0;font-size:42px;font-weight:800;color:#4f46e5;letter-spacing:12px;">${otp}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 16px;">
                    <p style="margin:0;font-size:13px;color:#92400e;">
                      ⏳ This code expires in <strong>${expiresInMinutes} minutes</strong>. Request a new one if it expires.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email. Your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 48px;">
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px 36px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Need help? Contact us at
                <a href="mailto:${supportEmail}" style="color:#4f46e5;text-decoration:none;">${supportEmail}</a>
              </p>
              <p style="margin:0;font-size:12px;color:#d1d5db;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;
