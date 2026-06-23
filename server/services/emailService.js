const crypto = require('crypto');

const clientUrl = () => process.env.CLIENT_URL || 'http://127.0.0.1:5173';

const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

const buildVerificationLink = (token) => `${clientUrl()}/verify-email?token=${token}`;

const sendVerificationEmail = async ({ email, name, token }) => {
  const link = buildVerificationLink(token);
  const subject = 'Verify your CreatorSync email';
  const body = `Hi ${name || 'there'},\n\nVerify your email to start discovering collaborators on CreatorSync:\n${link}\n\nThis link expires in 24 hours.\n\n— CreatorSync`;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    // eslint-disable-next-line global-require
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      text: body,
      html: `<p>Hi ${name || 'there'},</p><p><a href="${link}">Verify your email</a> to start discovering collaborators on CreatorSync.</p><p>This link expires in 24 hours.</p>`,
    });
    return { sent: true, devLink: null };
  }

  console.log(`[email] Verification for ${email}: ${link}`);
  return { sent: false, devLink: link };
};

module.exports = {
  generateVerificationToken,
  buildVerificationLink,
  sendVerificationEmail,
};
