const express = require('express');
const { generateCertificate } = require('../controllers/certificateController');

const router = express.Router();

router.post('/', generateCertificate);

module.exports = router;
