import transporter from "../utils/emailTransporter.ts";
import { ENV } from "./ENV.ts";

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string,
) => {
  try {
    await transporter.sendMail({
      from: ENV.EMAIL,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.log(error);
  }
};
