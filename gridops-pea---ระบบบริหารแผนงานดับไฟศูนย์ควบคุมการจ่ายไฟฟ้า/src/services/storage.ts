import { TaskItem, VSPPMaster, PEAMaster, PersonnelMaster, SubstationMaster, FeederNoMaster } from '../types/grid';

const STORAGE_KEYS = {
  TASKS: 'gridops_tasks_data',
  VSPP: 'gridops_vspp_data',
  PEA: 'gridops_pea_data',
  PERSONNEL: 'gridops_personnel_data',
  SUBSTATION: 'gridops_substation_data',
  FEEDER_NO: 'gridops_feeder_no_data',
  GAS_URL: 'gridops_gas_url',
  ROLE: 'gridops_user_role',
};

// Initial realistic seed personnel data for Thailand PEA Dispatching Center NE2
const INITIAL_PERSONNEL_MASTER: PersonnelMaster[] = [
  // Creators (ผู้จัดทำ)
  { id: 'P-CR-01', name: 'นายสมชาย มั่นคง (ช่างเทคนิค 6)', role: 'creator', position: 'ช่างเทคนิค 6 แผนกควบคุมระบบไฟฟ้า' },
  { id: 'P-CR-02', name: 'นายชาญชัย มีสุข (ช่างชำนาญการ)', role: 'creator', position: 'ช่างชำนาญการ' },
  { id: 'P-CR-03', name: 'นายนิคม รักษาดี (พนักงาน กฟฟ.)', role: 'creator', position: 'พนักงาน กฟฟ.' },
  { id: 'P-CR-04', name: 'นายประวิทย์ มั่งมี (วศก.5)', role: 'creator', position: 'วิศวกร 5' },
  { id: 'P-CR-05', name: 'นายเอกชัย ชัยชนะ (ช่างเทคนิค 5)', role: 'creator', position: 'ช่างเทคนิค 5' },

  // Inspectors (ผู้ตรวจสอบ)
  { id: 'P-IN-01', name: 'นายวิศวกร ชำนาญงาน (วศก.7)', role: 'inspector', position: 'วิศวกร 7 แผนกควบคุมระบบไฟฟ้า' },
  { id: 'P-IN-02', name: 'นายธีระยุทธ ตรวจสอบ (วศก.6)', role: 'inspector', position: 'วิศวกร 6' },
  { id: 'P-IN-03', name: 'นายช่างใหญ่ คุมงาน (ชฟ.7)', role: 'inspector', position: 'ช่างไฟฟ้า 7' },
  { id: 'P-IN-04', name: 'นายณรงค์ ศรีสุข (หน.แผนก)', role: 'inspector', position: 'หัวหน้าแผนกปฏิบัติการ' },
  { id: 'P-IN-05', name: 'นายวิชัย สุวรรณ (วศก.8)', role: 'inspector', position: 'วิศวกร 8' },

  // Receivers (ผู้ลงรับ)
  { id: 'P-RC-01', name: 'นายสมศักดิ์ รับเรื่อง (หน.ผสป.)', role: 'receiver', position: 'หัวหน้าแผนกประสานงาน' },
  { id: 'P-RC-02', name: 'นางสาวสุดา รับเรื่อง (พนักงาน กฟฟ.)', role: 'receiver', position: 'พนักงานประสานงาน' },
  { id: 'P-RC-03', name: 'นางรุ่งทิพย์ ลงรับ (พนักงาน กฟฟ.)', role: 'receiver', position: 'พนักงานรับเรื่อง' },
  { id: 'P-RC-04', name: 'นายนคร ลงรับ (พนักงาน กฟฟ.)', role: 'receiver', position: 'เจ้าหน้าที่ลงรับระบบ' },

  // Approvers (ผู้ลงอนุมัติ)
  { id: 'P-AP-01', name: 'นายวีระ ผู้อนุมัติ (ผจก.กฟฟ.อ.เมืองอุบลราชธานี)', role: 'approver', position: 'ผู้จัดการ กฟฟ.อ.เมืองอุบลราชธานี' },
  { id: 'P-AP-02', name: 'นายไพโรจน์ ผจก.กฟฟ.อ.วารินชำราบ', role: 'approver', position: 'ผู้จัดการ กฟฟ.อ.วารินชำราบ' },
  { id: 'P-AP-03', name: 'นายประเสริฐ ผจก.กฟฟ.อ.เดชอุดม', role: 'approver', position: 'ผู้จัดการ กฟฟ.อ.เดชอุดม' },
  { id: 'P-AP-04', name: 'นายสมศักดิ์ ผจก.กฟฟ.อ.เขมราฐ', role: 'approver', position: 'ผู้จัดการ กฟฟ.อ.เขมราฐ' },
];

/**
 * Calculate SLA advance notice working days excluding weekends (Sat/Sun).
 * SLA P6 Standard threshold is >= 3 working days.
 */
