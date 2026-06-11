const LaravelApiService = require('./LaravelApiService');
const TemplateService = require('./TemplateService');
const PdfConverterService = require('./PdfConverterService');
const { AppError } = require('../helpers/errors');
const logger = require('../helpers/logger');

exports.generateCertificate = async (id) => {
  const data = await LaravelApiService.getCertificate(id);

  if (!data.template_file_url) {
    throw new AppError('Template URL is missing from certificate data', 500);
  }

  const templatePath = await TemplateService.downloadTemplate(data.template_file_url);

  const filledDocxPath = await TemplateService.fillTemplate(
    {
      nomor_sertifikat: data.nomor_sertifikat,
      nama: data.nama,
      instansi: data.instansi,
      jabatan: data.jabatan,
      nip: data.nip,
      kegiatan: data.nama_kegiatan,
      tanggal: data.tanggal_ttd
    },
    templatePath
  );

  const pdfPath = await PdfConverterService.convertDocxToPdf(filledDocxPath);

  logger.info(`Certificate generation completed for id_batch=${data.id_batch}`);

  return {
    templatePath,
    filledDocxPath,
    pdfPath
  };
};
