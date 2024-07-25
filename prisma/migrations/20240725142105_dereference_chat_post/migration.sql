-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_postId_fkey";

-- AlterTable
ALTER TABLE "Chat" ALTER COLUMN "postId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
