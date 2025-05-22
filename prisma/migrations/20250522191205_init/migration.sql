/*
  Warnings:

  - You are about to drop the column `DepositeId` on the `Deposit` table. All the data in the column will be lost.
  - You are about to drop the column `adharnumber` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `customerNumber` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `ifceCode` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[transactionId]` on the table `Deposit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[depositId]` on the table `Deposit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transactionId]` on the table `Withdrawal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[withdrawalId]` on the table `Withdrawal` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `depositId` to the `Deposit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `aadhaarNumber` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ifscCode` to the `User` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `dob` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Deposit" DROP COLUMN "DepositeId",
ADD COLUMN     "depositId" TEXT NOT NULL,
ALTER COLUMN "utr" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "adharnumber",
DROP COLUMN "customerNumber",
DROP COLUMN "ifceCode",
ADD COLUMN     "aadhaarNumber" TEXT NOT NULL,
ADD COLUMN     "ifscCode" TEXT NOT NULL,
DROP COLUMN "dob",
ADD COLUMN     "dob" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_transactionId_key" ON "Deposit"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_depositId_key" ON "Deposit"("depositId");

-- CreateIndex
CREATE INDEX "FCMToken_userId_idx" ON "FCMToken"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Withdrawal_transactionId_key" ON "Withdrawal"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Withdrawal_withdrawalId_key" ON "Withdrawal"("withdrawalId");
