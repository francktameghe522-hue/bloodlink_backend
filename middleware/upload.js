const multer = require('multer');

// Utilisation de memoryStorage pour passer le buffer à Cloudinary
const storage = multer.memoryStorage();

// Filtre : accepter uniquement les images
function fileFilter(req, file, cb) {
  const typesAutorises = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (typesAutorises.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Formats acceptés : jpeg, jpg, png, gif, webp.'), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

module.exports = upload;
