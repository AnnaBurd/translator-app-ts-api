import fs from "fs";
import util from "util";
import nodemailer from "nodemailer";
import handlebars from "handlebars";

import {
  CLIENT_URL,
  EMAIL_ID,
  EMAIL_PASSWORD,
  NOTIFICATIONS_EMAIL,
} from "../../config.js";

const templatesPath = "./src/services/emails/templates";
// Initialize nodemailer
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_ID,
    pass: EMAIL_PASSWORD,
  },
});

// Function to read the email template from the file
const readFile = util.promisify(fs.readFile);

// Function to compile the Handlebars template
async function compileTemplate(
  templatePath: fs.PathOrFileDescriptor,
  data: any
) {
  const source = await readFile(templatePath, "utf8");
  const template = handlebars.compile(source);
  return template(data);
}

export async function sendWelcomeEmail(email: string) {
  const subject = "Welcome to the Translator App!";
  const url = `${CLIENT_URL}/dashboard`;

  try {
    const compiledTemplate = await compileTemplate(
      `${templatesPath}/welcome.hbs`,
      {
        url,
      }
    );

    const mailOptions = {
      from: `"Translator App" <${EMAIL_ID}>`,
      to: email,
      subject: subject,
      html: compiledTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent successfully!", info.response);
      }
    });
  } catch (error) {
    console.error("Error compiling mail template:", error);
  }
}

export async function sendNotificationOnNewUser(newUserEmail: string) {
  const subject = "New user";
  const url = `${CLIENT_URL}users`;

  try {
    const compiledTemplate = await compileTemplate(
      `${templatesPath}/new-user.hbs`,
      {
        newEmail: newUserEmail,
        url,
      }
    );

    const mailOptions = {
      from: `"Translator App" <${EMAIL_ID}>`,
      to: NOTIFICATIONS_EMAIL,
      subject: subject,
      html: compiledTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent successfully!", info.response);
      }
    });
  } catch (error) {
    console.error("Error compiling mail template:", error);
  }
}
export async function sendPasswordResetLink(
  userEmail: string,
  token: string,
  url: string
) {
  const subject = "Password reset for Translator App";

  try {
    const compiledTemplate = await compileTemplate(
      `${templatesPath}/password-reset.hbs`,
      {
        token: token,
        url,
      }
    );

    const mailOptions = {
      from: `"Translator App" <${EMAIL_ID}>`,
      to: userEmail,
      subject: subject,
      html: compiledTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent successfully!", info.response);
      }
    });
  } catch (error) {
    console.error("Error compiling mail template:", error);
  }
}
