import React, { useState, useEffect, useMemo } from 'react';
import { TaskItem, VSPPMaster, PEAMaster, PersonnelMaster, SubstationMaster, FeederNoMaster, FormSubDay, OverallStatus, DailyStatus } from '../types/grid';
import { calculateP6SLA } from '../services/storage';
import { isTimeOverlapping } from '../utils/conflictDetector';
import { formatThaiDate } from './PrintView';
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Zap,
  Building2,
  FileText,
  UserCheck,
  CheckCircle2,
  ShieldCheck,
  Info,
  CalendarCheck,
  X,
  MapPin,
  ListPlus,
  ChevronLeft,
  ChevronRight,
  Check,
  Send,
} from 'lucide-react';

interface JobFormViewProps {
  initialJobId?: string;
  initialSubId?: string;
  existingTasks: TaskItem[];
  vsppList: VSPPMaster[];
  peaList: PEAMaster[];
  personnelList: PersonnelMaster[];
  substationList?: SubstationMaster[];
  feederNoList?: FeederNoMaster[];
  onSaveJobBatch: (items: TaskItem[]) => Promise<void>;
  onCancel: () => void;
}

// 30-minute interval dropdown choices
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

// Fallback Substation dropdown list
const DEFAULT_SUBSTATION_LIST = [
  { code: 'UBN', name: 'สถานีฯ อุบลราชธานี 1 (UBN)' },
  { code: 'WRN', name: 'สถานีฯ วารินชำราบ (WRN)' },
  { code: 'DET', name: 'สถานีฯ เดชอุดม (DET)' },
  { code: 'KMR', name: 'สถานีฯ เขมราฐ (KMR)' },
  { code: 'PBN', name: 'สถานีฯ พิบูลมังสาหาร (PBN)' },
  { code: 'TRA', name: 'สถานีฯ ตระการพืชผล (TRA)' },
  { code: 'WRA', name: 'สถานีฯ วารินชำราบ 2 (WRA)' },
  { code: 'KCN', name: 'สถานีฯ กุฉินารายณ์ (KCN)' },
  { code: 'KNT', name: 'สถานีฯ เขื่องใน (KNT)' },
  { code: 'SSN', name: 'สถานีฯ สิรินธร (SSN)' },
  { code: 'MNA', name: 'สถานีฯ ม่วงสามสิบ (MNA)' },
  { code: 'TCH', name: 'สถานีฯ ตระการฯ 2 (TCH)' },
];