export function calculateP6SLA(docDateStr: string, firstWorkDateStr: string): { days: number; isPass: boolean; text: string } {
  if (!docDateStr || !firstWorkDateStr) {
    return { days: 0, isPass: false, text: 'ยังไม่ได้เลือกวันลงหนังสือหรือวันปฏิบัติงาน' };
  }
  const start = new Date(docDateStr);
  const end = new Date(firstWorkDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { days: 0, isPass: false, text: 'รูปแบบวันที่ไม่ถูกต้อง' };
  }
  if (end < start) {
    return { days: 0, isPass: false, text: 'วันทำงานเริ่มก่อนวันลงหนังสือขอดับไฟ' };
  }

  let count = 0;
  const current = new Date(start);
  current.setDate(current.getDate() + 1); // Exclude the doc date itself
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sun (0) or Sat (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  const isPass = count >= 7;
  const text = isPass
    ? `เข้าหลักเกณฑ์ (7 วันทำการ) — ล่วงหน้า ${count} วันทำการ`
    : `ไม่เข้าหลักเกณฑ์ (7 วันทำการ) — ล่วงหน้า ${count} วันทำการ`;
  return { days: count, isPass, text };
}

// Initial realistic seed data for Thailand PEA Grid Control Center
const INITIAL_PEA_MASTER: PEAMaster[] = [
  {
    PEA_ID: 'PEA-UBN-01',
    PEA_Short: 'กฟฟ.อ.เมืองอุบลราชธานี',
    PEA_Full: 'การไฟฟ้าส่วนภูมิภาคอำเภอเมืองอุบลราชธานี',
    Region_Dept: 'กฟฉ.2',
    Executive_Title: 'ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอเมืองอุบลราชธานี',
  },
  {
    PEA_ID: 'PEA-WRN-01',
    PEA_Short: 'กฟฟ.อ.วารินชำราบ',
    PEA_Full: 'การไฟฟ้าส่วนภูมิภาคอำเภอวารินชำราบ',
    Region_Dept: 'กฟฉ.2',
    Executive_Title: 'ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอวารินชำราบ',
  },
  {
    PEA_ID: 'PEA-DET-01',
    PEA_Short: 'กฟฟ.อ.เดชอุดม',
    PEA_Full: 'การไฟฟ้าส่วนภูมิภาคอำเภอเดชอุดม',
    Region_Dept: 'กฟฉ.2',
    Executive_Title: 'ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอเดชอุดม',
  },
  {
    PEA_ID: 'PEA-KMR-01',
    PEA_Short: 'กฟฟ.อ.เขมราฐ',
    PEA_Full: 'การไฟฟ้าส่วนภูมิภาคอำเภอเขมราฐ',
    Region_Dept: 'กฟฉ.2',
    Executive_Title: 'ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอเขมราฐ',
  },
  {
    PEA_ID: 'PEA-TRA-01',
    PEA_Short: 'กฟฟ.อ.ตระการพืชผล',
    PEA_Full: 'การไฟฟ้าส่วนภูมิภาคอำเภอตระการพืชผล',
    Region_Dept: 'กฟฉ.2',
    Executive_Title: 'ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอตระการพืชผล',
  },
  {
    PEA_ID: 'PEA-PBN-01',
    PEA_Short: 'กฟฟ.อ.พิบูลมังสาหาร',
    PEA_Full: 'การไฟฟ้าส่วนภูมิภาคอำเภอพิบูลมังสาหาร',
    Region_Dept: 'กฟฉ.2',
    Executive_Title: 'ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอพิบูลมังสาหาร',
  },
];

const INITIAL_VSPP_MASTER: VSPPMaster[] = [
  {
    VSPP_ID: 'VSPP-MP01',
    VSPP_Name: 'บริษัท มิตรผล ไบโอเพาเวอร์ จำกัด (กุฉินารายณ์) (โครงการ 1)',
    Feeder_Source: 'KCN02',
    Switch_Equipment: '52PEA-H1',
    To_Position: 'ผู้จัดการอาวุโส ฝ่ายผลิตไฟฟ้า',
  },
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
    Switch_Equipment: '52PEA-H2',
    To_Position: 'ผู้จัดการอาวุโส ฝ่ายผลิตไฟฟ้า',
  },
  {
    VSPP_ID: 'VSPP-UB03',
    VSPP_Name: 'บริษัท เดชอุดม กรีนเพาเวอร์ จำกัด (6 MW)',
    Feeder_Source: 'DET02',
    Switch_Equipment: '52PEA-H1',
    To_Position: 'ผู้จัดการอาวุโส ฝ่ายผลิตไฟฟ้า',
  },
  {
    VSPP_ID: 'VSPP-UB04',
    VSPP_Name: 'บริษัท บัวงาม พลังงานสะอาด จำกัด (4.5 MW)',
    Feeder_Source: 'DET06',
    Switch_Equipment: '52PEA-H1',
    To_Position: 'ผู้จัดการอาวุโส ฝ่ายผลิตไฟฟ้า',
  },
  {
    VSPP_ID: 'VSPP-UB05',
    VSPP_Name: 'บริษัท พิบูล โซลาร์ฟาร์ม จำกัด (5 MW)',
    Feeder_Source: 'PBN02',
    Switch_Equipment: '52PEA-H1',
    To_Position: 'ผู้จัดการอาวุโส ฝ่ายผลิตไฟฟ้า',
  },
];

