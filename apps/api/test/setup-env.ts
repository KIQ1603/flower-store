import { config } from 'dotenv';
import { resolve } from 'path';
// Test luôn dùng kho ảnh MinIO cục bộ (.env.test), dù .env đang trỏ tới R2
config({ path: resolve(__dirname, '../.env.test'), override: true });
