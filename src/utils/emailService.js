import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import ejs from "ejs";
import { configDotenv } from "dotenv";
configDotenv();
// Create reusable transporter using SMTP (example using Gmail SMTP, customize as needed)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
console.log(process.env.EMAIL_PASS, process.env.EMAIL_USER);
/**
 * Send email with support for direct message or template
 * @param {Object} options
 * @param {string} options.to - recipient email address
 * @param {string} options.subject - email subject
 * @param {string} [options.text] - plain text message (for direct message)
 * @param {string} [options.html] - html message (for direct message)
 * @param {string} [options.template] - template filename (relative to templates folder)
 * @param {Object} [options.context] - data context for template rendering
 */
export async function sendMail({
  to,
  subject,
  text,
  html,
  template,
  context = {},
}) {
  let emailOptions = {
    from: process.env.EMAIL_USER || `"No Reply" <${process.env.EMAIL_USER}>`,
    to,
    subject,
  };

  if (template) {
    // Load and render template
    const templatePath = path.resolve(
      process.cwd(),
      "templates",
      `${template}.ejs`
    );
    const templateExists = fs.existsSync(templatePath);
    if (!templateExists) {
      throw new Error(
        `Template file ${template}.ejs not found in templates folder`
      );
    }

    const renderedHtml = await ejs.renderFile(templatePath, context);
    emailOptions.html = renderedHtml;

    // Optionally, generate plain text from HTML (strip tags or pass plain text in context)
    if (!html && !text) {
      emailOptions.text = renderedHtml.replace(/<\/?[^>]+(>|$)/g, ""); // simple HTML to text
    }
  } else {
    // Direct message mode
    if (html) emailOptions.html = html;
    if (text) emailOptions.text = text;

    if (!text && !html) {
      throw new Error(
        "You must provide text or html for direct message emails"
      );
    }
  }

  // Send email
  const info = await transporter.sendMail(emailOptions);
  return info;
}

await sendMail({
  to: "shantanugote82@gmail.com",
  subject: "test mail",
  html: "<h1>hello this is test</h1>",
});
