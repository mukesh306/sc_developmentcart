const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const fileFilter = (req, file, cb) => {
const allowedTypes = /jpeg|jpg|png|pdf|mp4|mov|avi/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (extname) cb(null, true);
  else cb(new Error('Invalid file type'));
};

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 },
  fileFilter
});

module.exports = upload;
