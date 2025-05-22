import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const logAction = async (userId, action, metadata) => {
  return prisma.auditLog.create({
    data: {
      action,
      userId,
      metadata,
    },
  });
};

// Admin endpoint to view logs
export const getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    });

    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch logs" });
  }
};