const DEFAULT_FEEDER_NUM_LIST = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const JobFormView: React.FC<JobFormViewProps> = ({
  initialJobId,
  initialSubId,
  existingTasks,
  vsppList,
  peaList,
  personnelList,
  substationList = [],
  feederNoList = [],
  onSaveJobBatch,
  onCancel,
}) => {
  const isEditing = Boolean(initialJobId);

  // Generate automatic Job_ID if creating fresh (Read-Only)
  const defaultJobId = useMemo(() => {
    if (initialJobId) return initialJobId;
    const year = new Date().getFullYear();
    const existingJobNums = existingTasks
      .map((t) => {
        const m = t.Job_ID.match(/JOB-\d{4}-(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const nextNum = existingJobNums.length > 0 ? Math.max(...existingJobNums) + 1 : 1;
    return `JOB-${year}-${String(nextNum).padStart(3, '0')}`;
  }, [initialJobId, existingTasks]);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Derived Personnel names directly from Personnel_Master (column name)
  const creatorOptions = useMemo(() => {
    const list = personnelList.filter((p) => p.role === 'creator').map((p) => p.name);
    return list.length > 0
      ? list
      : personnelList.length > 0
      ? personnelList.map((p) => p.name)
      : ['นายสมชาย มั่นคง (ช่างเทคนิค 6)', 'นายชาญชัย มีสุข (ช่างชำนาญการ)', 'นายนิคม รักษาดี (พนักงาน กฟฟ.)', 'นายประวิทย์ มั่งมี (วศก.5)'];
  }, [personnelList]);

  const inspectorOptions = useMemo(() => {
    const list = personnelList.filter((p) => p.role === 'inspector').map((p) => p.name);
    return list.length > 0
      ? list
      : personnelList.length > 0
      ? personnelList.map((p) => p.name)
      : ['นายวิศวกร ชำนาญงาน (วศก.7)', 'นายธีระยุทธ ตรวจสอบ (วศก.6)', 'นายช่างใหญ่ คุมงาน (ชฟ.7)', 'นายณรงค์ ศรีสุข (หน.แผนก)'];
  }, [personnelList]);

  const receiverOptions = useMemo(() => {
    const list = personnelList.filter((p) => p.role === 'receiver').map((p) => p.name);
    return list.length > 0
      ? list
      : personnelList.length > 0
      ? personnelList.map((p) => p.name)
      : ['นายสมศักดิ์ รับเรื่อง (หน.ผสป.)', 'นางสาวสุดา รับเรื่อง (พนักงาน กฟฟ.)', 'นางรุ่งทิพย์ ลงรับ (พนักงาน กฟฟ.)', 'นายนคร ลงรับ (พนักงาน กฟฟ.)'];
  }, [personnelList]);

  const approverOptions = useMemo(() => {
    const list = personnelList.filter((p) => p.role === 'approver').map((p) => p.name);
    return list.length > 0
      ? list
      : personnelList.length > 0
      ? personnelList.map((p) => p.name)
      : ['นายวีระ ผู้อนุมัติ (ผจก.กฟฟ.อ.เมืองอุบลราชธานี)', 'นายไพโรจน์ ผจก.กฟฟ.อ.วารินชำราบ', 'นายประเสริฐ ผจก.กฟฟ.อ.เดชอุดม', 'นายสมศักดิ์ ผจก.กฟฟ.อ.เขมราฐ'];
  }, [personnelList]);

  // Derived Substation Code & Name options directly from Substation_Master
  const substationOptionsList = useMemo(() => {
    if (!substationList || substationList.length === 0) {
      return DEFAULT_SUBSTATION_LIST;
    }
    const map = new Map<string, string>();
    substationList.forEach((s) => {
      if (s.Substation_Code && !map.has(s.Substation_Code)) {
        map.set(s.Substation_Code, s.Substation_Name || `สถานีฯ ${s.Substation_Code}`);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [substationList]);

  // Section 1: ข้อมูลขออนุมัติดับไฟ
  const jobId = defaultJobId; // Read-Only Job_ID
  const [peaRequest, setPeaRequest] = useState('');
  const [docNo, setDocNo] = useState('');
  const [docDate, setDocDate] = useState('');
  const [receiver, setReceiver] = useState('');

  // Multi-Recipient Send_To list (ส่งหนังสือถึง - สำหรับช่อง ถึง ในใบปะหน้า)
  const [sendToList, setSendToList] = useState<string[]>([]);
  const [recipientSelect, setRecipientSelect] = useState('');
  const [customRecipient, setCustomRecipient] = useState('');

  // Default PEA recipient options
  const recipientOptionsList = useMemo(() => {
    const defaultCodes = [
      'กฟจ.อบ.',
      'กฟส.วรช.',
      'กฟอ.ดอ.',
      'กฟอ.เขมราฐ',
      'กฟอ.พิบูลมังสาหาร',
      'กฟอ.ตระการพืชผล',
      'กฟอ.เขื่องใน',
      'กฟอ.ม่วงสามสิบ',
      'กฟอ.ตระการฯ',
    ];
    const fromMaster = peaList.map((p) => p.PEA_Short);
    return Array.from(new Set([...defaultCodes, ...fromMaster])).filter(Boolean);
  }, [peaList]);

  const handleAddRecipient = (newRecipient?: string) => {
    const target = (newRecipient || recipientSelect || customRecipient).trim();
    if (!target) return;
    if (!sendToList.includes(target)) {
      setSendToList([...sendToList, target]);
    }
    setCustomRecipient('');
  };

  const handleRemoveRecipient = (itemToRemove: string) => {
    if (sendToList.length <= 1) {
      setNotification({ type: 'error', message: 'ต้องระบุส่งหนังสือถึงอย่างน้อย 1 รายการ' });
      return;
    }
    setSendToList(sendToList.filter((r) => r !== itemToRemove));
  };

  // Section 2: รายละเอียดการปฏิบัติงาน
  const [mainDetail, setMainDetail] = useState('');
  const [workArea, setWorkArea] = useState('');
  
  // Multi-Feeder List
  const [feedersList, setFeedersList] = useState<string[]>([]);
  const [subStation, setSubStation] = useState('');
  const [feederNum, setFeederNum] = useState('01');

  // Feeder No. options derived from Feeder_Master
  const feederNumOptionsList = useMemo(() => {
    if (!feederNoList || feederNoList.length === 0) {
      return DEFAULT_FEEDER_NUM_LIST;
    }
    const list = feederNoList
      .map((f) => f.Feeder_No)
      .filter(Boolean);
    return list.length > 0 ? Array.from(new Set(list)).sort() : DEFAULT_FEEDER_NUM_LIST;
  }, [feederNoList]);

  const [feederScope, setFeederScope] = useState('');
  const [vsppId, setVsppId] = useState('');

  // Auto-detect VSPPs matching ANY selected feeder in feedersList
  const autoVsppMatchedList = useMemo(() => {
    if (!feedersList || feedersList.length === 0) return [];
    const upperFeeders = feedersList.map((f) => f.trim().toUpperCase());
    return vsppList.filter((v) => upperFeeders.includes(v.Feeder_Source.toUpperCase()));
  }, [feedersList, vsppList]);

  useEffect(() => {
    if (autoVsppMatchedList.length > 0) {
      setVsppId(autoVsppMatchedList[0].VSPP_ID);
    }
  }, [autoVsppMatchedList]);

  // Add feeder candidate
  const handleAddFeeder = () => {
    const candidate = `${subStation}${feederNum}`.toUpperCase();
    if (!feedersList.includes(candidate)) {
      setFeedersList([...feedersList, candidate]);
    }
  };

  // Remove feeder from list
  const handleRemoveFeeder = (feederToRemove: string) => {
    if (feedersList.length <= 1) {
      setNotification({ type: 'error', message: 'ต้องมีฟีดเดอร์ปฏิบัติงานอย่างน้อย 1 รายการ' });
      return;
    }
    setFeedersList(feedersList.filter((f) => f !== feederToRemove));
  };

  // Section 3: การตรวจสอบ Switching
  const [creator, setCreator] = useState('');
  const [inspector, setInspector] = useState('');
  const [checkDate, setCheckDate] = useState('');

  // Section 4: ผลการอนุมัติดับไฟ
  const [overallStatus, setOverallStatus] = useState<OverallStatus>('รออนุมัติ');
  const [approvalNo, setApprovalNo] = useState('');
  const [approvalDate, setApprovalDate] = useState('');
  const [approverReceiver, setApproverReceiver] = useState('');
  const [note, setNote] = useState('');

  // Sub Days (Operation Dates)
  const [subDays, setSubDays] = useState<FormSubDay[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Multi-Date Interactive Calendar Modal State
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());

  // Auto SLA P6 Calculation (excluding weekends)
  const calculatedSLA = useMemo(() => {
    const firstWorkDate = subDays[0]?.workDate || todayStr;
    return calculateP6SLA(docDate, firstWorkDate);
  }, [docDate, subDays, todayStr]);

  // Load existing data if editing
  useEffect(() => {
    if (initialJobId) {
      const matched = existingTasks.filter((t) => t.Job_ID === initialJobId);
      if (matched.length > 0) {
        const first = matched[0];
        setPeaRequest(first.PEA_Request || '');

        if (first.Send_To) {
          const splitRecipients = first.Send_To.split(/[,;]+/).map((r) => r.trim()).filter(Boolean);
          if (splitRecipients.length > 0) {
            setSendToList(splitRecipients);
          }
        } else if (first.PEA_Request) {
          setSendToList([first.PEA_Request]);
        }

        setVsppId(first.VSPP_ID || '');
        setDocNo(first.Doc_No || '');
        setDocDate(first.Doc_Date || todayStr);
        setApprovalNo(first.Approval_No || 'ฉ.2 กปบ.(คฟ) ');
        setApprovalDate(first.Approval_Date || '');
        setWorkArea(first.Work_Area || '');

        if (first.Feeder) {
          const splitFeeders = first.Feeder.split(/[,;\s]+/).map((f) => f.trim().toUpperCase()).filter(Boolean);
          if (splitFeeders.length > 0) {
            setFeedersList(splitFeeders);
          }
        }

        const rawScope = (first.Feeder_Scope || '').trim();
        if (rawScope === 'สายส่ง/BAY 115 kV' || rawScope === 'TP/KT/BUS 22 kV' || rawScope === 'ระบบจำหน่าย') {
          setFeederScope(rawScope);
        } else if (rawScope.includes('115')) {
          setFeederScope('สายส่ง/BAY 115 kV');
        } else if (rawScope.includes('22') || rawScope.includes('TP/KT/BUS')) {
          setFeederScope('TP/KT/BUS 22 kV');
        } else {
          setFeederScope('ระบบจำหน่าย');
        }
        setMainDetail(first.Main_Detail || '');
        setCreator(first.Creator || creatorOptions[0]);
        setInspector(first.Inspector || inspectorOptions[0]);
        setCheckDate(first.Check_Date || todayStr);
        setReceiver(first.Receiver || receiverOptions[0]);
        setApproverReceiver(first.Approver_Receiver || approverOptions[0]);
        setOverallStatus(first.Overall_Status || 'รออนุมัติ');
        setNote(first.Note || '');

        const days: FormSubDay[] = matched.map((item, idx) => ({
          tempId: `day-${idx}-${Date.now()}`,
          subId: item.Sub_ID,
          workDate: item.Work_Date,
          startTime: item.Start_Time || '09:00',
          endTime: item.End_Time || '12:00',
          customDetail: '',
          dailyStatus: item.Daily_Status || 'ปกติ',
        }));
        setSubDays(days);
        return;
      }
    }

    // Clear all fields when creating a new job
    setPeaRequest('');
    setDocNo('');
    setDocDate('');
    setReceiver('');
    setSendToList([]);
    setRecipientSelect('');
    setCustomRecipient('');
    setMainDetail('');
    setWorkArea('');
    setFeedersList([]);
    setSubStation('');
    setFeederNum(feederNumOptionsList[0] || '01');
    setFeederScope('');
    setVsppId('');
    setCreator('');
    setInspector('');
    setCheckDate('');
    setOverallStatus('รออนุมัติ');
    setApprovalNo('');
    setApprovalDate('');
    setApproverReceiver('');
    setNote('');

    setSubDays([
      {
        tempId: `day-0-${Date.now()}`,
        subId: `${defaultJobId}-01`,
        workDate: todayStr,
        startTime: '09:00',
        endTime: '12:00',
        customDetail: '',
        dailyStatus: 'ปกติ',
      },
    ]);
  }, [initialJobId, existingTasks, defaultJobId, todayStr, creatorOptions, inspectorOptions, receiverOptions, approverOptions, feederNumOptionsList]);

  // Toggle date in calendar modal
  const handleToggleDateInCalendar = (dateStr: string) => {
    const exists = subDays.some((d) => d.workDate === dateStr);
    let updated: FormSubDay[];

    if (exists) {
      if (subDays.length <= 1) {
        setNotification({ type: 'error', message: 'ต้องเลือกวันปฏิบัติงานอย่างน้อย 1 วัน' });
        return;
      }
      updated = subDays.filter((d) => d.workDate !== dateStr);
    } else {
      updated = [
        ...subDays,
        {
          tempId: `day-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          subId: '',
          workDate: dateStr,
          startTime: '09:00',
          endTime: '12:00',
          customDetail: '',
          dailyStatus: 'ปกติ' as DailyStatus,
        },
      ];
    }

    updated.sort((a, b) => a.workDate.localeCompare(b.workDate));
    const reindexed = updated.map((d, idx) => ({
      ...d,
      subId: `${jobId}-${String(idx + 1).padStart(2, '0')}`,
    }));
    setSubDays(reindexed);
  };

  // Remove date day row from main list
  const handleRemoveDay = (tempId: string) => {
    if (subDays.length <= 1) {
      setNotification({ type: 'error', message: 'ต้องมีวันปฏิบัติงานอย่างน้อย 1 วัน' });
      return;
    }
    const filtered = subDays.filter((d) => d.tempId !== tempId);
    const reindexed = filtered.map((d, idx) => ({
      ...d,
      subId: `${jobId}-${String(idx + 1).padStart(2, '0')}`,
    }));
    setSubDays(reindexed);
  };

  // Update day field (startTime, endTime, dailyStatus, workDate)
  const handleUpdateDayField = (
    tempId: string,
    field: keyof FormSubDay,
    value: string
  ) => {
    setSubDays((prev) => {
      const updated = prev.map((d) => (d.tempId === tempId ? { ...d, [field]: value } : d));
      if (field === 'workDate') {
        updated.sort((a, b) => a.workDate.localeCompare(b.workDate));
        return updated.map((d, idx) => ({
          ...d,
          subId: `${jobId}-${String(idx + 1).padStart(2, '0')}`,
        }));
      }
      return updated;
    });
  };

  // Calendar Grid Cells Computation
  const calendarGridDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    const days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      const yyyy = prevDate.getFullYear();
      const mm = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      days.push({ dateStr: `${yyyy}-${mm}-${dd}`, dayNum: d, isCurrentMonth: false });
    }

    for (let d = 1; d <= totalDays; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      days.push({ dateStr: `${year}-${mm}-${dd}`, dayNum: d, isCurrentMonth: true });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const yyyy = nextDate.getFullYear();
      const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      days.push({ dateStr: `${yyyy}-${mm}-${dd}`, dayNum: d, isCurrentMonth: false });
    }

    return days;
  }, [calendarViewDate]);

  // Live Conflict Checker for multi-feeders and PEA requests
  const checkDayConflict = (day: FormSubDay): { type: 'CRITICAL' | 'WARNING'; message: string } | null => {
    if (!day.workDate || !day.startTime || !day.endTime || feedersList.length === 0) return null;

    const currentSubId = day.subId;
    const currentFeeders = feedersList.map((f) => f.trim().toUpperCase());

    for (const other of existingTasks) {
      if (other.Job_ID === jobId && other.Sub_ID === currentSubId) continue;
      if (other.Work_Date !== day.workDate) continue;
      if (other.Daily_Status === 'ยกเลิก' || other.Overall_Status === 'ยกเลิก') continue;

      const timeClash = isTimeOverlapping(
        day.startTime,
        day.endTime,
        other.Start_Time,
        other.End_Time
      );

      if (!timeClash) continue;

      const otherFeeders = (other.Feeder || '').split(/[,;\s]+/).map((f) => f.trim().toUpperCase()).filter(Boolean);
      const feederOverlap = currentFeeders.filter((cf) => otherFeeders.includes(cf));

      if (feederOverlap.length > 0) {
        return {
          type: 'CRITICAL',
          message: `ฟีดเดอร์ทับซ้อน: ซ้อนทับกับ ${other.Sub_ID} (ฟีดเดอร์ ${feederOverlap.join(', ')}, เวลา ${other.Start_Time}-${other.End_Time} น., กฟฟ.${other.PEA_Request})`,
        };
      }

      if (peaRequest && other.PEA_Request === peaRequest) {
        return {
          type: 'WARNING',
          message: `กฟฟ.ขอดับไฟทับซ้อน: กฟฟ.${other.PEA_Request} มีงานขอดับไฟอีกงานในช่วงเวลาเดียวกันกับ ${other.Sub_ID} (เวลา ${other.Start_Time}-${other.End_Time} น., ฟีดเดอร์ ${other.Feeder})`,
        };
      }
    }

    return null;
  };

  // Aggregated conflicts for the current job being added/edited
  const allJobConflicts = useMemo(() => {
    const list: Array<{ dayIndex: number; subId: string; workDate: string; type: 'CRITICAL' | 'WARNING'; message: string }> = [];
    subDays.forEach((day, idx) => {
      const c = checkDayConflict(day);
      if (c) {
        list.push({
          dayIndex: idx + 1,
          subId: day.subId || `${jobId}-${String(idx + 1).padStart(2, '0')}`,
          workDate: day.workDate,
          type: c.type,
          message: c.message,
        });
      }
    });
    return list;
  }, [subDays, feedersList, peaRequest, existingTasks, jobId]);

  // Save full batch
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendToList.length === 0) {
      setNotification({ type: 'error', message: 'กรุณาระบุส่งหนังสือถึงอย่างน้อย 1 รายการ' });
      return;
    }
    if (feedersList.length === 0) {
      setNotification({ type: 'error', message: 'กรุณาระบุฟีดเดอร์ปฏิบัติงานอย่างน้อย 1 รายการ' });
      return;
    }
    if (!feederScope) {
      setNotification({ type: 'error', message: 'กรุณาเลือกขอบเขตดับไฟ' });
      return;
    }
    if (subDays.length === 0) {
      setNotification({ type: 'error', message: 'กรุณากำหนดวันปฏิบัติงานอย่างน้อย 1 วัน' });
      return;
    }

    setIsSaving(true);
    setNotification(null);

    const combinedFeederString = feedersList.join(', ');
    const combinedSendToString = sendToList.join(', ');

    try {
      const itemsToSave: TaskItem[] = subDays.map((d) => ({
        Sub_ID: d.subId,
        Job_ID: jobId.trim(),
        PEA_Request: peaRequest,
        Send_To: combinedSendToString,
        VSPP_ID: vsppId || '',
        Doc_No: docNo.trim(),
        Doc_Date: docDate,
        Approval_No: approvalNo.trim(),
        Approval_Date: approvalDate,
        Work_Date: d.workDate,
        Start_Time: d.startTime,
        End_Time: d.endTime,
        Main_Detail: mainDetail.trim(),
        Custom_Detail: mainDetail.trim(),
        Work_Area: workArea.trim(),
        Feeder: combinedFeederString,
        Feeder_Scope: feederScope.trim(),
        Creator: creator.trim(),
        Inspector: inspector.trim(),
        Check_Date: checkDate,
        SLA: calculatedSLA.text,
        Receiver: receiver.trim(),
        Approver_Receiver: approverReceiver.trim(),
        Overall_Status: overallStatus,
        Daily_Status: d.dailyStatus,
        Note: note.trim(),
      }));

      await onSaveJobBatch(itemsToSave);

      setNotification({
        type: 'success',
        message: `บันทึกแผนงาน ${jobId} สำเร็จ (${itemsToSave.length} วันปฏิบัติงาน)`,
      });

      setTimeout(() => {
        onCancel();
      }, 800);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setNotification({
        type: 'error',
        message: `บันทึกไม่สำเร็จ: ${errMsg}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs transition-colors"
            title="กลับไปหน้าแดชบอร์ด"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex flex-wrap items-center gap-2">
              <span>{isEditing ? `แก้ไขแผนงาน: ${jobId}` : `บันทึกแผนงานใหม่: ${jobId}`}</span>
              <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {subDays.length} วันปฏิบัติงาน
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ศูนย์ควบคุมการจ่ายไฟฟ้า Dispatching Center NE2 — แบบฟอร์มบันทึกและแก้ไขแผนงานดับไฟ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกแผนงานทั้งหมด'}</span>
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {allJobConflicts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2 text-rose-900 shadow-2xs">
          <div className="flex items-center justify-between gap-2 border-b border-rose-200 pb-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>ระบบตรวจพบงานดับไฟที่มีช่วงเวลาซ้อนทับกันสำหรับงานนี้</span>
            </div>
            <span className="text-xs bg-rose-600 text-white font-mono font-bold px-2.5 py-0.5 rounded">
              พบ {allJobConflicts.length} จุดซ้อนทับ
            </span>
          </div>
          <div className="text-xs space-y-1.5 pt-1">
            {allJobConflicts.map((c, idx) => (
              <div key={`conflict-item-${c.subId}-${idx}`} className="flex items-start gap-2 text-rose-900 bg-white p-2.5 rounded-lg border border-rose-200">
                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0 font-mono ${c.type === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}>
                  {c.type === 'CRITICAL' ? 'ฟีดเดอร์ซ้อนทับ' : 'กฟฟ.ซ้อนทับ'}
                </span>
                <div>
                  <strong className="text-slate-900 font-mono">{formatThaiDate(c.workDate)} ({c.subId}):</strong> {c.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ส่วนที่ 1: ข้อมูลขออนุมัติดับไฟ */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>1. ข้อมูลขออนุมัติดับไฟ</span>
            </div>
            <span className="text-[11px] text-slate-500">
              รหัสงานหลักสร้างอัตโนมัติ
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
            {/* Job_ID (Read-Only) */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium">
                รหัสงานหลัก
              </label>
              <input
                type="text"
                value={jobId}
                readOnly
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-blue-700 font-mono font-bold cursor-not-allowed"
              />
            </div>

            {/* กฟฟ.ขอดับไฟ (Searchable input + datalist) */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium flex items-center justify-between">
                <span>กฟฟ. ขอดับไฟ <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-blue-600 font-medium">พิมพ์ค้นหาได้</span>
              </label>
              <input
                type="text"
                list="pea-request-datalist"
                value={peaRequest}
                onChange={(e) => setPeaRequest(e.target.value)}
                required
                placeholder="พิมพ์ค้นหาหรือเลือก กฟฟ..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 font-medium"
              />
              <datalist id="pea-request-datalist">
                {peaList.map((p, idx) => (
                  <option key={`${p.PEA_ID || p.PEA_Short}-${idx}`} value={p.PEA_Short}>
                    {p.PEA_Short} ({p.PEA_Full})
                  </option>
                ))}
              </datalist>
            </div>

            {/* เลขที่หนังสือขอดับไฟ */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium">
                เลขที่หนังสือขอดับไฟ
              </label>
              <input
                type="text"
                value={docNo}
                onChange={(e) => setDocNo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                placeholder="เช่น มท 5304.12/1042"
              />
            </div>

            {/* ลงวันที่ (Doc_Date) */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>ลงวันที่หนังสือ</span>
              </label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
              />
            </div>

            {/* ผู้ลงรับ */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium flex items-center justify-between">
                <span>ผู้ลงรับ <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400">จากฐานข้อมูล</span>
              </label>
              <select
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 font-medium"
              >
                <option value="">-- เลือกผู้ลงรับ --</option>
                {receiverOptions.map((name, idx) => (
                  <option key={`${name}-${idx}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* ส่งหนังสือถึง (Send_To) - เลือกเพิ่มได้หลายรายการสำหรับช่อง ถึง ในใบปะหน้า */}
            <div className="sm:col-span-5 space-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200 mt-1">
              <label className="block text-slate-700 font-medium flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-900 font-semibold">
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                  <span>ส่งหนังสือถึงสำหรับช่อง ถึง ในใบปะหน้า <span className="text-rose-500">*</span></span>
                </span>
                <span className="text-[11px] text-slate-500">เลือกและกดเพิ่มได้หลายรายการ</span>
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={recipientSelect}
                  onChange={(e) => setRecipientSelect(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-blue-600 font-medium"
                >
                  <option value="">-- เลือกหน่วยงานผู้รับหนังสือ --</option>
                  {recipientOptionsList.map((r, idx) => (
                    <option key={`${r}-${idx}`} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleAddRecipient(recipientSelect)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-2xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มผู้รับหนังสือ {recipientSelect ? `(${recipientSelect})` : ''}</span>
                </button>
              </div>

              {/* Custom recipient input option */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customRecipient}
                  onChange={(e) => setCustomRecipient(e.target.value)}
                  placeholder="หรือพิมพ์ชื่อหน่วยงานผู้รับแบบกำหนดเอง..."
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRecipient(customRecipient);
                    }
                  }}
                />
                {customRecipient.trim() && (
                  <button
                    type="button"
                    onClick={() => handleAddRecipient(customRecipient)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shrink-0"
                  >
                    + เพิ่มพิมพ์เอง
                  </button>
                )}
              </div>

              {/* Badges of selected Send_To items */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500">รายการที่เลือกใส่ช่อง ถึง:</span>
                {sendToList.map((item, idx) => (
                  <span
                    key={`${item}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-medium text-xs"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(item)}
                      className="text-blue-500 hover:text-rose-600 p-0.5 rounded transition-colors"
                      title={`ลบ ${item}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* วันที่ปฏิบัติงาน (เลือกหลายวันในปฏิทินทีเดียวแล้วค่อยปิด) */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-blue-600" />
                  <span>วันที่ปฏิบัติงาน</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  คลิกปุ่มเปิดปฏิทินเพื่อกดเลือกหลายวันที่ต้องการต่อเนื่อง แล้วกดเสร็จสิ้นเพื่อตกลง
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCalendarModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition-all shrink-0"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>เปิดปฏิทินเลือกวันปฏิบัติงาน · เลือกแล้ว {subDays.length} วัน</span>
              </button>
            </div>

            {/* Single Unified Box for Selected Work Dates */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <span>รายการวันที่ปฏิบัติงานทั้งหมด {subDays.length} วัน</span>
                </div>
                {subDays.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const firstStart = subDays[0]?.startTime || '09:00';
                      const firstEnd = subDays[0]?.endTime || '12:00';
                      setSubDays((prev) =>
                        prev.map((d) => ({ ...d, startTime: firstStart, endTime: firstEnd }))
                      );
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    ใช้เวลาวันแรก {subDays[0]?.startTime}–{subDays[0]?.endTime} น. กับทุกวัน
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-600 border-b border-slate-200 text-[11px] font-semibold">
                      <th className="py-2 px-3 w-10 text-center">#</th>
                      <th className="py-2 px-3">รหัสย่อย</th>
                      <th className="py-2 px-3">วันที่ปฏิบัติงานจริง</th>
                      <th className="py-2 px-3">เวลาเริ่มดับไฟ</th>
                      <th className="py-2 px-3">เวลาคืนสภาพ</th>
                      <th className="py-2 px-3">สถานะวัน</th>
                      <th className="py-2 px-3 w-12 text-center">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subDays.map((day, idx) => {
                      const conflict = checkDayConflict(day);
                      return (
                        <React.Fragment key={day.tempId}>
                          <tr
                            className={`transition-colors ${
                              conflict
                                ? conflict.type === 'CRITICAL'
                                  ? 'bg-rose-50/60'
                                  : 'bg-amber-50/60'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold inline-flex items-center justify-center text-[11px]">
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                              {day.subId}
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="date"
                                value={day.workDate}
                                onChange={(e) => handleUpdateDayField(day.tempId, 'workDate', e.target.value)}
                                required
                                className="w-full min-w-[140px] bg-white border border-slate-300 rounded-md px-2.5 py-1 text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={day.startTime}
                                onChange={(e) => handleUpdateDayField(day.tempId, 'startTime', e.target.value)}
                                className="w-full min-w-[100px] bg-white border border-slate-300 rounded-md px-2 py-1 text-blue-700 font-mono font-bold focus:outline-none focus:border-blue-600"
                              >
                                {TIME_OPTIONS.map((t, tIdx) => (
                                  <option key={`start-${t}-${tIdx}`} value={t}>
                                    {t} น.
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={day.endTime}
                                onChange={(e) => handleUpdateDayField(day.tempId, 'endTime', e.target.value)}
                                className="w-full min-w-[100px] bg-white border border-slate-300 rounded-md px-2 py-1 text-blue-700 font-mono font-bold focus:outline-none focus:border-blue-600"
                              >
                                {TIME_OPTIONS.map((t, tIdx) => (
                                  <option key={`end-${t}-${tIdx}`} value={t}>
                                    {t} น.
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={day.dailyStatus}
                                onChange={(e) =>
                                  handleUpdateDayField(day.tempId, 'dailyStatus', e.target.value as DailyStatus)
                                }
                                className="w-full min-w-[110px] bg-white border border-slate-300 rounded-md px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-blue-600"
                              >
                                <option value="ปกติ">ปกติ</option>
                                <option value="เลื่อน">เลื่อน</option>
                                <option value="ยกเลิก">ยกเลิก</option>
                              </select>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {subDays.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDay(day.tempId)}
                                  className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                  title="ลบวันนี้ออก"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                          {conflict && (
                            <tr className="bg-rose-50/40">
                              <td colSpan={7} className="px-3 py-1.5">
                                <div
                                  className={`px-2.5 py-1.5 rounded-md text-[11px] flex items-center gap-2 ${
                                    conflict.type === 'CRITICAL'
                                      ? 'bg-rose-50 border border-rose-200 text-rose-800'
                                      : 'bg-amber-50 border border-amber-200 text-amber-800'
                                  }`}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                                  <span>
                                    <strong>{conflict.type === 'CRITICAL' ? 'Conflict วิกฤติ:' : 'คำเตือน:'}</strong>{' '}
                                    {conflict.message}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ส่วนที่ 2: รายละเอียดการปฏิบัติงาน */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            <Zap className="w-4 h-4 text-blue-600" />
            <span>2. รายละเอียดการปฏิบัติงาน</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* 1. รายละเอียดงาน */}
            <div className="sm:col-span-4">
              <label className="block text-slate-600 mb-1 font-medium">
                รายละเอียดงาน <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={mainDetail}
                onChange={(e) => setMainDetail(e.target.value)}
                required
                rows={2}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                placeholder="เช่น งานปรับปรุงระบบจำหน่าย 22 kV และเปลี่ยนเสาไฟแรงสูงชำรุดเพื่อเสริมความมั่นคงระบบไฟฟ้า"
              />
            </div>

            {/* 2. พื้นที่ดับไฟ */}
            <div className="sm:col-span-4">
              <label className="block text-slate-600 mb-1 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>พื้นที่ดับไฟ <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                value={workArea}
                onChange={(e) => setWorkArea(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                placeholder="เช่น ถนนชยางกูร กม.4-6 หน้ารพ.ราชเวช"
              />
            </div>

            {/* 3. ฟีดเดอร์ปฏิบัติงาน */}
            <div className="sm:col-span-4 space-y-2">
              <label className="block text-slate-600 font-medium">
                ฟีดเดอร์ปฏิบัติงาน <span className="text-slate-400">· เลือกรหัสสถานีและหมายเลขฟีดเดอร์แล้วกดเพิ่มได้หลายรายการ</span>
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <div className="col-span-2 relative">
                    <input
                      type="text"
                      list="substation-code-datalist"
                      value={subStation}
                      onChange={(e) => setSubStation(e.target.value.toUpperCase())}
                      placeholder="พิมพ์ค้นหา/เลือกสถานีไฟฟ้า..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-600"
                    />
                    <datalist id="substation-code-datalist">
                      {substationOptionsList.map((s, idx) => (
                        <option key={`${s.code}-${idx}`} value={s.code}>
                          {s.name}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <select
                      value={feederNum}
                      onChange={(e) => setFeederNum(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-600 text-center"
                    >
                      {feederNumOptionsList.map((n, idx) => (
                        <option key={`${n}-${idx}`} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddFeeder}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-2xs shrink-0"
                >
                  <ListPlus className="w-4 h-4" />
                  <span>เพิ่มฟีดเดอร์ ({subStation}{feederNum})</span>
                </button>
              </div>

              {/* List of Added Feeders */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {feedersList.map((f, idx) => (
                  <span
                    key={`${f}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 border border-slate-300 text-slate-900 font-mono font-bold text-xs"
                  >
                    <span>{f}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeeder(f)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                      title={`ลบฟีดเดอร์ ${f}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 4. โรงไฟฟ้า VSPP ที่เกี่ยวข้อง */}
            <div className="sm:col-span-2">
              <label className="block text-slate-600 mb-1 font-medium flex items-center justify-between">
                <span>โรงไฟฟ้า VSPP ที่เกี่ยวข้อง</span>
                <span className="text-[10px] text-blue-600 font-medium">ตรวจอัตโนมัติ</span>
              </label>
              <select
                value={vsppId}
                onChange={(e) => setVsppId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">- ไม่มี / ไม่กระทบ VSPP -</option>
                {vsppList.map((v, idx) => (
                  <option key={`${v.VSPP_ID}-${idx}`} value={v.VSPP_ID}>
                    {v.VSPP_ID} - {v.VSPP_Name} ({v.Feeder_Source})
                  </option>
                ))}
              </select>
            </div>

            {/* 5. ขอบเขตดับไฟ */}
            <div className="sm:col-span-4">
              <label className="block text-slate-600 mb-1.5 font-medium">
                ขอบเขตดับไฟ <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['สายส่ง/BAY 115 kV', 'TP/KT/BUS 22 kV', 'ระบบจำหน่าย'] as const).map((scopeOption) => {
                  const isSelected = feederScope === scopeOption;
                  return (
                    <button
                      key={scopeOption}
                      type="button"
                      onClick={() => setFeederScope(scopeOption)}
                      className={`px-4 py-2.5 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-600/20'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[2.5]" />}
                      <span>{scopeOption}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {autoVsppMatchedList.length > 0 && (
              <div className="sm:col-span-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <strong>ตรวจสอบ VSPP อัตโนมัติ:</strong> ตรวจพบโรงไฟฟ้า VSPP ในฟีดเดอร์ที่เลือก:
                  <ul className="list-disc list-inside mt-0.5 font-medium">
                    {autoVsppMatchedList.map((v, idx) => (
                      <li key={`${v.VSPP_ID}-${idx}`}>
                        {v.VSPP_Name} ({v.VSPP_ID} - ฟีดเดอร์ {v.Feeder_Source})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ส่วนที่ 3: การตรวจสอบ Switching */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>3. การตรวจสอบการสับเปลี่ยนสวิตช์</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* ผู้จัดทำ */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium flex items-center justify-between">
                <span>ผู้จัดทำ <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400">จากฐานข้อมูล</span>
              </label>
              <select
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">-- เลือกผู้จัดทำ --</option>
                {creatorOptions.map((name, idx) => (
                  <option key={`${name}-${idx}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* ผู้ตรวจสอบ */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium flex items-center justify-between">
                <span>ผู้ตรวจสอบ <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400">จากฐานข้อมูล</span>
              </label>
              <select
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">-- เลือกผู้ตรวจสอบ --</option>
                {inspectorOptions.map((name, idx) => (
                  <option key={`${name}-${idx}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* วันที่ตรวจสอบ */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>วันที่ตรวจสอบ</span>
              </label>
              <input
                type="date"
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* SLA P6 */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium flex items-center justify-between">
                <span>เกณฑ์การขอดับไฟล่วงหน้า P6</span>
                <span className="text-[10px] text-emerald-600 font-medium">คำนวณอัตโนมัติ</span>
              </label>
              <div
                className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${
                  calculatedSLA.isPass
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{calculatedSLA.text}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ส่วนที่ 4: ผลการอนุมัติดับไฟ */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>4. ผลการอนุมัติดับไฟ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* สถานะอนุมัติดับไฟ */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium">
                สถานะอนุมัติดับไฟ <span className="text-rose-500">*</span>
              </label>
              <select
                value={overallStatus}
                onChange={(e) => setOverallStatus(e.target.value as OverallStatus)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-blue-600"
              >
                <option value="รออนุมัติ">รออนุมัติ</option>
                <option value="อนุมัติ">อนุมัติ</option>
                <option value="เลื่อน">เลื่อน</option>
                <option value="ยกเลิก">ยกเลิก</option>
              </select>
            </div>

            {/* เลขที่อนุมัติ */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium">
                เลขที่อนุมัติ
              </label>
              <input
                type="text"
                value={approvalNo}
                onChange={(e) => setApprovalNo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                placeholder="ฉ.2 กปบ.(คฟ) "
              />
            </div>

            {/* อนุมัติลงวันที่ */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>อนุมัติลงวันที่</span>
              </label>
              <input
                type="date"
                value={approvalDate}
                onChange={(e) => setApprovalDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* ผู้ลงอนุมัติ */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium flex items-center justify-between">
                <span>ผู้ลงอนุมัติ</span>
                <span className="text-[10px] text-slate-400">จากฐานข้อมูล</span>
              </label>
              <select
                value={approverReceiver}
                onChange={(e) => setApproverReceiver(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">-- เลือกผู้ลงอนุมัติ --</option>
                {approverOptions.map((name, idx) => (
                  <option key={`${name}-${idx}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* หมายเหตุเพิ่มเติม */}
            <div className="sm:col-span-4">
              <label className="block text-slate-600 mb-1 font-medium">หมายเหตุเพิ่มเติม</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                placeholder="เช่น ประสานงานปลดสวิตช์ VSPP เรียบร้อย, ใช้ชุดเครื่องกำเนิดไฟฟ้าสำรอง"
              />
            </div>
          </div>
        </div>

        {/* Form Bottom Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
          >
            ยกเลิกและย้อนกลับ
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'กำลังบันทึกลงระบบ...' : 'บันทึกแผนงานทั้งหมด'}</span>
          </button>
        </div>
      </form>

      {/* INTERACTIVE MULTI-DATE SELECTION CALENDAR MODAL */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col space-y-0">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <span>ปฏิทินเลือกวันปฏิบัติงาน</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCalendarModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Month & Year Navigation Bar */}
            <div className="p-3 bg-white flex items-center justify-between border-b border-slate-100 text-xs font-bold text-slate-800">
              <button
                type="button"
                onClick={() =>
                  setCalendarViewDate(
                    new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1)
                  )
                }
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-blue-700 text-sm font-bold tracking-wide">
                {THAI_MONTHS[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear() + 543}
              </div>

              <button
                type="button"
                onClick={() =>
                  setCalendarViewDate(
                    new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1)
                  )
                }
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Grid Body */}
            <div className="p-4 space-y-2">
              <div className="text-[11px] text-slate-500 text-center pb-1">
                คลิก/แตะวันที่ในตารางเพื่อสลับการเลือก (สามารถกดเลือกหลายวันได้ต่อเนื่อง)
              </div>

              {/* Day Name Header */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-500 pb-1 border-b border-slate-100">
                <div className="text-rose-600">อา</div>
                <div>จ</div>
                <div>อ</div>
                <div>พ</div>
                <div>พฤ</div>
                <div>ศ</div>
                <div className="text-blue-600">ส</div>
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {calendarGridDays.map((item, idx) => {
                  const isSelected = subDays.some((d) => d.workDate === item.dateStr);

                  return (
                    <button
                      key={`${item.dateStr}-${idx}`}
                      type="button"
                      onClick={() => handleToggleDateInCalendar(item.dateStr)}
                      className={`h-10 rounded-lg flex flex-col items-center justify-center text-xs transition-all relative ${
                        !item.isCurrentMonth
                          ? 'opacity-35 text-slate-400 hover:opacity-65'
                          : isSelected
                          ? 'bg-blue-600 text-white font-bold shadow-sm ring-2 ring-blue-600/30 scale-105 z-10'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                      }`}
                    >
                      <span className="leading-none">{item.dayNum}</span>
                      {isSelected && (
                        <Check className="w-3 h-3 text-white stroke-[3] mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer Bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <div className="text-xs text-slate-600 font-medium">
                เลือกแล้ว <strong className="text-blue-700 font-bold font-mono text-sm">{subDays.length}</strong> วัน
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCalendarModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>เสร็จสิ้น / ยืนยันการเลือก</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
