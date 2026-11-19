-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "allowIntercity" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shipBreakdown" JSONB;

-- CreateTable
CREATE TABLE "InterProvinceRate" (
    "id" SERIAL NOT NULL,
    "fromProvinceId" INTEGER NOT NULL,
    "toProvinceId" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "etaDays" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InterProvinceRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterProvinceRate_fromProvinceId_toProvinceId_key" ON "InterProvinceRate"("fromProvinceId", "toProvinceId");

-- AddForeignKey
ALTER TABLE "InterProvinceRate" ADD CONSTRAINT "InterProvinceRate_fromProvinceId_fkey" FOREIGN KEY ("fromProvinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterProvinceRate" ADD CONSTRAINT "InterProvinceRate_toProvinceId_fkey" FOREIGN KEY ("toProvinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

