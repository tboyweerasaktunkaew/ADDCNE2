import React, { useState } from 'react';
import { VSPPMaster, PEAMaster, PersonnelMaster, SubstationMaster, FeederNoMaster, UserRole } from '../types/grid';
import * as XLSX from 'xlsx';
import {
  Database,
  Building2,
  Radio,
  Users,
  Zap,
  Plus,
  Save,
  Trash2,
  Edit,
  X,
  Search,
  CheckCircle2,
  ShieldAlert,
  Download,
  Upload,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

interface MasterDataViewProps {
  vsppList: VSPPMaster[];
  peaList: PEAMaster[];
  personnelList: PersonnelMaster[];
  substationList?: SubstationMaster[];
  feederNoList?: FeederNoMaster[];
  userRole: UserRole;
  gasConnected?: boolean;
  isSyncing?: boolean;
  onSync?: () => Promise<void>;
  onSaveVSPP: (record: VSPPMaster) => Promise<void>;
  onDeleteVSPP: (vsppId: string) => Promise<void>;
  onSavePEA: (record: PEAMaster) => Promise<void>;
  onDeletePEA: (peaId: string) => Promise<void>;
  onSavePersonnel: (record: PersonnelMaster) => Promise<void>;
  onDeletePersonnel: (id: string) => Promise<void>;
  onSaveSubstation?: (record: SubstationMaster) => Promise<void>;
  onDeleteSubstation?: (substationCode: string) => Promise<void>;
  onSaveFeederNo?: (record: FeederNoMaster) => Promise<void>;
  onDeleteFeederNo?: (feederNo: string) => Promise<void>;
  onBatchSaveVSPP?: (records: VSPPMaster[]) => Promise<void>;
  onBatchSavePEA?: (records: PEAMaster[]) => Promise<void>;
  onBatchSavePersonnel?: (records: PersonnelMaster[]) => Promise<void>;
  onBatchSaveSubstation?: (records: SubstationMaster[]) => Promise<void>;
  onBatchSaveFeederNo?: (records: FeederNoMaster[]) => Promise<void>;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  vsppList,
  peaList,
  personnelList,
  substationList = [],
  feederNoList = [],
  userRole,
  gasConnected = false,
  isSyncing = false,
  onSync,
  onSaveVSPP,
  onDeleteVSPP,
  onSavePEA,
  onDeletePEA,
  onSavePersonnel,
  onDeletePersonnel,
  onSaveSubstation,
  onDeleteSubstation,
  onSaveFeederNo,
  onDeleteFeederNo,
  onBatchSaveVSPP,
  onBatchSavePEA,
  onBatchSavePersonnel,
  onBatchSaveSubstation,
  onBatchSaveFeederNo,
}) => {
  const [activeTab, setActiveTab] = useState<'VSPP' | 'PEA' | 'PERSONNEL' | 'SUBSTATION' | 'FEEDER_NO'>('VSPP');
  const [searchTerm, setSearchTerm] = useState('');

  // Substation Form State
  const [editingSubstationCode, setEditingSubstationCode] = useState<string | null>(null);
  const [substationForm, setSubstationForm] = useState<SubstationMaster>({
    Substation_Code: '',
    Substation_Name: '',
  });

  // Feeder No Form State
  const [editingFeederNo, setEditingFeederNo] = useState<string | null>(null);
  const [feederNoForm, setFeederNoForm] = useState<FeederNoMaster>({
    Feeder_No: '',
  });

  // Personnel Form State
  const [editingPersonnelId, setEditingPersonnelId] = useState<string | null>(null);
  const [personnelForm, setPersonnelForm] = useState<PersonnelMaster>({
    id: '',
    name: '',
    role: 'creator',
    position: '',
  });

  // VSPP Form State (Inline, No Popup)
  const [editingVsppId, setEditingVsppId] = useState<string | null>(null);
  const [vsppForm, setVsppForm] = useState<VSPPMaster>({
    VSPP_ID: '',
    VSPP_Name: '',
    Feeder_Source: '',
    Switch_Equipment: '',
    To_Position: '',
  });

  // PEA Form State (Inline, No Popup)
  const [editingPeaId, setEditingPeaId] = useState<string | null>(null);
  const [peaForm, setPeaForm] = useState<PEAMaster>({
    PEA_ID: '',
    PEA_Short: '',
    PEA_Full: '',
    Region_Dept: 'กฟฉ.2',
    Executive_Title: '',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Download Excel Template with all 3 sheets
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: VSPP_Master
    const vsppData = [
      {
        VSPP_ID: 'VSPP-UB01',
        VSPP_Name: 'บริษัท อุบล โซลาร์ เพาเวอร์ จำกัด (8 MW)',
        Feeder_Source: 'UBN01',
        Switch_Equipment: '52PEA-H1',
        To_Position: 'ผู้จัดการอาวุโส ฝ่ายผลิตไฟฟ้า',
      },
      {
        VSPP_ID: 'VSPP-UB02',
        VSPP_Name: 'บริษัท วาริน ไบโอแมส จำกัด (9.9 MW)',
        Feeder_Source: 'WRN04',
        Switch_Equipment: 'ABS-04',
        To_Position: 'ผู้จัดการอาวุโส ฝ่ายผลิตไฟฟ้า',
      },
    ];
    const vsppWs = XLSX.utils.json_to_sheet(vsppData);
    XLSX.utils.book_append_sheet(wb, vsppWs, 'VSPP_Master');

    // Sheet 2: PEA_Master
    const peaData = [
      {
        PEA_ID: 'PEA-UBN-01',
        PEA_Short: 'กฟจ.อบ.',
        PEA_Full: 'การไฟฟ้าส่วนภูมิภาคจังหวัดอุบลราชธานี',
        Region_Dept: 'กฟฉ.2',
        Executive_Title: 'ผู้จัดการ การไฟฟ้าส่วนภูมิภาคจังหวัดอุบลราชธานี',
      },
      {
        PEA_ID: 'PEA-WRN-01',
        PEA_Short: 'กฟส.วรช.',
        PEA_Full: 'การไฟฟ้าส่วนภูมิภาคอำเภอวารินชำราบ',
        Region_Dept: 'กฟฉ.2',
        Executive_Title: 'ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอวารินชำราบ',
      },
    ];
    const peaWs = XLSX.utils.json_to_sheet(peaData);
    XLSX.utils.book_append_sheet(wb, peaWs, 'PEA_Master');

    // Sheet 3: Personnel_Master
    const personnelData = [
      {
        id: 'P-001',
        name: 'นายสมชาย มั่นคง (ช่างเทคนิค 6)',
        role: 'creator',
        position: 'ช่างเทคนิค 6 แผนกควบคุมระบบไฟฟ้า',
      },
      {
        id: 'P-002',
        name: 'นายวิศวกร ชำนาญงาน (วศก.7)',
        role: 'inspector',
        position: 'วิศวกร 7 แผนกควบคุมระบบไฟฟ้า',
      },
      {
        id: 'P-003',
        name: 'นายสมศักดิ์ รับเรื่อง (หน.ผสป.)',
        role: 'receiver',
        position: 'หัวหน้าแผนกประสานงาน',
      },
      {
        id: 'P-004',
        name: 'นายวีระ ผู้อนุมัติ (ผจก.)',
        role: 'approver',
        position: 'ผู้จัดการ กฟฟ.อ.เมืองอุบลราชธานี',
      },
    ];
    const personnelWs = XLSX.utils.json_to_sheet(personnelData);
    XLSX.utils.book_append_sheet(wb, personnelWs, 'Personnel_Master');

    // Sheet 4: Substation_Master
    const substationData = [
      {
        Substation_Code: 'UBN',
        Substation_Name: 'สถานีฯ อุบลราชธานี 1 (UBN)',
      },
      {
        Substation_Code: 'WRN',
        Substation_Name: 'สถานีฯ วารินชำราบ (WRN)',
      },
    ];
    const substationWs = XLSX.utils.json_to_sheet(substationData);
    XLSX.utils.book_append_sheet(wb, substationWs, 'Substation_Master');

    // Sheet 5: Feeder_Master
    const feederNoData = [
      { Feeder_No: '01' },
      { Feeder_No: '02' },
      { Feeder_No: '03' },
      { Feeder_No: '04' },
    ];
    const feederNoWs = XLSX.utils.json_to_sheet(feederNoData);
    XLSX.utils.book_append_sheet(wb, feederNoWs, 'Feeder_Master');

    XLSX.writeFile(wb, 'MasterData_Template_NE2.xlsx');
  };

  // Import Excel / CSV Handler
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });

      let vsppImportCount = 0;
      let peaImportCount = 0;
      let personnelImportCount = 0;
      let substationImportCount = 0;
      let feederNoImportCount = 0;

      // Helper to extract rows from sheet
      const getSheetRows = (sheetName: string) => {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) return [];
        return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      };

      // 1. Process VSPP_Master
      let vsppRows = getSheetRows('VSPP_Master');
      if (vsppRows.length === 0 && activeTab === 'VSPP') {
        vsppRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]] || {});
      }

      const importedVspp: VSPPMaster[] = [];
      vsppRows.forEach((row) => {
        const id = String(row.VSPP_ID || row['รหัส VSPP'] || row['รหัส'] || '').trim();
        const name = String(row.VSPP_Name || row['ชื่อ VSPP'] || row['ชื่อโรงไฟฟ้า'] || '').trim();
        if (id && name) {
          importedVspp.push({
            VSPP_ID: id.toUpperCase(),
            VSPP_Name: name,
            Feeder_Source: String(row.Feeder_Source || row['ฟีดเดอร์'] || row['Feeder'] || '').trim().toUpperCase(),
            Switch_Equipment: String(row.Switch_Equipment || row['อุปกรณ์สวิตช์'] || row['อุปกรณ์ปลด'] || '').trim(),
            To_Position: String(row.To_Position || row['ตำแหน่งที่เรียน'] || row['เรียน'] || '').trim(),
          });
        }
      });

      if (importedVspp.length > 0 && onBatchSaveVSPP) {
        await onBatchSaveVSPP(importedVspp);
        vsppImportCount = importedVspp.length;
      }

      // 2. Process PEA_Master
      let peaRows = getSheetRows('PEA_Master');
      if (peaRows.length === 0 && activeTab === 'PEA') {
        peaRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]] || {});
      }

      const importedPea: PEAMaster[] = [];
      peaRows.forEach((row) => {
        const id = String(row.PEA_ID || row['รหัส PEA'] || row['รหัส'] || '').trim();
        const shortName = String(row.PEA_Short || row['ชื่อย่อ'] || row['ชื่อย่อ กฟฟ.'] || '').trim();
        const fullName = String(row.PEA_Full || row['ชื่อเต็ม'] || row['ชื่อเต็ม กฟฟ.'] || shortName).trim();
        if (id && shortName) {
          importedPea.push({
            PEA_ID: id.toUpperCase(),
            PEA_Short: shortName,
            PEA_Full: fullName,
            Region_Dept: String(row.Region_Dept || row['สังกัด'] || 'กฟฉ.2').trim(),
            Executive_Title: String(row.Executive_Title || row['ตำแหน่ง ผบห.'] || '').trim(),
          });
        }
      });

      if (importedPea.length > 0 && onBatchSavePEA) {
        await onBatchSavePEA(importedPea);
        peaImportCount = importedPea.length;
      }

      // 3. Process Personnel_Master
      let personnelRows = getSheetRows('Personnel_Master');
      if (personnelRows.length === 0 && activeTab === 'PERSONNEL') {
        personnelRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]] || {});
      }

      const importedPersonnel: PersonnelMaster[] = [];
      personnelRows.forEach((row, idx) => {
        const name = String(row.name || row['ชื่อ-นามสกุล'] || row['ชื่อ'] || '').trim();
        let role: PersonnelMaster['role'] = 'creator';
        const rawRole = String(row.role || row['หน้าที่'] || row['สิทธิ์'] || '').toLowerCase();
        if (rawRole.includes('inspect') || rawRole.includes('ตรวจ')) role = 'inspector';
        else if (rawRole.includes('receiv') || rawRole.includes('รับ')) role = 'receiver';
        else if (rawRole.includes('approv') || rawRole.includes('อนุมัติ')) role = 'approver';

        const id = String(row.id || row['รหัส'] || `P-IMP-${Date.now()}-${idx}`).trim();

        if (name) {
          importedPersonnel.push({
            id,
            name,
            role,
            position: String(row.position || row['ตำแหน่ง'] || '').trim(),
          });
        }
      });

      if (importedPersonnel.length > 0 && onBatchSavePersonnel) {
        await onBatchSavePersonnel(importedPersonnel);
        personnelImportCount = importedPersonnel.length;
      }

      // 4. Process Substation_Master
      let substationRows = getSheetRows('Substation_Master');
      if (substationRows.length === 0) substationRows = getSheetRows('substation');
      if (substationRows.length === 0 && activeTab === 'SUBSTATION') {
        substationRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]] || {});
      }

      const importedSubstations: SubstationMaster[] = [];
      substationRows.forEach((row) => {
        const subCode = String(row.Substation_Code || row['รหัสสถานี'] || row['Substation'] || '').trim().toUpperCase();
        const subName = String(row.Substation_Name || row['ชื่อสถานี'] || `สถานีฯ ${subCode}`).trim();
        if (subCode) {
          importedSubstations.push({
            Substation_Code: subCode,
            Substation_Name: subName,
          });
        }
      });

      if (importedSubstations.length > 0 && onBatchSaveSubstation) {
        await onBatchSaveSubstation(importedSubstations);
        substationImportCount = importedSubstations.length;
      }

      // 5. Process Feeder_Master
      let feederNoRows = getSheetRows('Feeder_Master');
      if (feederNoRows.length === 0) feederNoRows = getSheetRows('feeder.no');
      if (feederNoRows.length === 0) feederNoRows = getSheetRows('feeder_no');
      if (feederNoRows.length === 0 && activeTab === 'FEEDER_NO') {
        feederNoRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]] || {});
      }

      const importedFeederNos: FeederNoMaster[] = [];
      feederNoRows.forEach((row) => {
        const rawNo = String(row.Feeder_No || row['เลขฟีดเดอร์'] || row['feeder.no'] || '').trim();
        if (rawNo) {
          const feederNo = /^\d+$/.test(rawNo) ? rawNo.padStart(2, '0') : rawNo.toUpperCase();
          importedFeederNos.push({ Feeder_No: feederNo });
        }
      });

      if (importedFeederNos.length > 0 && onBatchSaveFeederNo) {
        await onBatchSaveFeederNo(importedFeederNos);
        feederNoImportCount = importedFeederNos.length;
      }

      const summaryParts = [];
      if (vsppImportCount > 0) summaryParts.push(`โรงไฟฟ้า VSPP ${vsppImportCount} รายการ`);
      if (peaImportCount > 0) summaryParts.push(`ข้อมูล PEA ${peaImportCount} รายการ`);
      if (personnelImportCount > 0) summaryParts.push(`เจ้าหน้าที่ ${personnelImportCount} รายการ`);
      if (substationImportCount > 0) summaryParts.push(`สถานีไฟฟ้า ${substationImportCount} รายการ`);
      if (feederNoImportCount > 0) summaryParts.push(`เลขฟีดเดอร์ ${feederNoImportCount} รายการ`);

      if (summaryParts.length > 0) {
        setNotification({
          type: 'success',
          message: `นำเข้าข้อมูลเรียบร้อยแล้ว: ${summaryParts.join(', ')}`,
        });
      } else {
        setNotification({
          type: 'error',
          message: 'ไม่พบข้อมูลที่ตรงกับโครงสร้าง Master Data ในไฟล์ที่อัปโหลด',
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setNotification({
        type: 'error',
        message: `นำเข้าไฟล์ไม่สำเร็จ: ${errMsg}`,
      });
    } finally {
      e.target.value = '';
    }
  };

  // Filtered VSPP
  const filteredVspp = vsppList.filter(
    (v) =>
      v.VSPP_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.VSPP_Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.Feeder_Source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.Switch_Equipment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered PEA
  const filteredPea = peaList.filter(
    (p) =>
      p.PEA_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.PEA_Short.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.PEA_Full.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.Region_Dept.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle Edit VSPP
  const handleStartEditVspp = (item: VSPPMaster) => {
    setEditingVsppId(item.VSPP_ID);
    setVsppForm({ ...item });
  };

  const handleCancelEditVspp = () => {
    setEditingVsppId(null);
    setVsppForm({
      VSPP_ID: '',
      VSPP_Name: '',
      Feeder_Source: '',
      Switch_Equipment: '',
      To_Position: '',
    });
  };

  const handleSaveVspp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vsppForm.VSPP_ID.trim()) {
      setNotification({ type: 'error', message: 'กรุณาระบุรหัส VSPP_ID' });
      return;
    }

    try {
      await onSaveVSPP(vsppForm);
      setNotification({
        type: 'success',
        message: `บันทึกข้อมูลโรงไฟฟ้า VSPP: ${vsppForm.VSPP_ID} เรียบร้อย`,
      });
      handleCancelEditVspp();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setNotification({ type: 'error', message: `บันทึกไม่สำเร็จ: ${errMsg}` });
    }
  };

  // Handle Edit PEA
  const handleStartEditPea = (item: PEAMaster) => {
    setEditingPeaId(item.PEA_ID);
    setPeaForm({ ...item });
  };

  const handleCancelEditPea = () => {
    setEditingPeaId(null);
    setPeaForm({
      PEA_ID: '',
      PEA_Short: '',
      PEA_Full: '',
      Region_Dept: 'กฟฉ.2',
      Executive_Title: '',
    });
  };

  const handleSavePea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peaForm.PEA_ID.trim()) {
      setNotification({ type: 'error', message: 'กรุณาระบุรหัส PEA_ID' });
      return;
    }

    try {
      await onSavePEA(peaForm);
      setNotification({
        type: 'success',
        message: `บันทึกข้อมูลการไฟฟ้า: ${peaForm.PEA_Short} เรียบร้อย`,
      });
      handleCancelEditPea();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setNotification({ type: 'error', message: `บันทึกไม่สำเร็จ: ${errMsg}` });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Database className="w-4 h-4" />
            </div>
            <span>จัดการฐานข้อมูล Master Data (VSPP / หน่วยงาน PEA / เจ้าหน้าที่ / สถานี-ฟีดเดอร์)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            โครงสร้างชีตตรงตามฐานข้อมูล Google Sheets — สิทธิ์ Admin สามารถ ดึงข้อมูลจาก Google Sheets, เพิ่ม, แก้ไข, นำเข้า Excel และลบข้อมูลได้
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSync && (
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 ${
                gasConnected
                  ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
              }`}
              title="ดึงข้อมูล VSPP, หน่วยงาน, เจ้าหน้าที่, สถานี และฟีดเดอร์ ล่าสุดจาก Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลจาก Google Sheets'}</span>
            </button>
          )}
          {userRole === 'admin' ? (
            <>
              {/* Download Template Button */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold transition-colors shadow-xs"
                title="ดาวน์โหลดไฟล์ Template Excel สำหรับกรอกข้อมูลเพื่อนำเข้า"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>ดาวน์โหลด Template Excel</span>
              </button>

              {/* Import Excel / CSV Button */}
              <label
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                title="เลือกไฟล์ Excel (.xlsx, .xls) หรือ CSV เพื่อนำเข้าข้อมูลเข้าสู่ระบบ"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>นำเข้าไฟล์ Excel / CSV</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleImportExcel}
                  className="hidden"
                />
              </label>
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>โหมดผู้ดูข้อมูล</span>
            </div>
          )}
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${notification.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`} />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              setActiveTab('VSPP');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'VSPP'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>ชีต VSPP_Master ({vsppList.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('PEA');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'PEA'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>ชีต PEA_Master ({peaList.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('PERSONNEL');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'PERSONNEL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ฐานข้อมูลเจ้าหน้าที่ ({personnelList.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('SUBSTATION');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'SUBSTATION'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>ชีต Substation ({substationList.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('FEEDER_NO');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'FEEDER_NO'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ชีต Feeder No. ({feederNoList.length})</span>
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`ค้นหาใน ${
              activeTab === 'VSPP'
                ? 'VSPP'
                : activeTab === 'PEA'
                ? 'PEA'
                : activeTab === 'PERSONNEL'
                ? 'เจ้าหน้าที่'
                : activeTab === 'SUBSTATION'
                ? 'สถานีไฟฟ้า'
                : 'เลขฟีดเดอร์'
            } Master...`}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
          />
        </div>
      </div>

      {/* TAB 1: VSPP_Master Management */}
      {activeTab === 'VSPP' && (
        <div className="space-y-6">
          {userRole === 'admin' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>
                    {editingVsppId
                      ? `แก้ไขข้อมูล VSPP: ${editingVsppId}`
                      : 'เพิ่มโรงไฟฟ้า VSPP ใหม่'}
                  </span>
                </div>
                {editingVsppId && (
                  <button
                    type="button"
                    onClick={handleCancelEditVspp}
                    className="text-xs text-slate-500 hover:text-slate-900 underline"
                  >
                    ยกเลิกการแก้ไข
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveVspp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">
                    รหัสอ้างอิง <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vsppForm.VSPP_ID}
                    onChange={(e) =>
                      setVsppForm({ ...vsppForm, VSPP_ID: e.target.value.toUpperCase() })
                    }
                    disabled={Boolean(editingVsppId)}
                    required
                    placeholder="เช่น VSPP-UB06"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-blue-700 font-mono font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 mb-1 font-medium">
                    ชื่อโรงไฟฟ้า / ผู้ประกอบการ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vsppForm.VSPP_Name}
                    onChange={(e) => setVsppForm({ ...vsppForm, VSPP_Name: e.target.value })}
                    required
                    placeholder="เช่น บริษัท โซลาร์ เพาเวอร์ อุบล 2 จำกัด (6 MW)"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-medium">
                    สังกัดฟีดเดอร์ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vsppForm.Feeder_Source}
                    onChange={(e) =>
                      setVsppForm({ ...vsppForm, Feeder_Source: e.target.value.toUpperCase() })
                    }
                    required
                    placeholder="เช่น UBN01"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-semibold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-medium">
                    อุปกรณ์ปลด
                  </label>
                  <input
                    type="text"
                    value={vsppForm.Switch_Equipment}
                    onChange={(e) =>
                      setVsppForm({ ...vsppForm, Switch_Equipment: e.target.value })
                    }
                    placeholder="เช่น REC-01, ABS-02"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-slate-700 mb-1 font-medium">
                    ตำแหน่งที่จะเรียนในหนังสือราชการ
                  </label>
                  <input
                    type="text"
                    value={vsppForm.To_Position}
                    onChange={(e) => setVsppForm({ ...vsppForm, To_Position: e.target.value })}
                    placeholder="เช่น ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอเมืองอุบลราชธานี"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingVsppId ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล VSPP'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VSPP Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">รหัสอ้างอิง</th>
                    <th className="py-3 px-4">ชื่อโรงไฟฟ้า</th>
                    <th className="py-3 px-4">ฟีดเดอร์</th>
                    <th className="py-3 px-4">อุปกรณ์ปลด</th>
                    <th className="py-3 px-4">ตำแหน่งที่เรียน</th>
                    {userRole === 'admin' && <th className="py-3 px-4 text-right">การจัดการ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredVspp.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        ไม่พบข้อมูลโรงไฟฟ้า VSPP
                      </td>
                    </tr>
                  ) : (
                    filteredVspp.map((item) => (
                      <tr key={item.VSPP_ID} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {item.VSPP_ID}
                        </td>
                        <td className="py-3 px-4 text-slate-900 font-medium">
                          {item.VSPP_Name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 font-semibold whitespace-nowrap">
                          {item.Feeder_Source}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {item.Switch_Equipment || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {item.To_Position || '-'}
                        </td>
                        {userRole === 'admin' && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEditVspp(item)}
                                className="p-1.5 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                                title="แก้ไขข้อมูลนี้"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteVSPP(item.VSPP_ID)}
                                className="p-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                title="ลบข้อมูลนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PEA_Master Management */}
      {activeTab === 'PEA' && (
        <div className="space-y-6">
          {userRole === 'admin' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>
                    {editingPeaId
                      ? `แก้ไขข้อมูล กฟฟ.: ${editingPeaId}`
                      : 'เพิ่มข้อมูลการไฟฟ้าใหม่'}
                  </span>
                </div>
                {editingPeaId && (
                  <button
                    type="button"
                    onClick={handleCancelEditPea}
                    className="text-xs text-slate-500 hover:text-slate-900 underline"
                  >
                    ยกเลิกการแก้ไข
                  </button>
                )}
              </div>

              <form onSubmit={handleSavePea} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">
                    รหัสอ้างอิง <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={peaForm.PEA_ID}
                    onChange={(e) =>
                      setPeaForm({ ...peaForm, PEA_ID: e.target.value.toUpperCase() })
                    }
                    disabled={Boolean(editingPeaId)}
                    required
                    placeholder="เช่น PEA-PBN-01"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-blue-700 font-mono font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-medium">
                    ชื่อย่อ กฟฟ. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={peaForm.PEA_Short}
                    onChange={(e) => setPeaForm({ ...peaForm, PEA_Short: e.target.value })}
                    required
                    placeholder="เช่น กฟฟ.อ.พิบูลมังสาหาร"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 mb-1 font-medium">
                    ชื่อเต็ม กฟฟ. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={peaForm.PEA_Full}
                    onChange={(e) => setPeaForm({ ...peaForm, PEA_Full: e.target.value })}
                    required
                    placeholder="เช่น การไฟฟ้าส่วนภูมิภาคอำเภอพิบูลมังสาหาร"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-medium">
                    สังกัด
                  </label>
                  <input
                    type="text"
                    value={peaForm.Region_Dept}
                    onChange={(e) => setPeaForm({ ...peaForm, Region_Dept: e.target.value })}
                    placeholder="เช่น กฟฉ.2"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-slate-700 mb-1 font-medium">
                    ตำแหน่งผู้บริหาร
                  </label>
                  <input
                    type="text"
                    value={peaForm.Executive_Title}
                    onChange={(e) =>
                      setPeaForm({ ...peaForm, Executive_Title: e.target.value })
                    }
                    placeholder="เช่น ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอพิบูลมังสาหาร"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingPeaId ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล กฟฟ.'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PEA Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">รหัสอ้างอิง</th>
                    <th className="py-3 px-4">ชื่อย่อ</th>
                    <th className="py-3 px-4">ชื่อเต็ม</th>
                    <th className="py-3 px-4">สังกัด</th>
                    <th className="py-3 px-4">ตำแหน่งผู้บริหาร</th>
                    {userRole === 'admin' && <th className="py-3 px-4 text-right">การจัดการ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPea.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        ไม่พบข้อมูล กฟฟ.
                      </td>
                    </tr>
                  ) : (
                    filteredPea.map((item) => (
                      <tr key={item.PEA_ID} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {item.PEA_ID}
                        </td>
                        <td className="py-3 px-4 text-slate-900 font-medium whitespace-nowrap">
                          {item.PEA_Short}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.PEA_Full}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 font-medium whitespace-nowrap">
                          {item.Region_Dept}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {item.Executive_Title || '-'}
                        </td>
                        {userRole === 'admin' && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEditPea(item)}
                                className="p-1.5 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                                title="แก้ไขข้อมูลนี้"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeletePEA(item.PEA_ID)}
                                className="p-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                title="ลบข้อมูลนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Personnel Master Management */}
      {activeTab === 'PERSONNEL' && (
        <div className="space-y-6">
          {userRole === 'admin' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>
                    {editingPersonnelId
                      ? `แก้ไขข้อมูลเจ้าหน้าที่: ${personnelForm.name}`
                      : 'เพิ่มข้อมูลเจ้าหน้าที่ในระบบ'}
                  </span>
                </div>
                {editingPersonnelId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPersonnelId(null);
                      setPersonnelForm({ id: '', name: '', role: 'creator', position: '' });
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 underline"
                  >
                    ยกเลิกการแก้ไข
                  </button>
                )}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!personnelForm.name.trim()) return;
                  const itemToSave: PersonnelMaster = {
                    ...personnelForm,
                    id: personnelForm.id || `P-${Date.now()}`,
                  };
                  await onSavePersonnel(itemToSave);
                  setEditingPersonnelId(null);
                  setPersonnelForm({ id: '', name: '', role: 'creator', position: '' });
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs"
              >
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">ชื่อ-นามสกุล / ยศ / ตำแหน่ง <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={personnelForm.name}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, name: e.target.value })}
                    required
                    placeholder="เช่น นายสมชาย มั่นคง (ช่างเทคนิค 6)"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-medium">สิทธิ์การลงชื่อ / หน้าที่ <span className="text-rose-500">*</span></label>
                  <select
                    value={personnelForm.role}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, role: e.target.value as PersonnelMaster['role'] })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  >
                    <option value="creator">ผู้จัดทำ</option>
                    <option value="inspector">ผู้ตรวจสอบ</option>
                    <option value="receiver">ผู้ลงรับ</option>
                    <option value="approver">ผู้ลงอนุมัติ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-medium">ตำแหน่งสายงาน / แผนก</label>
                  <input
                    type="text"
                    value={personnelForm.position || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, position: e.target.value })}
                    placeholder="เช่น แผนกควบคุมระบบไฟฟ้า กฟฉ.2"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingPersonnelId ? 'บันทึกการแก้ไข' : 'เพิ่มรายชื่อเจ้าหน้าที่'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Personnel Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                    <th className="py-3 px-4">สิทธิ์ / กลุ่มงาน</th>
                    <th className="py-3 px-4">ตำแหน่ง</th>
                    {userRole === 'admin' && <th className="py-3 px-4 text-right">การจัดการ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {personnelList.filter((p) =>
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (p.position || '').toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        ไม่พบข้อมูลเจ้าหน้าที่
                      </td>
                    </tr>
                  ) : (
                    personnelList
                      .filter((p) =>
                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (p.position || '').toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-slate-900 font-medium">
                            {item.name}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              item.role === 'creator'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : item.role === 'inspector'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : item.role === 'receiver'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {item.role === 'creator'
                                ? 'ผู้จัดทำ'
                                : item.role === 'inspector'
                                ? 'ผู้ตรวจสอบ'
                                : item.role === 'receiver'
                                ? 'ผู้ลงรับ'
                                : 'ผู้ลงอนุมัติ'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {item.position || '-'}
                          </td>
                          {userRole === 'admin' && (
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingPersonnelId(item.id);
                                    setPersonnelForm({ ...item });
                                  }}
                                  className="p-1.5 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                                  title="แก้ไขข้อมูลนี้"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeletePersonnel(item.id)}
                                  className="p-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                  title="ลบข้อมูลนี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Substation_Master Management */}
      {activeTab === 'SUBSTATION' && (
        <div className="space-y-6">
          {userRole === 'admin' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>
                    {editingSubstationCode
                      ? `แก้ไขข้อมูลสถานีไฟฟ้า: ${editingSubstationCode}`
                      : 'เพิ่มข้อมูลสถานีไฟฟ้า'}
                  </span>
                </div>
                {editingSubstationCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubstationCode(null);
                      setSubstationForm({ Substation_Code: '', Substation_Name: '' });
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 underline"
                  >
                    ยกเลิกการแก้ไข
                  </button>
                )}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!substationForm.Substation_Code.trim()) return;

                  const subCode = substationForm.Substation_Code.trim().toUpperCase();
                  const subName = substationForm.Substation_Name.trim() || `สถานีฯ ${subCode}`;
                  const itemToSave: SubstationMaster = {
                    Substation_Code: subCode,
                    Substation_Name: subName,
                  };

                  if (onSaveSubstation) {
                    await onSaveSubstation(itemToSave);
                  }
                  setEditingSubstationCode(null);
                  setSubstationForm({ Substation_Code: '', Substation_Name: '' });
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs"
              >
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">
                    รหัสสถานี <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={substationForm.Substation_Code}
                    onChange={(e) =>
                      setSubstationForm({ ...substationForm, Substation_Code: e.target.value.toUpperCase() })
                    }
                    disabled={Boolean(editingSubstationCode)}
                    required
                    placeholder="เช่น UBN, WRN"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-blue-700 font-mono font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 mb-1 font-medium">
                    ชื่อสถานีไฟฟ้า <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={substationForm.Substation_Name}
                    onChange={(e) => setSubstationForm({ ...substationForm, Substation_Name: e.target.value })}
                    required
                    placeholder="เช่น สถานีฯ อุบลราชธานี 1"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingSubstationCode ? 'บันทึกการแก้ไข' : 'เพิ่มสถานีไฟฟ้า'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Substation Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">รหัสสถานี</th>
                    <th className="py-3 px-4">ชื่อสถานีไฟฟ้า</th>
                    {userRole === 'admin' && <th className="py-3 px-4 text-right">การจัดการ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {substationList.filter((s) =>
                    s.Substation_Code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.Substation_Name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400">
                        ไม่พบข้อมูลสถานีไฟฟ้า
                      </td>
                    </tr>
                  ) : (
                    substationList
                      .filter((s) =>
                        s.Substation_Code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.Substation_Name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((item) => (
                        <tr key={item.Substation_Code} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                            {item.Substation_Code}
                          </td>
                          <td className="py-3 px-4 text-slate-900 font-medium">
                            {item.Substation_Name}
                          </td>
                          {userRole === 'admin' && (
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingSubstationCode(item.Substation_Code);
                                    setSubstationForm({ ...item });
                                  }}
                                  className="p-1.5 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                                  title="แก้ไขข้อมูลนี้"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                {onDeleteSubstation && (
                                  <button
                                    onClick={() => onDeleteSubstation(item.Substation_Code)}
                                    className="p-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                    title="ลบข้อมูลนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Feeder_Master Management */}
      {activeTab === 'FEEDER_NO' && (
        <div className="space-y-6">
          {userRole === 'admin' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>
                    {editingFeederNo
                      ? `แก้ไขเลขฟีดเดอร์: ${editingFeederNo}`
                      : 'เพิ่มเลขฟีดเดอร์'}
                  </span>
                </div>
                {editingFeederNo && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFeederNo(null);
                      setFeederNoForm({ Feeder_No: '' });
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 underline"
                  >
                    ยกเลิกการแก้ไข
                  </button>
                )}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!feederNoForm.Feeder_No.trim()) return;

                  const raw = feederNoForm.Feeder_No.trim();
                  const feederNo = /^\d+$/.test(raw) ? raw.padStart(2, '0') : raw.toUpperCase();
                  const itemToSave: FeederNoMaster = {
                    Feeder_No: feederNo,
                  };

                  if (onSaveFeederNo) {
                    await onSaveFeederNo(itemToSave);
                  }
                  setEditingFeederNo(null);
                  setFeederNoForm({ Feeder_No: '' });
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
              >
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 mb-1 font-medium">
                    เลขฟีดเดอร์ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={feederNoForm.Feeder_No}
                    onChange={(e) => setFeederNoForm({ Feeder_No: e.target.value })}
                    required
                    placeholder="เช่น 01, 02, 03"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-blue-700 font-mono font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingFeederNo ? 'บันทึกการแก้ไข' : 'เพิ่มเลขฟีดเดอร์'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Feeder No Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">เลขฟีดเดอร์</th>
                    {userRole === 'admin' && <th className="py-3 px-4 text-right">การจัดการ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {feederNoList.filter((f) =>
                    f.Feeder_No.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-slate-400">
                        ไม่พบข้อมูลเลขฟีดเดอร์
                      </td>
                    </tr>
                  ) : (
                    feederNoList
                      .filter((f) =>
                        f.Feeder_No.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((item) => (
                        <tr key={item.Feeder_No} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                            {item.Feeder_No}
                          </td>
                          {userRole === 'admin' && (
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingFeederNo(item.Feeder_No);
                                    setFeederNoForm({ ...item });
                                  }}
                                  className="p-1.5 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                                  title="แก้ไขข้อมูลนี้"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                {onDeleteFeederNo && (
                                  <button
                                    onClick={() => onDeleteFeederNo(item.Feeder_No)}
                                    className="p-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                    title="ลบข้อมูลนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
