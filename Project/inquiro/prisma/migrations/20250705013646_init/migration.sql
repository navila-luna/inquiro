-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "originalMessageId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgePairSource" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "knowledgePairId" TEXT NOT NULL,

    CONSTRAINT "KnowledgePairSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgePair" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "KnowledgePair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEdge" (
    "id" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "sourcePairId" TEXT NOT NULL,
    "targetPairId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Message_originalMessageId_key" ON "Message"("originalMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgePairSource_messageId_knowledgePairId_key" ON "KnowledgePairSource"("messageId", "knowledgePairId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgePairSource" ADD CONSTRAINT "KnowledgePairSource_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgePairSource" ADD CONSTRAINT "KnowledgePairSource_knowledgePairId_fkey" FOREIGN KEY ("knowledgePairId") REFERENCES "KnowledgePair"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_sourcePairId_fkey" FOREIGN KEY ("sourcePairId") REFERENCES "KnowledgePair"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_targetPairId_fkey" FOREIGN KEY ("targetPairId") REFERENCES "KnowledgePair"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
