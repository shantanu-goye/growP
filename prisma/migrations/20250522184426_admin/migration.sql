/*
  Warnings:

  - You are about to drop the column `pendingBalance` on the `Balance` table. All the data in the column will be lost.
  - Added the required column `DepositeId` to the `Deposit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transactionId` to the `Deposit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `utr` to the `Deposit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transactionId` to the `Withdrawal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `withdrawalId` to the `Withdrawal` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('admin', 'superadmin');

-- AlterTable
ALTER TABLE "Balance" DROP COLUMN "pendingBalance",
ADD COLUMN     "pendingDepositBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "pendingWithdrawalBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "DepositeId" TEXT NOT NULL,
ADD COLUMN     "transactionId" TEXT NOT NULL,
ADD COLUMN     "utr" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN     "transactionId" TEXT NOT NULL,
ADD COLUMN     "withdrawalId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
