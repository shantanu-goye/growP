/*
  Warnings:

  - Added the required column `adharnumber` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dob` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ifceCode` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `panNumber` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adharnumber" TEXT NOT NULL,
ADD COLUMN     "dob" TEXT NOT NULL,
ADD COLUMN     "ifceCode" TEXT NOT NULL,
ADD COLUMN     "panNumber" TEXT NOT NULL;
