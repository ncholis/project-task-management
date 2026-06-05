const nodemailer = require('nodemailer');
const env = require('./env');

function createTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      : undefined
  });
}

const transporter = createTransporter();

async function sendTaskAssignmentEmail(payload) {
  const subject = payload.subject || `Task assigned: ${payload.task_title}`;
  const text = [
    `Task: ${payload.task_title}`,
    `Project: ${payload.project_name}`,
    `Assigned by: ${payload.assigned_by_name}`
  ].join('\n');

  if (!transporter) {
    console.log('SMTP not configured. Email payload:', {
      to: payload.to,
      subject,
      task_title: payload.task_title,
      project_name: payload.project_name,
      assigned_by_name: payload.assigned_by_name
    });
    return { fallback: true };
  }

  return transporter.sendMail({
    from: env.SMTP_FROM,
    to: payload.to,
    subject,
    text
  });
}

module.exports = {
  sendTaskAssignmentEmail
};
