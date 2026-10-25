import React, { useState } from 'react';
import {
  RyokoDatabase,
  MotorModel,
  MotorCategory,
  PhysicalUnit,
  RentalPackage,
  PoolLocation,
  AppUser,
} from '../types/ryoko';
import { formatRupiah } from '../services/bookingEngine';
import { getUserEffectivePermissions } from '../utils/userPermissions';
import {
  Bike,
  Plus,
  TrendingUp,
  Package,
  CheckCircle,
  MapPin,
  Clock,
  Sparkles,
  Layers,
  Wrench,
  Percent,
  Lock,
  Edit3,
  Trash2,
  Power,
  Calculator,
  X,
  AlertTriangle,
} from 'lucide-react';

interface FleetViewProps {
  db: RyokoDatabase;
  activeUser?: AppUser;
  onAddMotor?: (motor: Omit<MotorModel, 'id'>) => void;
  onUpdateMotor: (motor: MotorModel) => void;
  onDeleteMotor?: (motorId: number) => void;
  onAddPhysicalUnit: (unit: Omit<PhysicalUnit, 'id'>) => void;
  onApplyBulkPriceAdjustment: (percentChange: number) => void;
}

export const FleetView: React.FC<FleetViewProps> = ({
  db,
  activeUser,
  onAddMotor,
  onUpdateMotor,
  onDeleteMotor,
  onAddPhysicalUnit,
  onApplyBulkPriceAdjustment,
}) => {
  const permissions = getUserEffectivePermissions(activeUser);
  const canManageFleet = permissions.canManageFleet;
  const [activeSubTab, setActiveSubTab] = useState<'katalog' | 'garasi' | 'bulk' | 'paket'>('katalog');

  // Master Motor Model Modal State (TASK-009)
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [editingMotor, setEditingMotor] = useState<MotorModel | null>(null);

  const [formNamaModel, setFormNamaModel] = useState('');
  const [formKategori, setFormKategori] = useState<MotorCategory>('Matic');
  const [formSpesifikasi, setFormSpesifikasi] = useState('');
  const [formFasilitas, setFormFasilitas] = useState('2 Helm SNI + Jas Hujan + STNK Asli');
  const [formIsActive, setFormIsActive] = useState(true);

  // Tariffs
  const [formHarga1Hari, setFormHarga1Hari] = useState(90000);
  const [formHarga1Minggu, setFormHarga1Minggu] = useState(540000);
  const [formHarga1Bulan, setFormHarga1Bulan] = useState(1950000);
  const [formHarga12Jam, setFormHarga12Jam] = useState(70000);
  const [formHarga9Jam, setFormHarga9Jam] = useState(60000);
  const [formHarga6Jam, setFormHarga6Jam] = useState(50000);
  const [formHarga3Jam, setFormHarga3Jam] = useState(35000);
  const [formDendaPerJam, setFormDendaPerJam] = useState(20000);

  const handleOpenAddMotorModal = () => {
    setEditingMotor(null);
    setFormNamaModel('');
    setFormKategori('Matic');
    setFormSpesifikasi('125cc eSP, Transmisi Otomatis, Bagasi Luas');
    setFormFasilitas('2 Helm SNI + Jas Hujan + STNK Asli');
    setFormIsActive(true);
    setFormHarga1Hari(85000);
    setFormHarga1Minggu(510000);
    setFormHarga1Bulan(1850000);
    setFormHarga12Jam(65000);
    setFormHarga9Jam(55000);
    setFormHarga6Jam(45000);
    setFormHarga3Jam(35000);
    setFormDendaPerJam(20000);
    setIsModelModalOpen(true);
  };

  const handleOpenEditMotorModal = (m: MotorModel) => {
    setEditingMotor(m);
    setFormNamaModel(m.namaModel);
    setFormKategori(m.kategori);
    setFormSpesifikasi(m.spesifikasi);
    setFormFasilitas(m.fasilitas);
    setFormIsActive(m.isActive !== false);
    setFormHarga1Hari(m.harga1Hari);
    setFormHarga1Minggu(m.harga1Minggu);
    setFormHarga1Bulan(m.harga1Bulan);
    setFormHarga12Jam(m.harga12Jam);
    setFormHarga9Jam(m.harga9Jam);
    setFormHarga6Jam(m.harga6Jam);
    setFormHarga3Jam(m.harga3Jam);
    setFormDendaPerJam(m.dendaHarianPerJam || 20000);
    setIsModelModalOpen(true);
  };

  const handleAutoCalculateRates = (baseDaily: number) => {
    const roundTo1000 = (val: number) => Math.round(val / 1000) * 1000;
    setFormHarga1Minggu(roundTo1000(baseDaily * 6));
    setFormHarga1Bulan(roundTo1000(baseDaily * 22));
    setFormHarga12Jam(roundTo1000(baseDaily * 0.75));
    setFormHarga9Jam(roundTo1000(baseDaily * 0.65));
    setFormHarga6Jam(roundTo1000(baseDaily * 0.5));
    setFormHarga3Jam(roundTo1000(baseDaily * 0.38));
  };

  const handleSaveMotorModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaModel.trim()) {
      alert('Nama model motor wajib diisi.');
      return;
    }

    const payload = {
      namaModel: formNamaModel.trim(),
      kategori: formKategori,
      spesifikasi: formSpesifikasi.trim() || 'Standar Rental',
      fasilitas: formFasilitas.trim() || '2 Helm SNI + Jas Hujan + STNK Asli',
      harga1Hari: Number(formHarga1Hari) || 80000,
      harga1Minggu: Number(formHarga1Minggu) || 480000,
      harga1Bulan: Number(formHarga1Bulan) || 1800000,
      harga12Jam: Number(formHarga12Jam) || 60000,
      harga9Jam: Number(formHarga9Jam) || 50000,
      harga6Jam: Number(formHarga6Jam) || 40000,
      harga3Jam: Number(formHarga3Jam) || 30000,
      dendaHarianPerJam: Number(formDendaPerJam) || 20000,
      isActive: formIsActive,
    };

    if (editingMotor) {
      onUpdateMotor({
        ...editingMotor,
        ...payload,
      });
      alert(`Model motor ${payload.namaModel} berhasil diperbarui!`);
    } else {
      if (onAddMotor) {
        onAddMotor(payload);
      }
    }

    setIsModelModalOpen(false);
  };

  const handleToggleMotorActive = (m: MotorModel) => {
    const nextActive = m.isActive === false ? true : false;
    onUpdateMotor({
      ...m,
      isActive: nextActive,
    });
  };

  // New Physical Unit Form State
  const [showAddUnitForm, setShowAddUnitForm] = useState(false);
  const [newKodeUnit, setNewKodeUnit] = useState('');
  const [newMotorId, setNewMotorId] = useState<number>(db.motors[0]?.id || 1);
  const [newNomorPlat, setNewNomorPlat] = useState('');
  const [newTahun, setNewTahun] = useState<number>(2024);
  const [newWarna, setNewWarna] = useState('');
  const [newPoolLokasi, setNewPoolLokasi] = useState<PoolLocation>('malang');
  const [newCatatan, setNewCatatan] = useState('');

  // Bulk Price Adjustment State (-50% to +200%)
  const [bulkPercent, setBulkPercent] = useState<number>(10); // default +10%
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string>('');

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKodeUnit.trim() || !newNomorPlat.trim()) {
      alert('Kode unit dan nomor plat wajib diisi.');
      return;
    }

    onAddPhysicalUnit({
      kodeUnit: newKodeUnit.trim().toUpperCase(),
      motorId: newMotorId,
      nomorPlat: newNomorPlat.trim().toUpperCase(),
      tahun: Number(newTahun),
      warna: newWarna.trim() || 'Hitam',
      poolLokasi: newPoolLokasi,
      statusServis: 'aktif',
      catatan: newCatatan.trim(),
    });

    setNewKodeUnit('');
    setNewNomorPlat('');
    setNewWarna('');
    setNewCatatan('');
    setShowAddUnitForm(false);
  };

  const handleExecuteBulkPrice = () => {
    if (bulkPercent === 0) return;
    onApplyBulkPriceAdjustment(bulkPercent);
    setBulkSuccessMsg(
      `Berhasil memperbarui seluruh tarif motor sebesar ${bulkPercent > 0 ? '+' : ''}${bulkPercent}% (dibulatkan ke ribuan terdekat).`
    );
    setTimeout(() => setBulkSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Bike className="w-5 h-5 text-cyan-400" />
              <span>Manajemen Armada & Penyesuaian Tarif</span>
            </h2>
            {!canManageFleet && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Hanya Lihat (Operator)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Katalog model, unit fisik garasi (CPT ryokou_unit), multi-tier tarif (D-18), dan bulk pricing (D-22).
          </p>
        </div>

        {canManageFleet && activeSubTab === 'katalog' && (
          <button
            onClick={handleOpenAddMotorModal}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Model Motor Baru</span>
          </button>
        )}

        {canManageFleet && activeSubTab === 'garasi' && (
          <button
            onClick={() => setShowAddUnitForm(prev => !prev)}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Unit Fisik Baru</span>
          </button>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto text-xs scrollbar-none">
        <button
          onClick={() => setActiveSubTab('katalog')}
          className={`px-3.5 py-2 rounded-xl font-medium shrink-0 transition flex items-center gap-1.5 ${
            activeSubTab === 'katalog'
              ? 'bg-cyan-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          <span>Katalog & Tarif Bertingkat ({db.motors.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('garasi')}
          className={`px-3.5 py-2 rounded-xl font-medium shrink-0 transition flex items-center gap-1.5 ${
            activeSubTab === 'garasi'
              ? 'bg-cyan-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Unit Fisik Garasi ({db.units.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bulk')}
          className={`px-3.5 py-2 rounded-xl font-medium shrink-0 transition flex items-center gap-1.5 ${
            activeSubTab === 'bulk'
              ? 'bg-emerald-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Penyesuaian Tarif Massal (Bulk)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('paket')}
          className={`px-3.5 py-2 rounded-xl font-medium shrink-0 transition flex items-center gap-1.5 ${
            activeSubTab === 'paket'
              ? 'bg-cyan-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Paket Promo & Wisata ({db.packages.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. SUB-TAB: KATALOG MODEL MOTOR                                    */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === 'katalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {db.motors.map(m => {
            const unitCount = db.units.filter(u => u.motorId === m.id).length;
            const availableCount = db.tracking.filter(
              t => t.motorId === m.id && t.statusPosisi === 'parkir'
            ).length;

            return (
              <div
                key={m.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                          {m.kategori}
                        </span>
                        {m.isActive === false ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                            Nonaktif
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Aktif
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">{m.namaModel}</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {availableCount}/{unitCount} Siap
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    ⚙️ {m.spesifikasi}
                  </p>
                  <p className="text-xs text-cyan-300/90 mt-1">
                    ✨ {m.fasilitas}
                  </p>

                  {/* Tarif Grid (D-18) */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                    {/* Utama */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Tarif 1 Hari (24 Jam) [Utama]:</span>
                      <strong className="text-emerald-400 font-mono text-sm">
                        {formatRupiah(m.harga1Hari)}
                      </strong>
                    </div>

                    {/* Harian Lainnya */}
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                      <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/70">
                        <span className="text-slate-500 block">1 Minggu (7h):</span>
                        <strong className="text-white font-mono">{formatRupiah(m.harga1Minggu)}</strong>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/70">
                        <span className="text-slate-500 block">1 Bulan (30h):</span>
                        <strong className="text-white font-mono">{formatRupiah(m.harga1Bulan)}</strong>
                      </div>
                    </div>

                    {/* ShortRent Jam Tier */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block">ShortRent Jam:</span>
                      <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-mono">
                        <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/60">
                          <span className="text-slate-500 block text-[9px]">12 Jam</span>
                          <strong className="text-cyan-300">{formatRupiah(m.harga12Jam)}</strong>
                        </div>
                        <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/60">
                          <span className="text-slate-500 block text-[9px]">9 Jam</span>
                          <strong className="text-cyan-300">{formatRupiah(m.harga9Jam)}</strong>
                        </div>
                        <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/60">
                          <span className="text-slate-500 block text-[9px]">6 Jam</span>
                          <strong className="text-cyan-300">{formatRupiah(m.harga6Jam)}</strong>
                        </div>
                        <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/60">
                          <span className="text-slate-500 block text-[9px]">3 Jam</span>
                          <strong className="text-cyan-300">{formatRupiah(m.harga3Jam)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Denda */}
                    <div className="text-[11px] text-slate-400 flex justify-between items-center pt-1">
                      <span>Denda Overtime (D-27):</span>
                      <span className="text-amber-400 font-mono font-semibold">
                        {formatRupiah(m.dendaHarianPerJam)}/jam
                      </span>
                    </div>

                    {/* Operator Actions for Master Model (TASK-009) */}
                    {canManageFleet && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditMotorModal(m)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1 transition"
                          title="Ubah spesifikasi dan tarif bertingkat model ini"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Tarif</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleMotorActive(m)}
                          className={`px-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                            m.isActive === false
                              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300 hover:bg-emerald-900'
                              : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-amber-400'
                          }`}
                          title={m.isActive === false ? 'Aktifkan model ini di booking' : 'Nonaktifkan sementara dari booking'}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{m.isActive === false ? 'Aktifkan' : 'Pause'}</span>
                        </button>

                        {onDeleteMotor && (
                          <button
                            type="button"
                            onClick={() => onDeleteMotor(m.id)}
                            className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 transition"
                            title="Hapus master model ini dari katalog"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. SUB-TAB: GARASI FISIK (ryokou_unit)                              */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === 'garasi' && (
        <div className="space-y-4">
          {/* Add New Unit Form Collapsible */}
          {showAddUnitForm && (
            <form
              onSubmit={handleCreateUnit}
              className="bg-slate-900 border border-cyan-800/60 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 text-xs"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Registrasi Unit Fisik Baru ke Garasi (CPT ryokou_unit)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">
                    Kode Unit (Unik & Permanen D-12):
                  </label>
                  <input
                    type="text"
                    value={newKodeUnit}
                    onChange={e => setNewKodeUnit(e.target.value)}
                    placeholder="Contoh: SCP-04, NMAX-04"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Model Motor:</label>
                  <select
                    value={newMotorId}
                    onChange={e => setNewMotorId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {db.motors.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.namaModel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Nomor Plat (N-Series):</label>
                  <input
                    type="text"
                    value={newNomorPlat}
                    onChange={e => setNewNomorPlat(e.target.value)}
                    placeholder="Contoh: N 5432 ABC"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Tahun:</label>
                  <input
                    type="number"
                    value={newTahun}
                    onChange={e => setNewTahun(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Warna:</label>
                  <input
                    type="text"
                    value={newWarna}
                    onChange={e => setNewWarna(e.target.value)}
                    placeholder="Contoh: Hitam Doff / Putih"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Lokasi Pool Standar:</label>
                  <select
                    value={newPoolLokasi}
                    onChange={e => setNewPoolLokasi(e.target.value as PoolLocation)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="malang">Pool Malang (Dinoyo)</option>
                    <option value="batu">Pool Batu (Diponegoro)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUnitForm(false)}
                  className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                >
                  Simpan Unit Fisik
                </button>
              </div>
            </form>
          )}

          {/* Unit Table / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {db.units.map(unit => {
              const motor = db.motors.find(m => m.id === unit.motorId);
              const track = db.tracking.find(t => t.unitId === unit.id);

              return (
                <div
                  key={unit.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2.5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-cyan-400 font-mono">
                          {unit.kodeUnit}
                        </span>
                        <span className="text-xs text-white font-mono font-bold">
                          {unit.nomorPlat}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{motor?.namaModel}</p>
                      <span className="text-[11px] text-slate-500">
                        {unit.warna} ({unit.tahun})
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        track?.statusPosisi === 'servis'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : track?.statusPosisi === 'disewa'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {track?.statusPosisi ? track.statusPosisi.toUpperCase() : 'PARKIR'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{unit.poolLokasi === 'batu' ? 'Pool Batu' : 'Pool Malang'}</span>
                    </span>
                    <span className="font-mono text-slate-500">ID #{unit.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. SUB-TAB: PENYESUAIAN TARIF MASSAL (D-22 & D-23)                 */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === 'bulk' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 max-w-2xl">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span>Penyesuaian Harga Massal (Bulk Price Adjustment)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Aturan D-22 & D-23: Naikkan atau turunkan seluruh tarif motor serentak (-50% s/d +200%) dengan pembulatan otomatis ke ribuan terdekat. Sangat berguna untuk musim ramai (Lebaran, Natal, Tahun Baru) atau musim promo.
            </p>
          </div>

          {bulkSuccessMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{bulkSuccessMsg}</span>
            </div>
          )}

          {/* Percentage Slider & Quick Buttons */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Persentase Penyesuaian:</span>
              <span
                className={`text-lg font-black font-mono ${
                  bulkPercent > 0 ? 'text-emerald-400' : bulkPercent < 0 ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                {bulkPercent > 0 ? `+${bulkPercent}%` : `${bulkPercent}%`}
              </span>
            </div>

            <input
              type="range"
              min="-50"
              max="200"
              step="5"
              value={bulkPercent}
              onChange={e => setBulkPercent(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[-30, -20, -10, 0, 10, 20, 30, 50, 100].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBulkPercent(val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium font-mono transition ${
                    bulkPercent === val
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {val > 0 ? `+${val}%` : `${val}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Preview Impact Table */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">
              Simulasi Dampak Tarif 1 Hari (24 Jam) [Dibulatkan ke Rp 1.000 terdekat]:
            </span>
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 divide-y divide-slate-800/80 text-xs">
              {db.motors.map(m => {
                const multiplier = 1 + bulkPercent / 100;
                const newPrice = Math.round((m.harga1Hari * multiplier) / 1000) * 1000;
                const diff = newPrice - m.harga1Hari;

                return (
                  <div key={m.id} className="py-2 flex items-center justify-between first:pt-0 last:pb-0">
                    <span className="text-slate-300 font-medium">{m.namaModel}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 line-through font-mono">
                        {formatRupiah(m.harga1Hari)}
                      </span>
                      <span className="text-emerald-400 font-bold font-mono">
                        {formatRupiah(newPrice)}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          diff > 0 ? 'bg-emerald-950 text-emerald-300' : diff < 0 ? 'bg-red-950 text-red-300' : 'text-slate-500'
                        }`}
                      >
                        {diff > 0 ? `+${formatRupiah(diff)}` : diff < 0 ? `-${formatRupiah(Math.abs(diff))}` : '0'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {canManageFleet ? (
            <button
              onClick={handleExecuteBulkPrice}
              disabled={bulkPercent === 0}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 transition active:scale-98"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Terapkan Penyesuaian Tarif Massal ({bulkPercent > 0 ? `+${bulkPercent}%` : `${bulkPercent}%`})</span>
            </button>
          ) : (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Hanya Administrator yang memiliki wewenang mengubah tarif rental massal.</span>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. SUB-TAB: PAKET PROMO & WISATA (CPT ryokou_paket D-18)           */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === 'paket' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {db.packages.map(p => (
            <div
              key={p.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                    Paket Wisata
                  </span>
                  <strong className="text-emerald-400 font-bold text-sm font-mono">
                    {formatRupiah(p.hargaPaket)}
                  </strong>
                </div>

                <h3 className="text-base font-bold text-white mt-1.5">{p.namaPaket}</h3>
                <p className="text-xs text-slate-300 mt-1">
                  🛵 Motor: <strong>{p.kategoriMotor}</strong>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  ⏱️ Durasi: {p.durasiDeskripsi}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 bg-slate-950/70 p-2.5 rounded-xl text-xs text-cyan-300">
                <span className="font-bold text-[11px] block text-slate-400">Fasilitas Khusus:</span>
                <p className="mt-0.5">{p.fasilitasEkstra}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. MODAL CRUD MASTER MODEL MOTOR (TASK-009) */}
      {isModelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Bike className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  {editingMotor ? `Edit Model: ${editingMotor.namaModel}` : 'Tambah Master Model Motor Baru (TASK-009)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModelModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveMotorModel} className="p-5 space-y-4 text-xs">
              {/* Row 1: Nama Model & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">
                    Nama Model Motor: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formNamaModel}
                    onChange={e => setFormNamaModel(e.target.value)}
                    placeholder="Contoh: Honda Stylo 160 ABS, Yamaha Fazzio"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kategori:</label>
                  <select
                    value={formKategori}
                    onChange={e => setFormKategori(e.target.value as MotorCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                  >
                    <option value="Matic">Matic</option>
                    <option value="Sport">Sport</option>
                    <option value="Trail">Trail</option>
                    <option value="Retro">Retro</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Spesifikasi & Fasilitas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Spesifikasi Mesin / CC / Fitur:</label>
                  <input
                    type="text"
                    value={formSpesifikasi}
                    onChange={e => setFormSpesifikasi(e.target.value)}
                    placeholder="Contoh: 160cc eSP+, ABS, Tangki 5L, USB Charger"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Fasilitas Standar:</label>
                  <input
                    type="text"
                    value={formFasilitas}
                    onChange={e => setFormFasilitas(e.target.value)}
                    placeholder="2 Helm SNI + Jas Hujan + STNK Asli"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Tarif Section Header & Quick Auto-Calc */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Struktur Tarif Bertingkat (Multi-Tier D-18 & BR-01)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Tentukan tarif sewa harian utama, paket bulanan, dan jam ShortRent.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAutoCalculateRates(formHarga1Hari)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition self-start sm:self-auto shrink-0 shadow-sm"
                    title="Kalkulasi otomatis tarif 1 minggu, 1 bulan, dan jam dari tarif 1 hari"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Auto-Hitung Multi-Tier</span>
                  </button>
                </div>

                {/* Harian & Bulanan Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <label className="block font-semibold text-emerald-400 mb-1">Tarif 1 Hari (24 Jam) [Utama]:</label>
                    <input
                      type="number"
                      value={formHarga1Hari}
                      onChange={e => setFormHarga1Hari(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Tarif 1 Minggu (7 Hari):</label>
                    <input
                      type="number"
                      value={formHarga1Minggu}
                      onChange={e => setFormHarga1Minggu(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Tarif 1 Bulan (30 Hari):</label>
                    <input
                      type="number"
                      value={formHarga1Bulan}
                      onChange={e => setFormHarga1Bulan(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                {/* ShortRent Jam Tier */}
                <div className="mt-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[11px] font-semibold text-cyan-300 block">Tarif ShortRent Jam (D-27):</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">12 Jam:</label>
                      <input
                        type="number"
                        value={formHarga12Jam}
                        onChange={e => setFormHarga12Jam(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">9 Jam:</label>
                      <input
                        type="number"
                        value={formHarga9Jam}
                        onChange={e => setFormHarga9Jam(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">6 Jam:</label>
                      <input
                        type="number"
                        value={formHarga6Jam}
                        onChange={e => setFormHarga6Jam(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">3 Jam:</label>
                      <input
                        type="number"
                        value={formHarga3Jam}
                        onChange={e => setFormHarga3Jam(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Denda Overtime Per Jam & Status Aktif */}
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block font-semibold text-amber-300 mb-1">
                      Denda Overtime per Jam (D-27):
                    </label>
                    <input
                      type="number"
                      value={formDendaPerJam}
                      onChange={e => setFormDendaPerJam(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsActive}
                        onChange={e => setFormIsActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                      <span className="ml-2 text-xs font-semibold text-slate-200">
                        {formIsActive ? 'Model Aktif (Tampil di Form Booking)' : 'Nonaktifkan Sementara'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModelModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md shadow-cyan-950 transition active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{editingMotor ? 'Simpan Perubahan' : 'Tambah ke Katalog'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
