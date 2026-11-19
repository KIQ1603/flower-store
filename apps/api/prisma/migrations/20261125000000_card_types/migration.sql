-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cardFee" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderCard" ADD COLUMN     "cardName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "cardPrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cardTypeId" INTEGER,
ALTER COLUMN "style" SET DEFAULT 'SOFT_PINK';

-- CreateTable
CREATE TABLE "CardType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CardType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardType_name_key" ON "CardType"("name");

-- AddForeignKey
ALTER TABLE "OrderCard" ADD CONSTRAINT "OrderCard_cardTypeId_fkey" FOREIGN KEY ("cardTypeId") REFERENCES "CardType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

