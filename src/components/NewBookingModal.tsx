import React, { useState, useMemo } from 'react';
import {
  RyokoDatabase,
  BookingRecord,
  SupportIdType,
  CustomerTag,
  TariffCategory,
  DurationOption,
  PoolLocation,
} from '../types/ryoko';
import {
  generateBookingNumber,
  formatRupiah,
  isOutsideOperationalHours,
  parseWibToEpoch,
  epochToWibInput,
  getAvailableUnitsForModel,
  calculateDynamicRentalTariff,
} from '../services/bookingEngine';
import {
  generateBookingConfirmationWhatsAppUrl,
  generateCourierTaskWhatsAppUrl,
  generateStandardBookingTemplateText,
} from '../services/whatsappService';
import { parseWhatsAppBookingChat, STANDARD_BOOKING_TEMPLATE_TEXT } from '../utils/whatsappChatParser';
import { copyText } from '../utils/clipboard';
import {
  X,
  PlusCircle,
  AlertTriangle,
  Clock,
  MapPin,
  MessageCircle,
  Truck,
  Calendar,
  Sparkles,
  Clipboard,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface NewBookingModalProps {
  db: RyokoDatabase;
  onClose: () => void;
  onSubmitBooking: (booking: BookingRecord, lockUnitId?: number) => void;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  db,
  onClose,
  onSubmitBooking,
}) => {
  const [motorId, setMotorId] = useState<number>(() => (db.motors.length > 0 ? db.motors[0].id : 1));
  const selectedMotor = useMemo(() => db.motors.find(m => m.id === motorId) || db.motors[0], [db.motors, motorId]);

  const [kategoriTarif, setKategoriTarif] = useState<TariffCategory>('harian');
  const [pilihanDurasi, setPilihanDurasi] = useState<DurationOption>('1_hari');
  const [selectedPackageId, setSelectedPackageId] = useState<number>(() => (db.packages.length > 0 ? db.packages[0].id : 0));
  const selectedPackage = useMemo(() => db.packages.find(p => p.id === selectedPackageId), [db.packages, selectedPackageId]);

  // Dates default: today at 09:00 WIB until tomorrow 09:00 WIB (eksplisit Asia/Jakarta)
  const defaultDates = useMemo(() => {
    const now = new Date();
    const ymd = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const startStr = `${ymd}T09:00`;
    const startEpoch = parseWibToEpoch(startStr);
    const endEpoch = startEpoch + 24 * 3600;
    const endStr = epochToWibInput(endEpoch);
    return { startStr, endStr };
  }, []);

  const [jamTanggalMulai, setJamTanggalMulai] = useState<string>(defaultDates.startStr);
  const [jamTanggalSelesai, setJamTanggalSelesai] = useState<string>(defaultDates.endStr);

  // 13-Field Standard Booking State
  const [nama, setNama] = useState<string>('');
  const [alamatKtp, setAlamatKtp] = useState<string>('');
  const [jenisIdPendukung, setJenisIdPendukung] = useState<SupportIdType>('SIM_C');
  const [alamatSaatIni, setAlamatSaatIni] = useState<string>('');
  const [idSosmed, setIdSosmed] = useState<string>('');
  const [nomorWa, setNomorWa] = useState<string>('');
  const [noTelpDarurat, setNoTelpDarurat] = useState<string>('');
  const [jumlahHelm, setJumlahHelm] = useState<number>(2);

  // Operational State
  const [tandaPelanggan, setTandaPelanggan] = useState<CustomerTag>('baru');
  const [pool, setPool] = useState<PoolLocation>('malang');
  const [alamatPengantaran, setAlamatPengantaran] = useState<string>('');
  const [alamatPenjemputan, setAlamatPenjemputan] = useState<string>('');
  const [kurirPengantar, setKurirPengantar] = useState<string>('');
  const [catatanKhusus, setCatatanKhusus] = useState<string>('');
  const [lockUnitImmediately, setLockUnitImmediately] = useState<boolean>(true);
  const [selectedUnitId, setSelectedUnitId] = useState<number>(0);
  const [autoOpenWa, setAutoOpenWa] = useState<boolean>(true);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);

  // WhatsApp Chat Auto-fill Parser state
  const [showChatParser, setShowChatParser] = useState<boolean>(false);
  const [chatRawInput, setChatRawInput] = useState<string>('');
  const [parseSuccessMsg, setParseSuccessMsg] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

  const handleApplyChatText = (textOverride?: string) => {
    const raw = textOverride || chatRawInput;
    if (!raw.trim()) return;

    const parsed = parseWhatsAppBookingChat(raw);

    if (parsed.nama) setNama(parsed.nama);
    if (parsed.alamatKtp) setAlamatKtp(parsed.alamatKtp);
    if (parsed.idPendukung) setJenisIdPendukung(parsed.idPendukung);
    if (parsed.alamatSaatIni) setAlamatSaatIni(parsed.alamatSaatIni);
    if (parsed.idSosmed) setIdSosmed(parsed.idSosmed);
    if (parsed.nomorWa) setNomorWa(parsed.nomorWa);
    if (parsed.teleponDarurat) setNoTelpDarurat(parsed.teleponDarurat);
    if (parsed.jamTanggalMulai) setJamTanggalMulai(parsed.jamTanggalMulai);
    if (parsed.jamTanggalSelesai) setJamTanggalSelesai(parsed.jamTanggalSelesai);
    if (parsed.lokasiDelivery) setAlamatPengantaran(parsed.lokasiDelivery);
    if (parsed.lokasiPengembalian) setAlamatPenjemputan(parsed.lokasiPengembalian);
    if (parsed.jumlahHelm) setJumlahHelm(parsed.jumlahHelm);
    if (parsed.catatanRapi) setCatatanKhusus(parsed.catatanRapi);

    // match motor model
    if (parsed.jenisMotorKeyword) {
      const match = db.motors.find(m => 
        m.namaModel.toLowerCase().includes(parsed.jenisMotorKeyword.toLowerCase()) ||
        parsed.jenisMotorKeyword.toLowerCase().includes(m.namaModel.toLowerCase().slice(0, 5))
      );
      if (match) {
        setMotorId(match.id);
        setSelectedUnitId(0);
      }
    }

    setParseWarnings(parsed.warnings || []);
    setParseSuccessMsg(
      `Data chat berhasil diekstrak: ${parsed.nama || 'Penyewa'}${
        parsed.jenisMotorKeyword ? ` (${parsed.jenisMotorKeyword})` : ''
      }`
    );
    setTimeout(() => setParseSuccessMsg(null), 5000);
  };

  // Check Out-of-hours warning (D-06)
  const isOutOfHours = useMemo(() => {
    return isOutsideOperationalHours(jamTanggalMulai) || isOutsideOperationalHours(jamTanggalSelesai);
  }, [jamTanggalMulai, jamTanggalSelesai]);

  const startEpoch = parseWibToEpoch(jamTanggalMulai);
  const endEpoch = parseWibToEpoch(jamTanggalSelesai);

  // Compute duration label & price (BR-01 Revisi & F-03: Kalkulasi rentang multi-hari dinamis)
  const { totalHarga, labelDurasi } = useMemo(() => {
    if (!selectedMotor) return { totalHarga: 85000, labelDurasi: '1 Hari (24 Jam)' };
    return calculateDynamicRentalTariff(
      selectedMotor,
      kategoriTarif,
      pilihanDurasi,
      startEpoch,
      endEpoch,
      selectedPackage
    );
  }, [selectedMotor, kategoriTarif, pilihanDurasi, startEpoch, endEpoch, selectedPackage]);

  const availableUnits = useMemo(() => {
    if (!selectedMotor || endEpoch <= startEpoch) return [];
    return getAvailableUnitsForModel(selectedMotor.id, startEpoch, endEpoch, db);
  }, [selectedMotor, startEpoch, endEpoch, db]);

  // Sinkronisasi otomatis selectedUnitId dengan daftar unit bebas (F-04)
  React.useEffect(() => {
    if (availableUnits.length > 0) {
      const exists = availableUnits.some(u => u.unit.id === selectedUnitId);
      if (!exists) {
        setSelectedUnitId(availableUnits[0].unit.id);
      }
    } else {
      setSelectedUnitId(0);
    }
  }, [availableUnits, selectedUnitId]);

  // Adjust end date automatically when duration changes (WIB safe)
  const handleDurationChange = (dur: DurationOption) => {
    setPilihanDurasi(dur);
    const startEp = parseWibToEpoch(jamTanggalMulai);
    if (!startEp) return;

    let hoursToAdd = 24;
    if (dur === '3_jam') hoursToAdd = 3;
    else if (dur === '6_jam') hoursToAdd = 6;
    else if (dur === '9_jam') hoursToAdd = 9;
    else if (dur === '12_jam') hoursToAdd = 12;
    else if (dur === '1_hari') hoursToAdd = 24;
    else if (dur === '1_minggu') hoursToAdd = 24 * 7;
    else if (dur === '1_bulan') hoursToAdd = 24 * 30; // 30 hari

    const endEp = startEp + hoursToAdd * 3600;
    setJamTanggalSelesai(epochToWibInput(endEp));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      alert('Mohon isi nama penyewa.');
      return;
    }
    if (!nomorWa.trim()) {
      alert('Mohon isi nomor WhatsApp penyewa.');
      return;
    }
    if (!startEpoch || !endEpoch || endEpoch <= startEpoch) {
      alert('Jadwal selesai sewa harus lebih besar dari jadwal mulai.');
      return;
    }

    const newBookingNumber = generateBookingNumber(db);
    const nowStr =
      new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB';

    const chosenUnit = lockUnitImmediately && selectedUnitId
      ? db.units.find(u => u.id === selectedUnitId)
      : null;

    const newBooking: BookingRecord = {
      id: Date.now(),
      noBooking: newBookingNumber,
      status: chosenUnit ? 'ryokou_approved' : 'ryokou_booking',
      nama: nama.trim(),
      nomorWa: nomorWa.trim(),
      alamatKtp: alamatKtp.trim(),
      jenisIdPendukung,
      alamatSaatIni: alamatSaatIni.trim(),
      idSosmed: idSosmed.trim(),
      noTelpDarurat: noTelpDarurat.trim(),
      jumlahHelm,
      tandaPelanggan,
      motorId: selectedMotor.id,
      snapshotNamaMotor: selectedMotor.namaModel,
      unitId: chosenUnit ? chosenUnit.id : null,
      snapshotKodeUnit: chosenUnit ? chosenUnit.kodeUnit : null,
      kategoriTarif,
      pilihanDurasi,
      labelDurasi,
      jamTanggalMulai,
      jamTanggalSelesai,
      startEpoch,
      endEpoch,
      pool,
      alamatPengantaran: alamatPengantaran.trim() || alamatSaatIni.trim() || (pool === 'batu' ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)'),
      alamatPenjemputan: alamatPenjemputan.trim() || alamatSaatIni.trim() || (pool === 'batu' ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)'),
      kurirPengantar: kurirPengantar.trim(),
      totalHargaEstimasi: totalHarga,
      luarJamOperasional: isOutOfHours,
      catatanKhusus: catatanKhusus.trim(),
      createdAt: nowStr,
      approvedAt: chosenUnit ? nowStr : undefined,
      dendaNominal: 0,
      dendaKeterangan: 'Belum ada denda',
    };

    onSubmitBooking(newBooking, chosenUnit ? chosenUnit.id : undefined);

    if (autoOpenWa) {
      const waUrl = generateBookingConfirmationWhatsAppUrl(newBooking, db.settings.adminWhatsapp);
      window.open(waUrl, '_blank');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Input Pemesanan Motor Baru</h2>
              <p className="text-[11px] text-slate-400">Format order revisi ZLCE (Termasuk opsi sewa 1 Bulan & Kurir)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="new-booking-form" onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-200">
          {/* Smart WhatsApp Chat Parser Box */}
          <div className="bg-gradient-to-r from-emerald-950/60 to-cyan-950/40 border border-emerald-700/50 rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    Ekstrak Otomatis Chat WhatsApp
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      Cerdas
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-300">
                    Tempel pesan chat / form booking pelanggan, sistem akan otomatis mengisi form
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChatParser(!showChatParser)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 transition-colors"
              >
                {showChatParser ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" /> Tutup
                  </>
                ) : (
                  <>
                    <Clipboard className="w-3.5 h-3.5" /> Buka Tempel WA
                  </>
                )}
              </button>
            </div>

            {/* Expandable Area */}
            {showChatParser && (
              <div className="mt-3 pt-3 border-t border-emerald-800/40 space-y-2">
                <textarea
                  value={chatRawInput}
                  onChange={e => setChatRawInput(e.target.value)}
                  placeholder={`Tempel teks chat booking pelanggan di sini...\nContoh:\n↗️ Hari/Tgl/Bln (mulai sewa) : 24 Oktober\n↗️ Jam Ambil : 15.40\n↗️ Lokasi Delivery: begawan\n↙️ Hari/Tgl/Bln (pengembalian) :25 oktober\n↙️ Jam pengembalian 3\n⏹️ Type unit (jenis motor) : scoopy\n➡️ Nama : Ridho berkati\n➡️ Nomor telepon : 085845595139`}
                  rows={5}
                  className="w-full bg-slate-950/90 border border-slate-700 rounded-xl p-2.5 text-slate-100 text-[11px] font-mono outline-none focus:border-emerald-500"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const sample = `*FORM PEMESANAN SEWA MOTOR RYOKO RENT*
1. Nama : Budi Santoso
2. Alamat sesuai KTP : Jl. Ijen No. 45, Malang
3. Id pendukung : SIM C
4. Alamat saat ini : Hotel Grand Mercure Malang
5. Id sosmed : @budi_santoso
6. No telp : 081234567890
7. No telp darurat : 081987654321
8. Jadwal mulai : 28 Oktober 15:40
9. Jadwal selesai : 29 Oktober 15:00
10. Lokasi pengantaran : Stasiun Kotabaru Malang
11. Lokasi penjemputan : Hotel Grand Mercure Malang
12. Model unit : Honda Vario 125
13. Jumlah helm : 2 Helm`;
                        setChatRawInput(sample);
                        handleApplyChatText(sample);
                      }}
                      className="text-[10px] text-cyan-300 hover:text-cyan-200 underline font-medium"
                    >
                      💡 Muat Contoh Chat (Budi - Stasiun)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        copyText(STANDARD_BOOKING_TEMPLATE_TEXT);
                        setCopiedTemplate(true);
                        setTimeout(() => setCopiedTemplate(false), 3000);
                      }}
                      className="text-[10px] text-emerald-300 hover:text-emerald-200 underline font-medium flex items-center gap-1"
                    >
                      <Clipboard className="w-3 h-3" />
                      {copiedTemplate ? '✅ Template Tersalin!' : '📋 Salin Format 13 Poin Kosong'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyChatText()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Terapkan ke Form Sekarang
                  </button>
                </div>
              </div>
            )}

            {parseSuccessMsg && (
              <div className="mt-2 text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-600/60 rounded-lg p-2 flex items-center gap-1.5 animate-fadeIn">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{parseSuccessMsg}</span>
              </div>
            )}

            {parseWarnings.length > 0 && (
              <div className="mt-2 text-xs text-amber-200 bg-amber-950/60 border border-amber-600/60 rounded-lg p-2.5 space-y-1 animate-fadeIn">
                <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Perhatian Hasil Baca Chat ({parseWarnings.length} Catatan):</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] text-amber-100/90 pl-1">
                  {parseWarnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Out-of-hours Warning (D-06) */}
          {isOutOfHours && (
            <div className="bg-blue-950/40 border border-blue-700/60 rounded-xl p-3 text-blue-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Catatan Jam Operasional (D-06):</strong>
                <span>Jadwal sewa berada di luar jam kerja reguler (07.00 - 23.00 WIB). Layanan antar/jemput luar jam kerja akan diinformasikan ke WhatsApp.</span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* BAGIAN I: DATA IDENTITAS & KONTAK PENYEWA (POIN 1 - 7)        */}
          {/* ============================================================== */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h3 className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center justify-center text-[11px] font-mono">I</span>
                Identitas & Kontak Penyewa (Poin 1 - 7)
              </h3>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setTandaPelanggan('baru')}
                  className={`py-0.5 px-2 rounded-md text-[10px] transition ${
                    tandaPelanggan === 'baru' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Tamu Baru
                </button>
                <button
                  type="button"
                  onClick={() => setTandaPelanggan('langganan')}
                  className={`py-0.5 px-2 rounded-md text-[10px] transition ${
                    tandaPelanggan === 'langganan' ? 'bg-cyan-800 text-cyan-200 font-bold' : 'text-slate-400'
                  }`}
                >
                  Langganan ⭐
                </button>
              </div>
            </div>

            {/* Poin 1 & 2: Nama & Alamat sesuai KTP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-200">
                  1. Nama Lengkap: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  placeholder="Misal: Ridho berkati"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-200">
                  2. Alamat sesuai KTP:
                </label>
                <input
                  type="text"
                  value={alamatKtp}
                  onChange={e => setAlamatKtp(e.target.value)}
                  placeholder="Misal: JL. Pek raya harmoni II"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Poin 3 & 4: ID Pendukung & Alamat Saat Ini */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-200">
                  3. ID Pendukung:
                </label>
                <select
                  value={jenisIdPendukung}
                  onChange={e => setJenisIdPendukung(e.target.value as SupportIdType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                >
                  <option value="SIM_C">SIM C (Asli / Pengemudi)</option>
                  <option value="KTM">KTM (Kartu Mahasiswa Malang)</option>
                  <option value="NPWP">NPWP</option>
                  <option value="Paspor">Paspor / WNA</option>
                  <option value="BPJS">BPJS Kesehatan / Ketenagakerjaan</option>
                  <option value="Kartu_Pegawai">Kartu Pegawai / ID Card Kerja</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-200">
                  4. Alamat saat ini (Rumah/Kos/Hotel):
                </label>
                <input
                  type="text"
                  value={alamatSaatIni}
                  onChange={e => setAlamatSaatIni(e.target.value)}
                  placeholder="Misal: Apartemen Begawan / Kos Dinoyo / Hotel Santika"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Poin 5, 6 & 7: ID Sosmed, No Telp & No Telp Darurat */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-200">
                  5. ID Sosmed (IG/TikTok/FB):
                </label>
                <input
                  type="text"
                  value={idSosmed}
                  onChange={e => setIdSosmed(e.target.value)}
                  placeholder="Misal: @ridhoxw"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-200">
                  6. No. Telp (WhatsApp Utama): <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  value={nomorWa}
                  onChange={e => setNomorWa(e.target.value)}
                  placeholder="Misal: 085845595139"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono text-[11px]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-200">
                  7. No. Telp Darurat:
                </label>
                <input
                  type="tel"
                  value={noTelpDarurat}
                  onChange={e => setNoTelpDarurat(e.target.value)}
                  placeholder="Misal: 081316784701"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* BAGIAN II: JADWAL & LOKASI RENTAL (POIN 8 - 11)               */}
          {/* ============================================================== */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h3 className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 flex items-center justify-center text-[11px] font-mono">II</span>
                Jadwal & Lokasi Rental (Poin 8 - 11)
              </h3>
              <span className="text-[11px] text-slate-400">Jeda Turnaround Buffer: 60 Menit</span>
            </div>

            {/* Poin 8 & 9: Jadwal Mulai & Jadwal Selesai */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-200 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>8. Jadwal Mulai (Ambil / Delivery):</span>
                </label>
                <input
                  type="datetime-local"
                  value={jamTanggalMulai}
                  onChange={e => setJamTanggalMulai(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-cyan-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-200 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>9. Jadwal Selesai (Pengembalian):</span>
                </label>
                <input
                  type="datetime-local"
                  value={jamTanggalSelesai}
                  onChange={e => setJamTanggalSelesai(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-cyan-500 outline-none"
                  required
                />
              </div>
            </div>

            {/* Poin 10 & 11: Lokasi Pengantaran & Lokasi Penjemputan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-200 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>10. Lokasi Pengantaran (Delivery Unit):</span>
                </label>
                <input
                  type="text"
                  value={alamatPengantaran}
                  onChange={e => setAlamatPengantaran(e.target.value)}
                  placeholder="Misal: Apartemen Begawan Malang / Stasiun Kota Baru"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-200 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>11. Lokasi Penjemputan (Unit Kembali):</span>
                </label>
                <input
                  type="text"
                  value={alamatPenjemputan}
                  onChange={e => setAlamatPenjemputan(e.target.value)}
                  placeholder="Misal: Apartemen Begawan Malang / Pool Dinoyo"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Area Pool & Kurir Pengantar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold mb-1 text-slate-300">Area / Pool Terdekat:</label>
                <select
                  value={pool}
                  onChange={e => setPool(e.target.value as PoolLocation)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="malang">Pool Malang (Dinoyo - Lowokwaru)</option>
                  <option value="batu">Pool Batu (Diponegoro - Dekat Alun-Alun)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Petugas Kurir Pengantar (Opsional):</span>
                </label>
                <input
                  type="text"
                  value={kurirPengantar}
                  onChange={e => setKurirPengantar(e.target.value)}
                  placeholder="Misal: Rizal Fauzi (Kurir Antar)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                />
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* BAGIAN III: UNIT MOTOR & FASILITAS (POIN 12 - 13)              */}
          {/* ============================================================== */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h3 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-center text-[11px] font-mono">III</span>
                Unit Motor & Fasilitas (Poin 12 - 13)
              </h3>
              <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg">
                Estimasi: {formatRupiah(totalHarga)}
              </span>
            </div>

            {/* Poin 12: Model Unit & Kategori Tarif */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-200">
                  12. Model Unit (Motor):
                </label>
                <select
                  value={motorId}
                  onChange={e => {
                    const mId = Number(e.target.value);
                    setMotorId(mId);
                    setSelectedUnitId(0);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:border-cyan-500 outline-none"
                >
                  {db.motors.filter(m => m.isActive !== false).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.namaModel} ({m.kategori}) — {formatRupiah(m.harga1Hari)}/hari
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">✨ {selectedMotor.fasilitas}</p>
              </div>

              {/* Kategori Durasi Sewa */}
              <div>
                <label className="block font-semibold mb-1 text-slate-300">Pilihan Paket Durasi:</label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setKategoriTarif('harian');
                      handleDurationChange('1_hari');
                    }}
                    className={`py-1 px-1 rounded-lg text-[11px] font-medium transition ${
                      kategoriTarif === 'harian' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Harian / Bln
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKategoriTarif('jam');
                      handleDurationChange('12_jam');
                    }}
                    className={`py-1 px-1 rounded-lg text-[11px] font-medium transition ${
                      kategoriTarif === 'jam' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ShortRent
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKategoriTarif('paket');
                      handleDurationChange('paket_promo');
                    }}
                    className={`py-1 px-1 rounded-lg text-[11px] font-medium transition ${
                      kategoriTarif === 'paket' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Paket Wisata
                  </button>
                </div>

                {kategoriTarif === 'harian' && (
                  <select
                    value={pilihanDurasi}
                    onChange={e => handleDurationChange(e.target.value as DurationOption)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-medium"
                  >
                    <option value="1_hari">1 Hari (24 Jam) — {formatRupiah(selectedMotor.harga1Hari)}</option>
                    <option value="1_minggu">1 Minggu (7 Hari) — {formatRupiah(selectedMotor.harga1Minggu)}</option>
                    <option value="1_bulan">1 Bulan (30 Hari Penuh) — {formatRupiah(selectedMotor.harga1Bulan || 1750000)}</option>
                  </select>
                )}

                {kategoriTarif === 'jam' && (
                  <select
                    value={pilihanDurasi}
                    onChange={e => handleDurationChange(e.target.value as DurationOption)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                  >
                    <option value="12_jam">12 Jam — {formatRupiah(selectedMotor.harga12Jam)}</option>
                    <option value="9_jam">9 Jam — {formatRupiah(selectedMotor.harga9Jam)}</option>
                    <option value="6_jam">6 Jam — {formatRupiah(selectedMotor.harga6Jam)}</option>
                    <option value="3_jam">3 Jam — {formatRupiah(selectedMotor.harga3Jam)}</option>
                  </select>
                )}

                {kategoriTarif === 'paket' && (
                  <select
                    value={selectedPackageId}
                    onChange={e => {
                      setSelectedPackageId(Number(e.target.value));
                      handleDurationChange('paket_promo');
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                  >
                    {db.packages.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.namaPaket} — {formatRupiah(p.hargaPaket)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Poin 13: Jumlah Helm */}
            <div>
              <label className="block font-semibold mb-1 text-slate-200">
                13. Jumlah Helm SNI:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setJumlahHelm(1)}
                  className={`py-2 px-3 rounded-xl border text-center font-medium transition flex items-center justify-center gap-2 ${
                    jumlahHelm === 1
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  <span>🪖 1 Helm SNI</span>
                  {jumlahHelm === 1 && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setJumlahHelm(2)}
                  className={`py-2 px-3 rounded-xl border text-center font-medium transition flex items-center justify-center gap-2 ${
                    jumlahHelm === 2
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  <span>🪖🪖 2 Helm SNI (Standar)</span>
                  {jumlahHelm === 2 && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Unit Locking Option (Buffer 60 Menit) */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-white">
                <input
                  type="checkbox"
                  checked={lockUnitImmediately}
                  onChange={e => setLockUnitImmediately(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500"
                />
                <span>Langsung Kunci Unit Fisik Sekarang (Status: Approved)</span>
              </label>
              <span className="text-[11px] text-cyan-400 font-mono">
                {availableUnits.length} Unit Bebas Jadwal
              </span>
            </div>

            {lockUnitImmediately && (
              <div>
                {availableUnits.length === 0 ? (
                  <p className="text-amber-400 text-xs">
                    Stok unit kosong di rentang waktu ini (buffer 60 menit). Booking akan disimpan sebagai status &quot;Booking Baru&quot;.
                  </p>
                ) : (
                  <select
                    value={selectedUnitId || availableUnits[0].unit.id}
                    onChange={e => setSelectedUnitId(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300 font-bold"
                  >
                    {availableUnits.map(({ unit, label }) => (
                      <option key={unit.id} value={unit.id}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Price Summary & WhatsApp check */}
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs">Total Estimasi Sewa:</span>
              <p className="text-lg font-bold text-emerald-400 font-mono">{formatRupiah(totalHarga)}</p>
              <span className="text-[11px] text-slate-500">{labelDurasi}</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={autoOpenWa}
                onChange={e => setAutoOpenWa(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-500"
              />
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                Buka WhatsApp setelah simpan
              </span>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">
            Batal
          </button>
          <button
            type="submit"
            form="new-booking-form"
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Simpan Transaksi Booking</span>
          </button>
        </div>
      </div>
    </div>
  );
};
