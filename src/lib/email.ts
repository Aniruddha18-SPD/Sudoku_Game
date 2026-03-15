import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

const fromEmail = process.env.RESEND_FROM || "onboarding@resend.dev";

export async function sendVerificationEmail(email: string, token: string) {
  if (!fromEmail) return;
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify?token=${token}`;

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "Verify your email",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Verify your email</h2>
        <p>Click the button to verify your account.</p>
        <p><a href="${verifyUrl}">Verify email</a></p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  if (!fromEmail) return;
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset?token=${token}`;

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "Reset your password",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Reset your password</h2>
        <p>Click the button below to set a new password.</p>
        <p><a href="${resetUrl}">Reset password</a></p>
      </div>
    `,
  });
}
