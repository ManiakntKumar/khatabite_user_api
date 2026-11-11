const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");

class ImageUpload {
  constructor() {
    this.uploadRoot = path.resolve(process.cwd(), "upload_folder");
  }

  //============== Start Common Save Image ==============

  async saveImage(file, folderName) {
    if (!file || !file.buffer) return "";

    // Folder name only; nested paths are not allowed
    if (!/^[a-zA-Z0-9_-]+$/.test(folderName || "")) {
      throw new Error("Invalid image folder name");
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error("Only JPG, JPEG, PNG and WEBP images are allowed");
    }

    const folderPath = path.join(this.uploadRoot, folderName);
    await fs.promises.mkdir(folderPath, { recursive: true });

    const fileName = `${crypto.randomUUID()}.webp`;
    const filePath = path.join(folderPath, fileName);

    try {
      const image = sharp(file.buffer, {
        limitInputPixels: 25000000,
        failOn: "error",
      });

      const metadata = await image.metadata();

      if (!["jpeg", "png", "webp"].includes(metadata.format)) {
        throw new Error("Invalid image file");
      }

      await image
        .rotate()
        .resize({
          width: 1200,
          height: 1200,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality: 80,
          effort: 4,
        })
        .toFile(filePath);

      // Return relative path for MongoDB
      return `${folderName}/${fileName}`;
    } catch (error) {
      await fs.promises.rm(filePath, { force: true });
      throw error;
    }
  }

  //============== End Common Save Image ==============


  //============== Start Common Delete Image ==============

  async deleteImage(imagePath, folderName) {
    if (!imagePath) return;

    if (!/^[a-zA-Z0-9_-]+$/.test(folderName || "")) {
      throw new Error("Invalid image folder name");
    }

    const normalized = imagePath.replace(/\\/g, "/");
    const parts = normalized.split("/");

    if (
      parts.length !== 2 ||
      parts[0] !== folderName ||
      !/^[a-zA-Z0-9_-]+\.webp$/.test(parts[1])
    ) {
      throw new Error("Invalid image path");
    }

    const folderPath = path.resolve(this.uploadRoot, folderName);
    const filePath = path.resolve(this.uploadRoot, ...parts);

    if (!filePath.startsWith(folderPath + path.sep)) {
      throw new Error("Invalid image path");
    }

    await fs.promises.rm(filePath, { force: true });
  }

  //============== End Common Delete Image ==============
}

module.exports = new ImageUpload();