const INITIAL_SUBSTATION_MASTER: SubstationMaster[] = [
  { Substation_Code: 'UBN', Substation_Name: 'สถานีฯ อุบลราชธานี 1 (UBN)' },
  { Substation_Code: 'WRN', Substation_Name: 'สถานีฯ วารินชำราบ (WRN)' },
  { Substation_Code: 'DET', Substation_Name: 'สถานีฯ เดชอุดม (DET)' },
  { Substation_Code: 'KMR', Substation_Name: 'สถานีฯ เขมราฐ (KMR)' },
  { Substation_Code: 'PBN', Substation_Name: 'สถานีฯ พิบูลมังสาหาร (PBN)' },
  { Substation_Code: 'TRA', Substation_Name: 'สถานีฯ ตระการพืชผล (TRA)' },
  { Substation_Code: 'WRA', Substation_Name: 'สถานีฯ วารินชำราบ 2 (WRA)' },
  { Substation_Code: 'KCN', Substation_Name: 'สถานีฯ กุฉินารายณ์ (KCN)' },
  { Substation_Code: 'KNT', Substation_Name: 'สถานีฯ เขื่องใน (KNT)' },
  { Substation_Code: 'SSN', Substation_Name: 'สถานีฯ สิรินธร (SSN)' },
  { Substation_Code: 'MNA', Substation_Name: 'สถานีฯ ม่วงสามสิบ (MNA)' },
  { Substation_Code: 'TCH', Substation_Name: 'สถานีฯ ตระการฯ 2 (TCH)' },
];

const INITIAL_FEEDER_NO_MASTER: FeederNoMaster[] = [
  { Feeder_No: '01' },
  { Feeder_No: '02' },
  { Feeder_No: '03' },
  { Feeder_No: '04' },
  { Feeder_No: '05' },
  { Feeder_No: '06' },
  { Feeder_No: '07' },
  { Feeder_No: '08' },
  { Feeder_No: '09' },
  { Feeder_No: '10' },
  { Feeder_No: '11' },
  { Feeder_No: '12' },
];

