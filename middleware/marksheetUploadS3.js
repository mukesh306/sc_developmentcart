// middleware/uploadMarksheetS3.js
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const s3 = require("../config/s3");

module.exports = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
     acl: "private",
    key: (req, file, cb) => {
      cb(
        null,
        `marksheets/${req.user.id}-${Date.now()}${path.extname(file.originalname)}`
      );
    },
  }),
});
