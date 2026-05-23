import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';
import path from 'path';

// Robustly load env files from current working directory or relative to this source file
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log("☁️ Initializing Cloudinary for Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME || "UNDEFINED!");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
