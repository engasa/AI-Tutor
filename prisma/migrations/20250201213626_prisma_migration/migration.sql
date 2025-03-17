-- AlterTable
ALTER TABLE "_QuestionToTag" ADD CONSTRAINT "_QuestionToTag_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_QuestionToTag_AB_unique";
