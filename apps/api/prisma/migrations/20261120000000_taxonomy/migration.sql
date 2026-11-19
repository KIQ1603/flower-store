-- CreateEnum
CREATE TYPE "TaxonKind" AS ENUM ('FLOWER_TYPE', 'OCCASION', 'RECIPIENT');

-- AlterTable
ALTER TABLE "CareCategory" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Taxon" (
    "id" SERIAL NOT NULL,
    "kind" "TaxonKind" NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Taxon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Taxon_kind_name_key" ON "Taxon"("kind", "name");


-- Dữ liệu ban đầu của danh mục (an toàn khi chạy lặp lại)
INSERT INTO "Taxon" ("kind", "name", "icon", "sort") VALUES
  ('FLOWER_TYPE', 'Hoa hồng', '🌹', 0), ('FLOWER_TYPE', 'Tulip', '🌷', 1), ('FLOWER_TYPE', 'Cẩm tú cầu', '💠', 2), ('FLOWER_TYPE', 'Hướng dương', '🌻', 3),
  ('FLOWER_TYPE', 'Cúc tana', '🌼', 4), ('FLOWER_TYPE', 'Hoa ly', '🌸', 5), ('FLOWER_TYPE', 'Hoa lan', '🪻', 6), ('FLOWER_TYPE', 'Cát tường', '💐', 7), ('FLOWER_TYPE', 'Hoa mix', '💐', 8),
  ('OCCASION', 'Sinh nhật', '🎂', 0), ('OCCASION', 'Kỷ niệm', '💞', 1), ('OCCASION', 'Tình yêu', '❤️', 2), ('OCCASION', 'Cảm ơn', '🙏', 3), ('OCCASION', 'Chúc mừng', '🎉', 4),
  ('OCCASION', 'Khai trương', '🎊', 5), ('OCCASION', 'Tốt nghiệp', '🎓', 6), ('OCCASION', 'Valentine', '💘', 7), ('OCCASION', 'Ngày của Mẹ', '🌺', 8), ('OCCASION', '8/3', '🌸', 9),
  ('OCCASION', '20/10', '🌷', 10), ('OCCASION', 'Xin lỗi', '🕊️', 11), ('OCCASION', 'Thăm bệnh', '🍀', 12), ('OCCASION', 'Cưới hỏi', '💍', 13), ('OCCASION', 'Chia buồn', '🤍', 14),
  ('RECIPIENT', 'Người yêu', '💑', 0), ('RECIPIENT', 'Vợ / Chồng', '💍', 1), ('RECIPIENT', 'Mẹ', '👩', 2), ('RECIPIENT', 'Bố', '👨', 3), ('RECIPIENT', 'Ông bà', '👵', 4),
  ('RECIPIENT', 'Bạn bè', '🤝', 5), ('RECIPIENT', 'Đồng nghiệp', '💼', 6), ('RECIPIENT', 'Sếp / Cấp trên', '👔', 7), ('RECIPIENT', 'Thầy cô', '📚', 8), ('RECIPIENT', 'Đối tác', '🤝', 9), ('RECIPIENT', 'Con cái', '🧒', 10)
ON CONFLICT ("kind", "name") DO NOTHING;

-- Giá trị đang dùng trên sản phẩm có sẵn mà chưa nằm trong danh sách mặc định → thêm vào để không mất
INSERT INTO "Taxon" ("kind", "name", "sort")
  SELECT 'FLOWER_TYPE', c, 100 FROM (SELECT DISTINCT "category" AS c FROM "Product" WHERE "type" = 'FLOWER') x
ON CONFLICT ("kind", "name") DO NOTHING;
INSERT INTO "Taxon" ("kind", "name", "sort")
  SELECT 'OCCASION', t, 100 FROM (SELECT DISTINCT unnest("occasionTags") AS t FROM "Product") x
ON CONFLICT ("kind", "name") DO NOTHING;
INSERT INTO "Taxon" ("kind", "name", "sort")
  SELECT 'RECIPIENT', t, 100 FROM (SELECT DISTINCT unnest("recipientTags") AS t FROM "Product") x
ON CONFLICT ("kind", "name") DO NOTHING;

UPDATE "CareCategory" SET "icon" = CASE "name"
  WHEN 'Lọ thủy tinh tái chế' THEN '🏺' WHEN 'Bộ trang trí lọ hoa' THEN '🎀' WHEN 'Nước dưỡng hoa' THEN '🧴'
  WHEN 'Dụng cụ cắt tỉa' THEN '✂️' WHEN 'Tinh dầu trang trí' THEN '🕯️' WHEN 'Combo chăm hoa' THEN '🎁' ELSE "icon" END
WHERE "icon" IS NULL;
