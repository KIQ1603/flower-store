-- Địa điểm của sản phẩm: bắt buộc có tỉnh/thành, tuỳ chọn thêm phường (không chọn phường = cả tỉnh/thành)
ALTER TABLE "Product" ADD COLUMN "provinceId" INTEGER, ADD COLUMN "wardId" INTEGER;

-- Sản phẩm có sẵn: gán vào tỉnh/thành đầu tiên trong danh sách khu vực giao (admin chỉnh lại sau trong trang Sản phẩm)
UPDATE "Product" SET "provinceId" = (SELECT MIN("id") FROM "Province") WHERE "provinceId" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "provinceId" SET NOT NULL;

CREATE INDEX "Product_provinceId_wardId_idx" ON "Product"("provinceId", "wardId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
