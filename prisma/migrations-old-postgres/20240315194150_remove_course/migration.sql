/*
  Warnings:

  - You are about to drop the column `courseId` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `courseId` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the `Course` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_courseId_fkey";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "courseId";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "courseId";

-- DropTable
DROP TABLE "Course";
