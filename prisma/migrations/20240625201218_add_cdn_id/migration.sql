/*
  Warnings:

  - The required column `cdnId` was added to the `Post` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `cdnId` was added to the `User` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "cdnId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cdnId" TEXT NOT NULL;
