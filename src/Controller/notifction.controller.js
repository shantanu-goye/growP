import {
  PrismaClient,
  NotificationType,
  NotificationChannel,
} from "@prisma/client";
import sendMail from "./sendMail"; // Your email sending utility

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { message, planType, title } = req.body;

  if (!message || !title) {
    return res.status(400).json({ message: "Missing message or title" });
  }

  try {
    let users;

    if (planType && planType.toLowerCase() !== "all") {
      users = await prisma.user.findMany({
        where: { plan: planType.toLowerCase() },
        select: { id: true, name: true, email: true },
      });
    } else {
      users = await prisma.user.findMany({
        select: { id: true, name: true, email: true },
      });
    }

    if (!users.length) {
      return res
        .status(404)
        .json({ message: "No users found for the given plan" });
    }

    await Promise.all(
      users.map(async (user) => {
        // Send Email
        await sendMail({
          to: user.email,
          subject: title,
          html: `<p>Hello ${user.name},</p><p>${message}</p>`,
        });

        // Save Notification
        await prisma.notification.create({
          data: {
            userId: user.id,
            title,
            message,
            type: NotificationType.GENERAL, // Assuming GENERAL for generic notification
            channel: [NotificationChannel.EMAIL], // Email channel
            sentAt: new Date(),
            isRead: false,
            metadata: null,
          },
        });
      })
    );

    return res
      .status(200)
      .json({ message: "Notifications sent and saved successfully" });
  } catch (error) {
    console.error("Notification send error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
