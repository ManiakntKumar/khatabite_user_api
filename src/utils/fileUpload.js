
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");

class ItemImageUpload {
  constructor() {
    this.uploadRoot = path.resolve(
      process.cwd(),
      "upload_folder"
    );

    this.folderName = "Item_image";
  }

  ensureFolder() {
    const folderPath = path.join(
      this.uploadRoot,
      this.folderName
    );

    fs.mkdirSync(folderPath, { recursive: true });

    return folderPath;
  }

  async saveImage(file) {
    if (!file || !file.buffer) {
      return null;
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error("Only JPEG, PNG and WebP images are allowed");
    }

    const folderPath = this.ensureFolder();
    const fileName = `${crypto.randomUUID()}.webp`;
    const filePath = path.join(folderPath, fileName);

    try {
      const image = sharp(file.buffer, {
        limitInputPixels: 25_000_000,
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

      return `${this.folderName}/${fileName}`;
    } catch (error) {
      await fs.promises.rm(filePath, { force: true });
      throw error;
    }
  }

  async deleteImage(imagePath) {
    if (!imagePath) return;

    const normalized = imagePath.replace(/\\/g, "/");

    if (
      !normalized.startsWith("Item_image/") ||
      normalized.includes("..")
    ) {
      throw new Error("Invalid item image path");
    }

    const folderPath = this.ensureFolder();
    const filePath = path.resolve(this.uploadRoot, normalized);

    if (!filePath.startsWith(folderPath + path.sep)) {
      throw new Error("Invalid item image path");
    }

    await fs.promises.rm(filePath, { force: true });
  }
}

module.exports = new ItemImageUpload();
