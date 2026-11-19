# Dockerfile ở gốc repo, dành cho Render (Runtime = Docker, Root Directory để trống).
# Chỉ đóng gói API (apps/api). Giữ cả gói phát triển để lúc khởi động còn nạp dữ liệu mẫu bằng ts-node.
FROM node:22-alpine
WORKDIR /app
COPY apps/api/package.json apps/api/package-lock.json ./
RUN npm ci
COPY apps/api/prisma ./prisma
RUN npx prisma generate
COPY apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/nest-cli.json ./
COPY apps/api/src ./src
RUN npm run build
ENV NODE_ENV=production
EXPOSE 10000
# migrate → nạp dữ liệu mẫu (lặp lại an toàn) → chạy API. Render tự đặt PORT.
CMD ["npm", "run", "start:render"]
