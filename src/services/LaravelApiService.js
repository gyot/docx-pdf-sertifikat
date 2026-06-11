const axios = require('axios');
const { LARAVEL_API_URL, LARAVEL_API_TOKEN } = require('../config');
const { AppError } = require('../helpers/errors');
const logger = require('../helpers/logger');

const apiClient = axios.create({
  baseURL: LARAVEL_API_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    ...(LARAVEL_API_TOKEN ? { Authorization: `Bearer ${LARAVEL_API_TOKEN}` } : {})
  }
});

exports.getCertificate = async (id) => {
  if (!id) {
    throw new AppError('Certificate ID is required', 400);
  }

  try {
    logger.info(`Fetching certificate data from Laravel API for id=${id}`);
    const response = await apiClient.get(`/api/v1/sertifikat/${id}`);

    let raw = response.data;
    let certificateData = raw?.data || raw;

    if (!certificateData || (!certificateData.id_batch && !certificateData.id)) {
      logger.error(`Unexpected Laravel API response format: ${JSON.stringify(raw).substring(0, 500)}`);
      throw new AppError('Certificate not found', 404);
    }

    const pesertaList = Array.isArray(certificateData.peserta) ? certificateData.peserta : [];
    const firstPeserta = pesertaList[0]?.peserta || {};

    const result = {
      id_batch: certificateData.id_batch || certificateData.id,
      id_kegiatan: certificateData.id_kegiatan,
      nomor_sertifikat: certificateData.nomor_sertifikat || '',
      tanggal_ttd: certificateData.tanggal_ttd || '',
      template_file_url: certificateData.template_file_url || '',
      status: certificateData.status || '',
      nama_kegiatan: certificateData.kegiatan?.nama_kegiatan || '',
      nama: firstPeserta.nama_lengkap || '',
      instansi: firstPeserta.nama_instansi || '',
      jabatan: firstPeserta.jabatan || '',
      nip: firstPeserta.nip || '',
      penandatangan: certificateData.penandatangan?.nama || '',
      peserta_list: pesertaList
    };

    logger.info(`Certificate data received: id_batch=${result.id_batch}, peserta=${pesertaList.length}`);
    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.response && error.response.status === 401) {
      throw new AppError('Unauthorized: Invalid or missing API token', 401);
    }
    if (error.response && error.response.status === 404) {
      throw new AppError('Certificate not found', 404);
    }
    if (error.code === 'ECONNABORTED') {
      throw new AppError('Laravel API request timed out', 504);
    }
    throw new AppError(`Failed to fetch certificate from Laravel API: ${error.message}`, 502);
  }
};
