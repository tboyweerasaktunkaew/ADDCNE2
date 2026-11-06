/**
 * Grid Control Center Power Outage & Grid Operation Management System
 * Type definitions matching the exact 3 Google Sheets schemas:
 * 1. Tasks (Sub_ID 1 row per work day)
 * 2. VSPP_Master
 * 3. PEA_Master
 */

export type OverallStatus = 'รออนุมัติ' | 'อนุมัติ' | 'เลื่อน' | 'ยกเลิก';
export type DailyStatus = 'ปกติ' | 'เลื่อน' | 'ยกเลิก';
export type UserRole = 'admin' | 'viewer';

export interface TaskItem {
  Sub_ID: string;            // Primary Key e.g. "JOB-2026-001-01"
  Job_ID: string;            // Foreign/Group Key e.g. "JOB-2026-001"
  PEA_Request: string;       // กฟฟ.ขอดับไฟ
  Send_To?: string;          // ส่งหนังสือถึง (สำหรับช่อง ถึง ในใบปะหน้า)
  VSPP_ID?: string;          // รหัส VSPP อ้างอิง ถ้ามี
  Doc_No: string;            // เลขที่หนังสือขอดับไฟ
  Doc_Date: string;          // วันที่หนังสือขอดับไฟ (YYYY-MM-DD)
  Approval_No?: string;      // เลขที่อนุมัติ
  Approval_Date?: string;    // อนุมัติลงวันที่ (YYYY-MM-DD)
  Work_Date: string;         // วันที่ปฏิบัติงานจริงของแถวนั้นๆ (YYYY-MM-DD)
  Start_Time: string;        // เวลาเริ่มดับไฟ (HH:mm)
  End_Time: string;          // เวลาคืนสภาพ (HH:mm)
  Main_Detail: string;       // รายละเอียดงาน
  Custom_Detail: string;     // รายละเอียดงาน
  Work_Area: string;         // พื้นที่ดับไฟ
  Feeder: string;            // ฟีดเดอร์หลัก เช่น "UBN01", "WRN04"
  Feeder_Scope: string;      // ขอบเขตดับไฟ
  Creator: string;           // ผู้จัดทำ
  Inspector: string;         // ผู้ตรวจ
  Check_Date: string;        // วันที่ตรวจสอบ (YYYY-MM-DD)
  SLA: string;               // ระยะเวลาดำเนินการตาม SLA เช่น "3 วันทำการ" หรือ "ตามเกณฑ์"
  Receiver: string;          // ผู้ลงรับ
  Approver_Receiver?: string;// ผู้ลงรับอนุมัติ
  Overall_Status: OverallStatus; // สถานะภาพรวมของ Job
  Daily_Status: DailyStatus;     // สถานะเฉพาะวัน
  Note?: string;             // หมายเหตุ
}

export interface VSPPMaster {
  VSPP_ID: string;           // รหัสอ้างอิง เช่น "VSPP-UB01"
  VSPP_Name: string;         // ชื่อโรงไฟฟ้า/ผู้ประกอบการ
  Feeder_Source: string;     // สังกัดฟีดเดอร์ เช่น "UBN01"
  Switch_Equipment: string;  // ชื่ออุปกรณ์ปลดขนาน เช่น "ABS-01", "REC-04"
  To_Position: string;       // ตำแหน่งที่จะเรียนในหนังสือราชการ เช่น "ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอเมืองอุบลราชธานี"
}

export interface PEAMaster {
  PEA_ID: string;            // รหัสอ้างอิง เช่น "PEA-UBN"
  PEA_Short: string;         // ชื่อย่อ กฟฟ. เช่น "กฟฟ.อ.เมืองอุบลราชธานี"
  PEA_Full: string;          // ชื่อเต็ม กฟฟ.
  Region_Dept: string;       // สังกัด เช่น "กฟฉ.2"
  Executive_Title: string;   // ตำแหน่ง ผบห. เช่น "ผจก.กฟฟ.อ.เมืองอุบลราชธานี"
}

export interface PersonnelMaster {
  id: string;
  name: string;
  role: 'creator' | 'inspector' | 'receiver' | 'approver';
  position?: string;
}

export interface SubstationMaster {
  Substation_Code: string;
  Substation_Name: string;
}

export interface FeederNoMaster {
  Feeder_No: string;
}

export interface ConflictRecord {
  id: string;
  type: 'CRITICAL' | 'WARNING';
  reason: 'SAME_FEEDER_TIME_OVERLAP' | 'GUEST_FEEDER_OVERLAP' | 'SAME_PEA_HIGH_CONCURRENCY';
  date: string;
  feeder: string;
  subIds: string[];
  jobIds: string[];
  timeRange: string;
  description: string;
}

export type ActivePage = 'dashboard' | 'form' | 'calendar' | 'print' | 'master' | 'setup';

export interface FormSubDay {
  tempId: string;
  subId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  customDetail: string;
  dailyStatus: DailyStatus;
}
