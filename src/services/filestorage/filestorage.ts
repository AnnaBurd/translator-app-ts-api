import fs from "fs";
import multer from "multer";

// Option 1: default upload to public folder
// const upload = multer({ dest: "./public/data/uploads/" });

// Option 2: upload to public folder with custom filename
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const path = `./public/uploads/avatars/${new Date().getFullYear()}/${
//       new Date().getMonth() + 1
//     }`;
//     fs.mkdirSync(path, { recursive: true });

//     cb(null, path);
//   },
//   filename: function (req, file, cb) {
//     const filetype = file.mimetype.split("/")[1];

//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, "profilePicture" + "-" + uniqueSuffix + "." + filetype);
//   },
// });

// const upload = multer({ storage: storage, limits: { fileSize: 2000000 } });

// export const removeUploadedFile = (path: string) => {
//   fs.unlink(path, (err) => {
//     if (err) {
//       console.error(err);
//       return;
//     }
//   });
// };

// Option 3: in memory multer storage and later upload to azure blob storage
const inmemoryStorage = multer.memoryStorage();

const upload = multer({
  storage: inmemoryStorage,
  limits: { fileSize: 2000000 },
});

export default upload.single("selectedImage");
