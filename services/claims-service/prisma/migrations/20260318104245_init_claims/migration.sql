-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "claimantUserId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "message" TEXT,
    "proof" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Claim_postId_idx" ON "Claim"("postId");

-- CreateIndex
CREATE INDEX "Claim_claimantUserId_idx" ON "Claim"("claimantUserId");

-- CreateIndex
CREATE INDEX "Claim_ownerUserId_idx" ON "Claim"("ownerUserId");

-- CreateIndex
CREATE INDEX "Claim_status_idx" ON "Claim"("status");
