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

  const templateData = {
    nomor_sertifikat: String(data.nomor_sertifikat || ''),
    nama: String(data.nama || ''),
    instansi: String(data.instansi || ''),
    jabatan: String(data.jabatan || ''),
    nip: String(data.nip || ''),
    kegiatan: String(data.nama_kegiatan || ''),
    tgl_ttd: String(data.tgl_ttd || ''),
    tanggal: String(data.tanggal || ''),
    peran: String(data.peran || ''),
    penanda_tangan: String(data.penanda_tangan || ''),
    jabatan_penandatangan: String(data.jabatan_penandatangan || ''),
    penanda_tangan_nip: String(data.penanda_tangan_nip || ''),
    tpk: String(data.tpk || '')
  };
  logger.info(`Template data: ${JSON.stringify(templateData)}`);

  const filledDocxPath = await TemplateService.fillTemplate(templateData, templatePath);

  const pdfPath = await PdfConverterService.convertDocxToPdf(filledDocxPath);

  logger.info(`Certificate generation completed for id_batch=${data.id_batch}`);

  return {
    templatePath,
    filledDocxPath,
    pdfPath
  };
};

