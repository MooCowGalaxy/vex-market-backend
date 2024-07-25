/*
  Warnings:

  - You are about to drop the `Image` table. If the table is not empty, all the data it contains will be lost.
  - The required column `cdnId` was added to the `Chat` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_postId_fkey";

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "cdnId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ChatMessage" ALTER COLUMN "image" DROP NOT NULL;

-- DropTable
DROP TABLE "Image";
