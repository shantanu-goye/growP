import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import ejs from "ejs";
import { configDotenv } from "dotenv";
configDotenv();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendMail({
  to,
  subject,
  text,
  html,
  template,
  context = {},
}) {
  let emailOptions = {
    from: process.env.EMAIL_FROM || `"No Reply" <${process.env.EMAIL_USER}>`,
    to,
    subject,
  };

  if (template) {
    const templatePath = path.resolve(
      process.cwd(),
      "templates",
      `${template}.ejs`
    );

    if (!fs.existsSync(templatePath)) {
      throw new Error(
        `Template file ${template}.ejs not found in templates folder`
      );
    }

    const renderedHtml = await ejs.renderFile(templatePath, context);
    emailOptions.html = renderedHtml;

    if (!html && !text) {
      emailOptions.text = renderedHtml.replace(/<\/?[^>]+(>|$)/g, "");
    }
  } else {
    if (html) emailOptions.html = html;
    if (text) emailOptions.text = text;

    if (!text && !html) {
      throw new Error(
        "You must provide text or html for direct message emails"
      );
    }
  }

  try {
    const info = await transporter.sendMail(emailOptions);
    return info;
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
}
