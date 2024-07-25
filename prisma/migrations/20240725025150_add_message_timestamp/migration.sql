/*
  Warnings:

  - Added the required column `timestamp` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "timestamp" INTEGER NOT NULL;
