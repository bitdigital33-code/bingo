-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('owner', 'admin', 'operator');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('draft', 'live', 'paused', 'completed');

-- CreateEnum
CREATE TYPE "DrawEventType" AS ENUM ('draw', 'correction', 'revert');

-- CreateEnum
CREATE TYPE "PrizePattern" AS ENUM ('single_line', 'double_line', 'full_house', 'marked_count');

-- CreateEnum
CREATE TYPE "ThemeKey" AS ENUM ('natal', 'cassino', 'neon', 'junina', 'infantil');

-- CreateEnum
CREATE TYPE "WinClaimStatus" AS ENUM ('pending', 'confirmed', 'rejected');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "theme" "ThemeKey" NOT NULL,
    "allowAutoMark" BOOLEAN NOT NULL DEFAULT true,
    "allowManualMark" BOOLEAN NOT NULL DEFAULT true,
    "maxCardsPerPlayer" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'draft',
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "featuredPrizeRoundId" TEXT,
    "prizeShowcaseVisible" BOOLEAN NOT NULL DEFAULT false,
    "stageMomentKey" TEXT,
    "stageMomentTitle" TEXT,
    "stageMomentMessage" TEXT,
    "stageMomentExpiresAt" TIMESTAMP(3),
    "stageMomentVisible" BOOLEAN NOT NULL DEFAULT false,
    "recentDrawsVisible" BOOLEAN NOT NULL DEFAULT false,
    "tvResetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeRound" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pattern" "PrizePattern" NOT NULL,
    "targetMarks" INTEGER,
    "order" INTEGER NOT NULL,
    "prize" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrizeRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSession" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "autoMark" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BingoCard" (
    "id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "matrixJson" JSONB NOT NULL,
    "printedRoomId" TEXT,
    "printBatchId" TEXT,
    "digitalAccessCode" TEXT,
    "printedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BingoCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardAssignment" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerSessionId" TEXT NOT NULL,
    "bingoCardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "letter" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "display" TEXT NOT NULL,
    "type" "DrawEventType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "correctedFromId" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WinClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "roomId" TEXT,
    "matchId" TEXT NOT NULL,
    "playerSessionId" TEXT,
    "playerName" TEXT,
    "roundId" TEXT,
    "cardId" TEXT,
    "triggeredByDrawId" TEXT,
    "status" "WinClaimStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "snapshotJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WinClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemePreset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "key" "ThemeKey" NOT NULL,
    "label" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "ambient" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThemePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roomId" TEXT,
    "matchId" TEXT,
    "userId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'admin',
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_tenantId_role_idx" ON "Membership"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tenantId_userId_key" ON "Membership"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_joinCode_key" ON "Room"("joinCode");

-- CreateIndex
CREATE INDEX "Match_roomId_status_idx" ON "Match"("roomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeRound_matchId_order_key" ON "PrizeRound"("matchId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSession_token_key" ON "PlayerSession"("token");

-- CreateIndex
CREATE INDEX "PlayerSession_roomId_createdAt_idx" ON "PlayerSession"("roomId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BingoCard_serial_key" ON "BingoCard"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "BingoCard_digitalAccessCode_key" ON "BingoCard"("digitalAccessCode");

-- CreateIndex
CREATE INDEX "BingoCard_printedRoomId_printedAt_idx" ON "BingoCard"("printedRoomId", "printedAt");

-- CreateIndex
CREATE INDEX "BingoCard_printBatchId_idx" ON "BingoCard"("printBatchId");

-- CreateIndex
CREATE INDEX "CardAssignment_matchId_playerSessionId_idx" ON "CardAssignment"("matchId", "playerSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CardAssignment_matchId_bingoCardId_key" ON "CardAssignment"("matchId", "bingoCardId");

-- CreateIndex
CREATE INDEX "DrawEvent_matchId_sequence_idx" ON "DrawEvent"("matchId", "sequence");

-- CreateIndex
CREATE INDEX "WinClaim_tenantId_createdAt_idx" ON "WinClaim"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "WinClaim_roomId_createdAt_idx" ON "WinClaim"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "WinClaim_matchId_createdAt_idx" ON "WinClaim"("matchId", "createdAt");

-- CreateIndex
CREATE INDEX "WinClaim_status_createdAt_idx" ON "WinClaim"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThemePreset_tenantId_key_key" ON "ThemePreset"("tenantId", "key");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_roomId_createdAt_idx" ON "AuditLog"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_matchId_createdAt_idx" ON "AuditLog"("matchId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeRound" ADD CONSTRAINT "PrizeRound_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSession" ADD CONSTRAINT "PlayerSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoCard" ADD CONSTRAINT "BingoCard_printedRoomId_fkey" FOREIGN KEY ("printedRoomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAssignment" ADD CONSTRAINT "CardAssignment_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAssignment" ADD CONSTRAINT "CardAssignment_playerSessionId_fkey" FOREIGN KEY ("playerSessionId") REFERENCES "PlayerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAssignment" ADD CONSTRAINT "CardAssignment_bingoCardId_fkey" FOREIGN KEY ("bingoCardId") REFERENCES "BingoCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawEvent" ADD CONSTRAINT "DrawEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinClaim" ADD CONSTRAINT "WinClaim_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinClaim" ADD CONSTRAINT "WinClaim_playerSessionId_fkey" FOREIGN KEY ("playerSessionId") REFERENCES "PlayerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemePreset" ADD CONSTRAINT "ThemePreset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

