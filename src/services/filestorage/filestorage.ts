import fs from "fs";
import multer from "multer";
// import path, { dirname } from "path";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const path = `./public/uploads/avatars/${new Date().getFullYear()}/${
      new Date().getMonth() + 1
    }`;
    fs.mkdirSync(path, { recursive: true });

    cb(null, path);
  },
  filename: function (req, file, cb) {
    const filetype = file.mimetype.split("/")[1];

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profilePicture" + "-" + uniqueSuffix + "." + filetype);
  },
});

// const upload = multer({ dest: "./public/data/uploads/" });
const upload = multer({ storage: storage, limits: { fileSize: 2000000 } });

export const removeUploadedFile = (path: string) => {
  fs.unlink(path, (err) => {
    if (err) {
      console.error(err);
      return;
    }
  });
};

export default upload.single("selectedImage");