export function getTodayDateString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const INITIAL_TASKS: TaskItem[] = [
  // Job 1: Multi-day (Day 1: Today)
  {
    Sub_ID: 'JOB-2026-001-01',
    Job_ID: 'JOB-2026-001',
    PEA_Request: 'กฟฟ.อ.เมืองอุบลราชธานี',
    VSPP_ID: 'VSPP-UB01',
    Doc_No: 'มท 5304.12/1042',
    Doc_Date: getTodayDateString(-3),
    Approval_No: 'อน. 2569/084',
    Approval_Date: getTodayDateString(-2),
    Work_Date: getTodayDateString(0),
    Start_Time: '09:00',
    End_Time: '12:00',
    Main_Detail: 'งานปรับปรุงระบบจำหน่าย 22 kV และเปลี่ยนเสาไฟแรงสูงชำรุด',
    Custom_Detail: 'ตัดแยกวงจรฟีดเดอร์ UBN01 ช่วงหน้าสถานีไฟฟ้าอุบล 1 เพื่อพาดสาย Overhead Spacer Cable และปักเสาคอนกรีตขนาด 14 เมตร 3 ต้น',
    Work_Area: 'ถนนชยางกูร กม.4-6 หน้ารพ.ราชเวช',
    Feeder: 'UBN01',
    Feeder_Scope: 'ระบบจำหน่าย TP/KT/BUS 22 kV',
    Creator: 'นายสมชาย มั่นคง (ช่างเทคนิค 6)',
    Inspector: 'นายวิศวกร ชำนาญงาน (วศก.7)',
    Check_Date: getTodayDateString(-2),
    SLA: 'ตามเกณฑ์ SLA (ล่วงหน้า 3 วัน)',
    Receiver: 'นายสมศักดิ์ รับเรื่อง (หน.ผสป.)',
    Approver_Receiver: 'นายวีระ ผู้อนุมัติ (ผจก.)',
    Overall_Status: 'อนุมัติ',
    Daily_Status: 'ปกติ',
    Note: 'ประสาน รฟ. อุบล โซลาร์ เพาเวอร์ (VSPP-UB01) ปลดขนานและเปิดสวิตช์ REC-01 เรียบร้อย',
  },
  // Job 1: Day 2 (Tomorrow)
  {
    Sub_ID: 'JOB-2026-001-02',
    Job_ID: 'JOB-2026-001',
    PEA_Request: 'กฟฟ.อ.เมืองอุบลราชธานี',
    VSPP_ID: 'VSPP-UB01',
    Doc_No: 'มท 5304.12/1042',
    Doc_Date: getTodayDateString(-3),
    Approval_No: 'อน. 2569/084',
    Approval_Date: getTodayDateString(-2),
    Work_Date: getTodayDateString(1),
    Start_Time: '13:00',
    End_Time: '16:30',
    Main_Detail: 'งานปรับปรุงระบบจำหน่าย 22 kV และเปลี่ยนเสาไฟแรงสูงชำรุด',
    Custom_Detail: 'ติดตั้งหม้อแปลงจำหน่ายลูกใหม่ขนาด 250 kVA และเชื่อมต่อระบบกราวด์ระบบจำหน่าย',
    Work_Area: 'ถนนชยางกูร ซอยสุขาบูรพา 3',
    Feeder: 'UBN01',
    Feeder_Scope: 'ระบบจำหน่าย TP/KT/BUS 22 kV',
    Creator: 'นายสมชาย มั่นคง (ช่างเทคนิค 6)',
    Inspector: 'นายวิศวกร ชำนาญงาน (วศก.7)',
    Check_Date: getTodayDateString(-2),
    SLA: 'ตามเกณฑ์ SLA (ล่วงหน้า 3 วัน)',
    Receiver: 'นายสมศักดิ์ รับเรื่อง (หน.ผสป.)',
    Approver_Receiver: 'นายวีระ ผู้อนุมัติ (ผจก.)',
    Overall_Status: 'อนุมัติ',
    Daily_Status: 'ปกติ',
    Note: 'งานต่อเนื่องวันที่ 2 ดำเนินการเฉพาะช่วงบ่าย',
  },
  // Job 2: Deliberate Conflict on Today (UBN01 at 10:00-14:00) to demonstrate automatic conflict engine
  {
    Sub_ID: 'JOB-2026-002-01',
    Job_ID: 'JOB-2026-002',
    PEA_Request: 'กฟฟ.อ.เมืองอุบลราชธานี',
    VSPP_ID: '',
    Doc_No: 'มท 5304.12/1088',
    Doc_Date: getTodayDateString(-1),
    Approval_No: 'อน. 2569/091',
    Approval_Date: getTodayDateString(-1),
    Work_Date: getTodayDateString(0),
    Start_Time: '10:00',
    End_Time: '14:00',
    Main_Detail: 'งานบำรุงรักษาเชิงป้องกัน (PM) ติดตั้ง Lightning Arrester',
    Custom_Detail: 'ตัดตอนสวิตช์แรงสูงเพื่อติดตั้งชุดดักฟ้าผ่าและตรวจเช็คฉนวนสาย 22 kV',
    Work_Area: 'สี่แยกดงอู่ผึ้ง ถนนแจ้งสนิท',
    Feeder: 'UBN01',
    Feeder_Scope: 'สายส่ง/BAY 115 kV',
    Creator: 'นายชาญชัย มีสุข (ช่างชำนาญการ)',
    Inspector: 'นายธีระยุทธ ตรวจสอบ (วศก.6)',
    Check_Date: getTodayDateString(-1),
    SLA: 'เร่งด่วน',
    Receiver: 'นายสมศักดิ์ รับเรื่อง (หน.ผสป.)',
    Approver_Receiver: 'นายวีระ ผู้อนุมัติ (ผจก.)',
    Overall_Status: 'รออนุมัติ',
    Daily_Status: 'ปกติ',
    Note: 'แจ้งเตือน: ช่วงเวลา 10:00-12:00 น. ซ้อนทับกับ JOB-2026-001-01 ในฟีดเดอร์ UBN01',
  },
  // Job 3: Warin Chamrap with VSPP biomass plant
  {
    Sub_ID: 'JOB-2026-003-01',
    Job_ID: 'JOB-2026-003',
    PEA_Request: 'กฟฟ.อ.วารินชำราบ',
    VSPP_ID: 'VSPP-UB02',
    Doc_No: 'มท 5304.14/0521',
    Doc_Date: getTodayDateString(-4),
    Approval_No: 'อน. 2569/079',
    Approval_Date: getTodayDateString(-3),
    Work_Date: getTodayDateString(2),
    Start_Time: '08:30',
    End_Time: '15:30',
    Main_Detail: 'งานตัดแต่งกิ่งไม้ใกล้แนวสายส่งและระบบจำหน่าย 22 kV เพื่อลดทริปช่วงมรสุม',
    Custom_Detail: 'ตัดกิ่งไม้ใหญ่คร่อมสายแรงสูงตลอดแนวทางหลวง 24 พร้อมทำความสะอาดลูกถ้วยฉนวน',
    Work_Area: 'ถนนสถลมาร์ค ตั้งแต่ บิ๊กซีวาริน ถึง สี่แยกบายพาส',
    Feeder: 'WRN04',
    Feeder_Scope: 'ระบบจำหน่าย TP/KT/BUS 22 kV',
    Creator: 'นายนิคม รักษาดี (พนักงาน กฟฟ.)',
    Inspector: 'นายช่างใหญ่ คุมงาน (ชฟ.7)',
    Check_Date: getTodayDateString(-3),
    SLA: 'ตามเกณฑ์ SLA (ล่วงหน้า 3 วัน)',
    Receiver: 'นางสาวสุดา รับเรื่อง',
    Approver_Receiver: 'นายไพโรจน์ ผจก.วารินฯ',
    Overall_Status: 'อนุมัติ',
    Daily_Status: 'ปกติ',
    Note: 'ประสานโรงไฟฟ้า วาริน ไบโอแมส (VSPP-UB02) ปลดขนานสวิตช์ ABS-04',
  },
  // Job 4: Det Udom
  {
    Sub_ID: 'JOB-2026-004-01',
    Job_ID: 'JOB-2026-004',
    PEA_Request: 'กฟฟ.อ.เดชอุดม',
    VSPP_ID: 'VSPP-UB03',
    Doc_No: 'มท 5304.16/0312',
    Doc_Date: getTodayDateString(-5),
    Approval_No: 'อน. 2569/065',
    Approval_Date: getTodayDateString(-4),
    Work_Date: getTodayDateString(4),
    Start_Time: '09:00',
    End_Time: '16:00',
    Main_Detail: 'งานเชื่อมต่อระบบโครงข่ายรองรับผู้ใช้ไฟฟ้ารายใหญ่และทดสอบรีเลย์ป้องกัน',
    Custom_Detail: 'เชื่อมต่อสายเคเบิลใต้ดินเข้ากับสวิตช์เกียร์ RMU ชุดใหม่ และทดสอบการทำงานของรีเลย์',
    Work_Area: 'นิคมอุตสาหกรรมแปรรูปการเกษตร เดชอุดม',
    Feeder: 'DET02',
    Feeder_Scope: 'ตั้งแต่ REC-03 ถึงสถานีย่อยเดชอุดม 1',
    Creator: 'นายประวิทย์ มั่งมี (วศก.5)',
    Inspector: 'นายณรงค์ ศรีสุข (หน.แผนก)',
    Check_Date: getTodayDateString(-4),
    SLA: 'ตามเกณฑ์ SLA (ล่วงหน้า 5 วัน)',
    Receiver: 'นางรุ่งทิพย์ ลงรับ',
    Approver_Receiver: 'นายประเสริฐ ผจก.',
    Overall_Status: 'อนุมัติ',
    Daily_Status: 'ปกติ',
    Note: 'โรงไฟฟ้า VSPP-UB03 หยุดจ่ายไฟตามแผนบำรุงรักษาประจำปี',
  },
  // Job 5: Khemarat
  {
    Sub_ID: 'JOB-2026-005-01',
    Job_ID: 'JOB-2026-005',
    PEA_Request: 'กฟฟ.อ.เขมราฐ',
    VSPP_ID: '',
    Doc_No: 'มท 5304.18/0199',
    Doc_Date: getTodayDateString(-2),
    Approval_No: '',
    Approval_Date: '',
    Work_Date: getTodayDateString(6),
    Start_Time: '08:00',
    End_Time: '12:00',
    Main_Detail: 'งานพาดสายระบบส่งไฟฟ้าเชื่อมต่อแนวชายแดน',
    Custom_Detail: 'ดึงสายแรงดัน 22 kV ข้ามลำน้ำสาขาและติดตั้ง Cross-arm เหล็กชุบกัลวาไนซ์',
    Work_Area: 'บ้านนาแวง ต.เขมราฐ ริมแม่น้ำโขง',
    Feeder: 'KMR01',
    Feeder_Scope: 'ตั้งแต่ จุดตัด ม.3 ถึง ด่านชายแดน',
    Creator: 'นายเอกชัย ชัยชนะ',
    Inspector: 'นายวิชัย สุวรรณ',
    Check_Date: getTodayDateString(-1),
    SLA: 'รอพิจารณา',
    Receiver: 'นายนคร ลงรับ',
    Approver_Receiver: '',
    Overall_Status: 'รออนุมัติ',
    Daily_Status: 'ปกติ',
    Note: 'อยู่ระหว่างขออนุญาตใช้พื้นที่ร่วมกับหน่วยงานทางหลวงชนบท',
  },
];

