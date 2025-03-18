/*
  Warnings:

  - You are about to drop the column `selected` on the `Instruction` table. All the data in the column will be lost.
  - Added the required column `title` to the `Instruction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Instruction" DROP CONSTRAINT "Instruction_userId_fkey";

-- AlterTable
ALTER TABLE "Instruction" DROP COLUMN "selected",
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "userType" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Instruction" ADD CONSTRAINT "Instruction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
