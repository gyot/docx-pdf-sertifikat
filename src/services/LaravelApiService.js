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
    let dataList = Array.isArray(raw?.data) ? raw.data : (raw?.data ? [raw.data] : []);

    if (dataList.length === 0) {
      logger.error(`Unexpected Laravel API response format: ${JSON.stringify(raw).substring(0, 500)}`);
      throw new AppError('Certificate not found', 404);
    }

    const entry = dataList[0];
    const batch = entry.batch || {};
    const peserta = entry.peserta || {};
    const kegiatan = entry.kegiatan || batch.kegiatan || {};
    const penandatangan = entry.penandatangan || batch.penandatangan || {};

    let templateUrl = batch.template_file_url || '';
    if (templateUrl && LARAVEL_API_URL) {
      try {
        const templateHost = new URL(templateUrl).host;
        const apiHost = new URL(LARAVEL_API_URL).host;
        if (templateHost !== apiHost) {
          templateUrl = templateUrl.replace(templateHost, apiHost);
          logger.info(`Replaced template host: ${templateHost} → ${apiHost}`);
        }
      } catch (_) {}
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date)) return dateStr;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const mulai = batch.kegiatan?.tanggal_mulai;
    const selesai = batch.kegiatan?.tanggal_selesai;

    const result = {
      id_batch: entry.id_batch || batch.id_batch || entry.id,
      id_kegiatan: kegiatan.id_kegiatan || batch.id_kegiatan,
      nomor_sertifikat: batch.nomor_sertifikat || '',
      tgl_ttd: batch.tanggal_ttd || '',
      template_file_url: templateUrl,

      tanggal: mulai
        ? (
            mulai === selesai
              ? formatDate(mulai)
              : `${formatDate(mulai)} s.d. ${formatDate(selesai)}`
          )
        : '',

      status: entry.status || batch.status || '',
      nama_kegiatan: batch.kegiatan?.nama_kegiatan || '',
      nama: peserta.nama_lengkap || '',
      instansi: peserta.nama_instansi || '',
      jabatan: peserta.jabatan || '',
      nip: peserta.nip || '',
      peran: peserta.peran || '',

      penanda_tangan: batch.penandatangan?.nama || '',
      jabatan_penandatangan: batch.penandatangan?.nama_jabatan || '',

      tpk: kegiatan.tpk || batch.tpk || batch.kegiatan?.lokasi || '',

      peserta_list: dataList.map(item => ({
        nama_lengkap: item.peserta?.nama_lengkap || '',
        nama_instansi: item.peserta?.nama_instansi || '',
        jabatan: item.peserta?.jabatan || '',
        nip: item.peserta?.nip || '',
        status: item.status || ''
      }))
    };

    logger.info(`Certificate data received: id_batch=${result.id_batch}, peserta=${dataList.length}`);
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