// Helper: load from localStorage
export function loadFromLocal<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading ${key} from storage:`, err);
    return defaultValue;
  }
}

// Helper: save to localStorage
export function saveToLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

// Helper: normalize time string (handles HH:mm, 1899-12-30 ISO strings, or corrupted 1899-12-30)
export function normalizeTimeValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Already HH:mm or HH:mm:ss
  const hmMatch = str.match(/^(\d{1,2}):(\d{2})/);
  if (hmMatch) {
    return `${hmMatch[1].padStart(2, '0')}:${hmMatch[2]}`;
  }

  // ISO timestamp from Google Sheets 1899-12-30T...
  if (str.includes('1899-12-30T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }

  // Date-only 1899-12-30 (when GAS formatted time-only Date as yyyy-MM-dd)
  if (str === '1899-12-30') {
    return '--:--';
  }

  return str;
}

export const StorageService = {
  // Config
  getGasUrl(): string {
    return localStorage.getItem(STORAGE_KEYS.GAS_URL) || '';
  },

  setGasUrl(url: string): void {
    localStorage.setItem(STORAGE_KEYS.GAS_URL, url.trim());
  },

  getUserRole(): 'admin' | 'viewer' {
    return (localStorage.getItem(STORAGE_KEYS.ROLE) as 'admin' | 'viewer') || 'admin';
  },

  setUserRole(role: 'admin' | 'viewer'): void {
    localStorage.setItem(STORAGE_KEYS.ROLE, role);
  },

  // Read all data (Local + Optional Cloud Sync)
  getTasks(): TaskItem[] {
    const raw = loadFromLocal<TaskItem[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    return raw.map((t) => ({
      ...t,
      Start_Time: normalizeTimeValue(t.Start_Time),
      End_Time: normalizeTimeValue(t.End_Time),
    }));
  },

  getVSPPMaster(): VSPPMaster[] {
    return loadFromLocal<VSPPMaster[]>(STORAGE_KEYS.VSPP, INITIAL_VSPP_MASTER);
  },

  getPEAMaster(): PEAMaster[] {
    return loadFromLocal<PEAMaster[]>(STORAGE_KEYS.PEA, INITIAL_PEA_MASTER);
  },

  getPersonnelMaster(): PersonnelMaster[] {
    return loadFromLocal<PersonnelMaster[]>(STORAGE_KEYS.PERSONNEL, INITIAL_PERSONNEL_MASTER);
  },

  getSubstationMaster(): SubstationMaster[] {
    return loadFromLocal<SubstationMaster[]>(STORAGE_KEYS.SUBSTATION, INITIAL_SUBSTATION_MASTER);
  },

  getFeederNoMaster(): FeederNoMaster[] {
    return loadFromLocal<FeederNoMaster[]>(STORAGE_KEYS.FEEDER_NO, INITIAL_FEEDER_NO_MASTER);
  },

  // Save to Local
  saveTasks(tasks: TaskItem[]): void {
    saveToLocal(STORAGE_KEYS.TASKS, tasks);
  },

  saveVSPPMaster(vspp: VSPPMaster[]): void {
    saveToLocal(STORAGE_KEYS.VSPP, vspp);
  },

  saveVSPPMasterBatch(items: VSPPMaster[]): VSPPMaster[] {
    const current = this.getVSPPMaster();
    const map = new Map<string, VSPPMaster>();
    current.forEach((v) => map.set(v.VSPP_ID, v));
    items.forEach((item) => {
      if (item.VSPP_ID) {
        map.set(item.VSPP_ID, item);
      }
    });
    const updated = Array.from(map.values());
    this.saveVSPPMaster(updated);
    return updated;
  },

  savePEAMaster(pea: PEAMaster[]): void {
    saveToLocal(STORAGE_KEYS.PEA, pea);
  },

  savePEAMasterBatch(items: PEAMaster[]): PEAMaster[] {
    const current = this.getPEAMaster();
    const map = new Map<string, PEAMaster>();
    current.forEach((p) => map.set(p.PEA_ID, p));
    items.forEach((item) => {
      if (item.PEA_ID) {
        map.set(item.PEA_ID, item);
      }
    });
    const updated = Array.from(map.values());
    this.savePEAMaster(updated);
    return updated;
  },

  savePersonnelMaster(personnel: PersonnelMaster[]): void {
    saveToLocal(STORAGE_KEYS.PERSONNEL, personnel);
  },

  savePersonnelMasterBatch(items: PersonnelMaster[]): PersonnelMaster[] {
    const current = this.getPersonnelMaster();
    const map = new Map<string, PersonnelMaster>();
    current.forEach((p) => map.set(p.id, p));
    items.forEach((item) => {
      if (item.id && item.name) {
        map.set(item.id, item);
      }
    });
    const updated = Array.from(map.values());
    this.savePersonnelMaster(updated);
    return updated;
  },

  saveSubstationMaster(list: SubstationMaster[]): void {
    saveToLocal(STORAGE_KEYS.SUBSTATION, list);
  },

  saveSubstationMasterBatch(items: SubstationMaster[]): SubstationMaster[] {
    const current = this.getSubstationMaster();
    const map = new Map<string, SubstationMaster>();
    current.forEach((s) => map.set(s.Substation_Code, s));
    items.forEach((item) => {
      if (item.Substation_Code) {
        const code = item.Substation_Code.trim().toUpperCase();
        map.set(code, {
          Substation_Code: code,
          Substation_Name: (item.Substation_Name || code).trim(),
        });
      }
    });
    const updated = Array.from(map.values());
    this.saveSubstationMaster(updated);
    return updated;
  },

  saveFeederNoMaster(list: FeederNoMaster[]): void {
    saveToLocal(STORAGE_KEYS.FEEDER_NO, list);
  },

  saveFeederNoMasterBatch(items: FeederNoMaster[]): FeederNoMaster[] {
    const current = this.getFeederNoMaster();
    const map = new Map<string, FeederNoMaster>();
    current.forEach((f) => map.set(f.Feeder_No, f));
    items.forEach((item) => {
      if (item.Feeder_No) {
        const num = item.Feeder_No.trim().padStart(2, '0');
        map.set(num, { Feeder_No: num });
      }
    });
    const updated = Array.from(map.values()).sort((a, b) => a.Feeder_No.localeCompare(b.Feeder_No));
    this.saveFeederNoMaster(updated);
    return updated;
  },

  // Reset to initial realistic demo data
  resetToDemo(): void {
    saveToLocal(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    saveToLocal(STORAGE_KEYS.VSPP, INITIAL_VSPP_MASTER);
    saveToLocal(STORAGE_KEYS.PEA, INITIAL_PEA_MASTER);
    saveToLocal(STORAGE_KEYS.PERSONNEL, INITIAL_PERSONNEL_MASTER);
    saveToLocal(STORAGE_KEYS.SUBSTATION, INITIAL_SUBSTATION_MASTER);
    saveToLocal(STORAGE_KEYS.FEEDER_NO, INITIAL_FEEDER_NO_MASTER);
  },

  // Test GAS connection
  async testGasConnection(url?: string): Promise<{ success: boolean; message: string }> {
    const targetUrl = (url || this.getGasUrl()).trim();
    if (!targetUrl) {
      return { success: false, message: 'ยังไม่ได้ระบุ Google Apps Script Web App URL' };
    }

    try {
      const pingUrl = targetUrl.includes('?')
        ? `${targetUrl}&action=check_connection`
        : `${targetUrl}?action=check_connection`;

      const res = await fetch(pingUrl, {
        method: 'GET',
        mode: 'cors',
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const data = await res.json();
      if (data && data.success) {
        return {
          success: true,
          message: data.message || 'เชื่อมต่อ Google Apps Script สำเร็จ พร้อมใช้งาน!',
        };
      } else {
        return {
          success: false,
          message: data.error || 'การเชื่อมต่อถูกปฏิเสธจาก Google Apps Script',
        };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `ไม่สามารถเชื่อมต่อได้: ${errMsg} (โปรดตรวจสอบการตั้งค่า Deploy Web App ให้สิทธิ์ "Anyone")`,
      };
    }
  },

  // Sync from Google Apps Script to Local
  async syncFromGas(): Promise<{ success: boolean; message: string; count?: number }> {
    const gasUrl = this.getGasUrl().trim();
    if (!gasUrl) {
      return { success: false, message: 'ยังไม่ได้ระบุ Google Apps Script Web App URL' };
    }

    try {
      const fetchUrl = gasUrl.includes('?')
        ? `${gasUrl}&action=get_all`
        : `${gasUrl}?action=get_all`;

      const res = await fetch(fetchUrl, {
        method: 'GET',
        mode: 'cors',
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const data = await res.json();
      if (data && data.success) {
        if (Array.isArray(data.tasks)) {
          const normalizedTasks: TaskItem[] = data.tasks.map((t: TaskItem) => ({
            ...t,
            Start_Time: normalizeTimeValue(t.Start_Time),
            End_Time: normalizeTimeValue(t.End_Time),
          }));
          this.saveTasks(normalizedTasks);
        }
        if (Array.isArray(data.vspp)) {
          const normalizedVspp: VSPPMaster[] = data.vspp
            .map((v: Record<string, unknown>) => ({
              VSPP_ID: String(v.VSPP_ID || '').trim().toUpperCase(),
              VSPP_Name: String(v.VSPP_Name || '').trim(),
              Feeder_Source: String(v.Feeder_Source || '').trim().toUpperCase(),
              Switch_Equipment: String(v.Switch_Equipment || '').trim(),
              To_Position: String(v.To_Position || '').trim(),
            }))
            .filter((v: VSPPMaster) => v.VSPP_ID || v.VSPP_Name);
          this.saveVSPPMaster(normalizedVspp);
        }
        if (Array.isArray(data.pea)) {
          const normalizedPea: PEAMaster[] = data.pea
            .map((p: Record<string, unknown>) => ({
              PEA_ID: String(p.PEA_ID || '').trim().toUpperCase(),
              PEA_Short: String(p.PEA_Short || '').trim(),
              PEA_Full: String(p.PEA_Full || p.PEA_Short || '').trim(),
              Region_Dept: String(p.Region_Dept || 'กฟฉ.2').trim(),
              Executive_Title: String(p.Executive_Title || '').trim(),
            }))
            .filter((p: PEAMaster) => p.PEA_ID || p.PEA_Short);
          this.savePEAMaster(normalizedPea);
        }
        if (Array.isArray(data.personnel)) {
          const normalizedPersonnel: PersonnelMaster[] = data.personnel
            .map((p: Record<string, unknown>, idx: number) => {
              const rawRole = String(p.role || '').toLowerCase().trim();
              let role: PersonnelMaster['role'] = 'creator';
              if (rawRole.includes('inspect') || rawRole.includes('ตรวจ')) role = 'inspector';
              else if (rawRole.includes('receiv') || rawRole.includes('รับ')) role = 'receiver';
              else if (rawRole.includes('approv') || rawRole.includes('อนุมัติ')) role = 'approver';

              return {
                id: String(p.id || `P-GS-${idx + 1}`).trim(),
                name: String(p.name || '').trim(),
                role,
                position: String(p.position || '').trim(),
              };
            })
            .filter((p: PersonnelMaster) => p.name);
          this.savePersonnelMaster(normalizedPersonnel);
        }
        const rawSubstations = data.substation || data.substations;
        if (Array.isArray(rawSubstations)) {
          const normalizedSub: SubstationMaster[] = rawSubstations
            .map((s: Record<string, unknown>) => {
              const code = String(s.Substation_Code || s.code || '').trim().toUpperCase();
              return {
                Substation_Code: code,
                Substation_Name: String(s.Substation_Name || s.name || code).trim(),
              };
            })
            .filter((s: SubstationMaster) => s.Substation_Code);
          this.saveSubstationMaster(normalizedSub);
        }
        const rawFeeders = data.feeder_no || data.feeders || data['feeder.no'];
        if (Array.isArray(rawFeeders)) {
          const normalizedFeeder: FeederNoMaster[] = rawFeeders
            .map((f: Record<string, unknown>) => {
              const num = String(f.Feeder_No || f['feeder.no'] || f.feeder_no || f.no || '').trim();
              return {
                Feeder_No: num ? num.padStart(2, '0') : '',
              };
            })
            .filter((f: FeederNoMaster) => f.Feeder_No);
          this.saveFeederNoMaster(normalizedFeeder);
        }
        return {
          success: true,
          message: `ซิงก์ข้อมูลจาก Google Sheets สำเร็จ (งาน ${data.tasks?.length || 0}, VSPP ${data.vspp?.length || 0}, หน่วยงาน ${data.pea?.length || 0}, เจ้าหน้าที่ ${data.personnel?.length || 0}, สถานี ${rawSubstations?.length || 0}, ฟีดเดอร์ ${rawFeeders?.length || 0})`,
          count: data.tasks?.length || 0,
        };
      } else {
        throw new Error(data.error || 'ดึงข้อมูลไม่สำเร็จ');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `ซิงก์ข้อมูลล้มเหลว: ${errMsg}`,
      };
    }
  },

  // Push batch to Google Apps Script
  async pushJobBatchToGas(items: TaskItem[]): Promise<{ success: boolean; message: string }> {
    const gasUrl = this.getGasUrl().trim();
    if (!gasUrl) {
      // Local only
      return { success: true, message: 'บันทึกในเครื่องเรียบร้อย (ไม่ได้ตั้งค่า GAS URL)' };
    }

    try {
      const res = await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors', // standard way to avoid Google Apps Script redirect CORS block
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_job_batch',
          items: items,
        }),
      });

      return {
        success: true,
        message: 'ส่งข้อมูลบันทึกลง Google Sheets เรียบร้อยแล้ว',
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `ส่งข้อมูลไป Google Sheets ล้มเหลว: ${errMsg}`,
      };
    }
  },

  // Push Sub_ID update to GAS
  async pushSubTaskUpdateToGas(subId: string, data: Partial<TaskItem>): Promise<void> {
    const gasUrl = this.getGasUrl().trim();
    if (!gasUrl) return;

    try {
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_sub_task',
          sub_id: subId,
          data: data,
        }),
      });
    } catch (err) {
      console.warn('GAS push failed:', err);
    }
  },

  // Push delete to GAS
  async pushDeleteSubTaskToGas(subId: string): Promise<void> {
    const gasUrl = this.getGasUrl().trim();
    if (!gasUrl) return;

    try {
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_sub_task',
          sub_id: subId,
        }),
      });
    } catch (err) {
      console.warn('GAS delete push failed:', err);
    }
  },

  // Push entire job deletion to GAS
  async pushDeleteJobToGas(jobId: string): Promise<void> {
    const gasUrl = this.getGasUrl().trim();
    if (!gasUrl) return;

    try {
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_job',
          job_id: jobId,
        }),
      });
    } catch (err) {
      console.warn('GAS delete job push failed:', err);
    }
  },

  // Push VSPP Master to GAS
  async pushVSPPToGas(record: VSPPMaster, isDelete = false): Promise<void> {
    const gasUrl = this.getGasUrl().trim();
    if (!gasUrl) return;

    try {
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isDelete ? 'delete_vspp' : 'save_vspp',
          vspp_id: record.VSPP_ID,
          data: record,
        }),
      });
    } catch (err) {
      console.warn('GAS VSPP push failed:', err);
    }
  },

  // Push PEA Master to GAS
  async pushPEAToGas(record: PEAMaster, isDelete = false): Promise<void> {
    const gasUrl = this.getGasUrl().trim();
    if (!gasUrl) return;

    try {
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isDelete ? 'delete_pea' : 'save_pea',
          pea_id: record.PEA_ID,
          data: record,
        }),
      });
    } catch (err) {
      console.warn('GAS PEA push failed:', err);
    }
  },

  // Push Personnel Master to GAS
  async pushPersonnelToGas(record: PersonnelMaster, isDelete = false): Promise<void> {
    const gasUrl = this.getGasUrl().trim();
    if (!gasUrl) return;

    try {
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isDelete ? 'delete_personnel' : 'save_personnel',
          id: record.id,
          data: record,
        }),
      });
    } catch (err) {
      console.warn('GAS Personnel push failed:', err);
    }
  },

  // Push Substation Master to GAS
  async pushSubstationToGas(record: SubstationMaster, isDelete = false): Promise<void> {
    const gasUrl = this.getGasUrl().trim();
    if (!gasUrl) return;

    try {
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isDelete ? 'delete_substation' : 'save_substation',
          Substation_Code: record.Substation_Code,
          data: record,
        }),
      });
    } catch (err) {
      console.warn('GAS Substation push failed:', err);
    }
  },

  // Push Feeder No Master to GAS
  async pushFeederNoToGas(record: FeederNoMaster, isDelete = false): Promise<void> {
    const gasUrl = this.getGasUrl().trim();
    if (!gasUrl) return;

    try {
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isDelete ? 'delete_feeder_no' : 'save_feeder_no',
          Feeder_No: record.Feeder_No,
          data: record,
        }),
      });
    } catch (err) {
      console.warn('GAS FeederNo push failed:', err);
    }
  },
};
