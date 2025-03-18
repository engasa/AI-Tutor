-- CreateTable
CREATE TABLE "feedbacks" (
    "id" SERIAL NOT NULL,
    "relevanceAccuracy" INTEGER NOT NULL,
    "easeOfUse" INTEGER NOT NULL,
    "learningOutcomes" INTEGER NOT NULL,
    "feedbackAssessment" INTEGER NOT NULL,
    "userSatisfaction" INTEGER NOT NULL,
    "recommendationLikely" INTEGER NOT NULL,
    "additionalComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);
