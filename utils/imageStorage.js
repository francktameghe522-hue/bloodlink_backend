const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

const uploadsDirectory = path.join(__dirname, "..", "uploads");
const extensions = {
  "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
  "image/avif": "avif", "image/bmp": "bmp", "image/tiff": "tiff", "image/heic": "heic", "image/heif": "heif",
};

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => error ? reject(error) : resolve(result));
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

async function uploadImage(file, folder) {
  if (process.env.CLOUDINARY_URL) {
    const result = await uploadToCloudinary(file.buffer, { folder, resource_type: "image" });
    return { url: result.secure_url, publicId: result.public_id };
  }

  await fs.mkdir(uploadsDirectory, { recursive: true });
  const filename = `${crypto.randomUUID()}.${extensions[file.mimetype]}`;
  await fs.writeFile(path.join(uploadsDirectory, filename), file.buffer);
  return { url: `/uploads/${filename}`, publicId: null };
}

async function deleteImage(url, publicId) {
  if (publicId && process.env.CLOUDINARY_URL) {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    return;
  }
  if (url?.startsWith("/uploads/")) {
    await fs.unlink(path.join(uploadsDirectory, path.basename(url))).catch(() => {});
  }
}

module.exports = { uploadImage, deleteImage };
