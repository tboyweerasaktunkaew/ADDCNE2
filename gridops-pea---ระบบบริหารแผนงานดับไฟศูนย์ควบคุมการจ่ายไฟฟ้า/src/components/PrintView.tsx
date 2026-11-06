import React, { useState, useMemo, useEffect } from 'react';
import { TaskItem, VSPPMaster, PEAMaster } from '../types/grid';
import {
  Printer,
  FileText,
  Building,
  Radio,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Layers,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import { PEALogo } from './PEALogo';

interface PrintViewProps {
  tasks: TaskItem[];
  vsppList: VSPPMaster[];
  peaList: PEAMaster[];
  initialSubId?: string;
  onBack: () => void;
}

type DocType = 'DAILY_FACE_SHEET' | 'VSPP_NOTICE' | 'EGAT_COORDINATION';

export function formatThaiDate(dateStr?: string): string {
  if (!dateStr) return '';
  if (/[ก-๙]/.test(dateStr)) return dateStr;
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const thaiYear = y > 2400 ? y : y + 543;
      return `${d} ${thaiMonths[m - 1] || ''} ${thaiYear}`;
    }
  }
  return dateStr;
}

export function formatThaiFullDateWithDay(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const dateObj = new Date(y, m - 1, d);
      const days = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const thaiYear = y > 2400 ? y : y + 543;
      const dayName = days[dateObj.getDay()] || '';
      return `${dayName}ที่ ${d} ${thaiMonths[m - 1] || ''} ${thaiYear}`;
    }
  }
  return formatThaiDate(dateStr);
}

export function formatMultipleThaiDates(dateStrs: string[]): string {
  if (!dateStrs || dateStrs.length === 0) return '';
  const validDates = Array.from(new Set(dateStrs.map((s) => s.trim()).filter(Boolean)));
  if (validDates.length === 0) return '';
  if (validDates.length === 1) return formatThaiFullDateWithDay(validDates[0]);

  const parsed = validDates
    .map((dStr) => {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return { y, m, d, orig: dStr };
        }
      }
      return null;
    })
    .filter((item): item is { y: number; m: number; d: number; orig: string } => item !== null);

  if (parsed.length === 0) return validDates.join(', ');

  parsed.sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d);

  const groups: Map<string, { y: number; m: number; days: number[] }> = new Map();
  parsed.forEach((item) => {
    const key = `${item.y}-${item.m}`;
    if (!groups.has(key)) {
      groups.set(key, { y: item.y, m: item.m, days: [] });
    }
    const g = groups.get(key)!;
    if (!g.days.includes(item.d)) {
      g.days.push(item.d);
    }
  });

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const groupFormattedStrings: string[] = [];
  groups.forEach(({ y, m, days }) => {
    days.sort((a, b) => a - b);
    const thaiYear = y > 2400 ? y : y + 543;
    const monthName = thaiMonths[m - 1] || '';
    const daysList = days.join(', ');
    groupFormattedStrings.push(`${daysList} ${monthName} ${thaiYear}`);
  });

  return groupFormattedStrings.join(', ');
}

export function calculateDuration(start?: string, end?: string): string {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '';
  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  const diff = endMinutes - startMinutes;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return `(รวม ${hours} ชม.${minutes > 0 ? ` ${minutes} นาที` : ''})`;
}

export function cleanApprovalNo(no?: string): string {
  if (!no) return '........................................';
  const trimmed = no.trim();
  const stripped = trimmed.replace(/^ฉ\.2\s*กปบ\.\(คฟ\)\s*/i, '');
  return stripped || '........................................';
}

export const PrintView: React.FC<PrintViewProps> = ({
  tasks,
  vsppList,
  peaList,
  initialSubId,
  onBack,
}) => {
  const [selectedDocType, setSelectedDocType] = useState<DocType>('DAILY_FACE_SHEET');
  const [selectedSubId, setSelectedSubId] = useState<string>(
    initialSubId || (tasks[0]?.Sub_ID ?? '')
  );
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Selected task
  const currentTask = useMemo(() => {
    return tasks.find((t) => t.Sub_ID === selectedSubId) || tasks[0] || null;
  }, [tasks, selectedSubId]);

  // Customizable fields for Document 1 (DAILY_FACE_SHEET)
  const [scopeOverride, setScopeOverride] = useState<string>('');
  const [toOverride, setToOverride] = useState<string>('');
  const [approvalNoOverride, setApprovalNoOverride] = useState<string>('');
  const [approvalDateOverride, setApprovalDateOverride] = useState<string>('');

  // Customizable fields for Document 2 (VSPP_NOTICE) matching official template
  const [selectedVsppId, setSelectedVsppId] = useState<string>('');
  const [customBreaker, setCustomBreaker] = useState<string>('52PEA-H1');
  const [customWorkPurpose, setCustomWorkPurpose] = useState<string>('ปรับปรุงระบบจำหน่าย');
  const [customNoticeDate, setCustomNoticeDate] = useState<string>('ตุลาคม 2569');
  const [customVsppDocNo, setCustomVsppDocNo] = useState<string>('');

  // Fixed system timestamp for deterministic printout
  const [printTimestamp] = useState(() => {
    const now = new Date();
    const d = now.getDate().toString().padStart(2, '0');
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const y = now.getFullYear() + 543;
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    return `${d}/${m}/${y} ${hh}:${mm} น.`;
  });

  // Sync state whenever selected task changes
  useEffect(() => {
    if (currentTask) {
      setScopeOverride(currentTask.Feeder_Scope || 'ระบบจำหน่าย TP/KT/BUS 22 kV');
      setToOverride(currentTask.Send_To || currentTask.PEA_Request || 'กฟจ.อบ., กฟส.วรช.');
      setApprovalNoOverride(currentTask.Approval_No || '');
      setApprovalDateOverride(currentTask.Approval_Date || currentTask.Doc_Date || '');

      const initialVId = currentTask.VSPP_ID || vsppList[0]?.VSPP_ID || '';
      setSelectedVsppId(initialVId);
      const matched = vsppList.find((v) => v.VSPP_ID === initialVId) || vsppList[0];
      setCustomBreaker(matched?.Switch_Equipment || '52PEA-H1');
      setCustomWorkPurpose(currentTask.Main_Detail || 'ปรับปรุงระบบจำหน่าย');

      if (currentTask.Work_Date) {
        const parts = currentTask.Work_Date.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
          ];
          const thaiYear = y > 2400 ? y : y + 543;
          setCustomNoticeDate(`${thaiMonths[m - 1] || ''} ${thaiYear}`);
        }
      }
      setCustomVsppDocNo('');
    }
  }, [currentTask, vsppList]);

  // Associated VSPP
  const currentVspp = useMemo(() => {
    if (!currentTask || !currentTask.VSPP_ID) return null;
    return vsppList.find((v) => v.VSPP_ID === currentTask.VSPP_ID) || null;
  }, [currentTask, vsppList]);

  // Effective VSPP for Document 2
  const activeVspp = useMemo(() => {
    if (selectedVsppId) {
      return vsppList.find((v) => v.VSPP_ID === selectedVsppId) || currentVspp || vsppList[0] || null;
    }
    return currentVspp || vsppList[0] || null;
  }, [selectedVsppId, vsppList, currentVspp]);

  const handleVsppSelect = (vId: string) => {
    setSelectedVsppId(vId);
    const found = vsppList.find((v) => v.VSPP_ID === vId);
    if (found) {
      setCustomBreaker(found.Switch_Equipment || '52PEA-H1');
    }
  };

  const effectiveVsppName = activeVspp?.VSPP_Name || 'บริษัท มิตรผล ไบโอเพาเวอร์ จำกัด (กุฉินารายณ์) (โครงการ 1)';
  const effectiveVsppToPosition = activeVspp?.To_Position || 'ผู้จัดการอาวุโส ฝ่ายผลิตไฟฟ้า';
  const effectiveBreaker = customBreaker || activeVspp?.Switch_Equipment || '52PEA-H1';



  // Associated PEA
  const currentPea = useMemo(() => {
    if (!currentTask) return null;
    return (
      peaList.find((p) => p.PEA_Short === currentTask.PEA_Request) ||
      peaList[0] ||
      null
    );
  }, [currentTask, peaList]);

  // Group all sub-tasks belonging to the same Job_ID, sorted chronologically
  const allJobTasks = useMemo(() => {
    if (!currentTask) return [];
    return tasks
      .filter((t) => t.Job_ID === currentTask.Job_ID)
      .sort((a, b) => (a.Work_Date || '').localeCompare(b.Work_Date || ''));
  }, [tasks, currentTask]);

  // Group consecutive tasks with the same Start_Time and End_Time
  const groupedTimeRuns = useMemo(() => {
    const runs: { dates: string[]; startTime: string; endTime: string }[] = [];
    allJobTasks.forEach((t) => {
      const last = runs[runs.length - 1];
      if (last && last.startTime === t.Start_Time && last.endTime === t.End_Time) {
        if (!last.dates.includes(t.Work_Date)) {
          last.dates.push(t.Work_Date);
        }
      } else {
        runs.push({
          dates: [t.Work_Date],
          startTime: t.Start_Time,
          endTime: t.End_Time,
        });
      }
    });
    return runs;
  }, [allJobTasks]);

  // Combined work dates string formatted as "1, 2, 5, 9, 10 พฤศจิกายน 2569"
  const combinedWorkDatesFormatted = useMemo(() => {
    if (!allJobTasks || allJobTasks.length === 0) return '';
    const dateList = allJobTasks.map((t) => t.Work_Date);
    return formatMultipleThaiDates(dateList);
  }, [allJobTasks]);

  // Check if multi-day job has different start or end times across days
  const hasDifferentTimes = useMemo(() => {
    if (allJobTasks.length <= 1) return false;
    const firstStart = allJobTasks[0].Start_Time;
    const firstEnd = allJobTasks[0].End_Time;
    return allJobTasks.some((t) => t.Start_Time !== firstStart || t.End_Time !== firstEnd);
  }, [allJobTasks]);

  const handlePrint = () => {
    window.print();
  };

  const effectiveScope = scopeOverride || currentTask?.Feeder_Scope || 'ระบบจำหน่าย TP/KT/BUS 22 kV';
  const effectiveTo = toOverride || currentTask?.Send_To || currentTask?.PEA_Request || 'กฟจ.อบ., กฟส.วรช.';
  const effectiveApprovalNo = approvalNoOverride || currentTask?.Approval_No;
  const effectiveApprovalDate = approvalDateOverride || currentTask?.Approval_Date || currentTask?.Doc_Date;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Toolbar (Hidden on Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              title="ย้อนกลับ"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <span>ระบบพิมพ์เอกสารราชการและส่งออก PDF (A4 Document Center)</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                ออกแบบสำหรับศูนย์ควบคุมการจ่ายไฟฟ้า กฟฉ.2 รองรับการรวมหลายวันในใบปะหน้าเดียว
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs text-slate-700">
              <button
                onClick={() => setZoomLevel((prev) => Math.max(70, prev - 10))}
                className="p-1 hover:text-slate-900"
                title="ย่อขนาดพรีวิว"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono font-semibold">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((prev) => Math.min(130, prev + 10))}
                className="p-1 hover:text-slate-900"
                title="ขยายขนาดพรีวิว"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ / บันทึกเป็น PDF (Print)</span>
            </button>
          </div>
        </div>

        {/* Document Selector & Task Chooser */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
          {/* Document Type Switcher */}
          <div className="md:col-span-7 flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setSelectedDocType('DAILY_FACE_SHEET')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                selectedDocType === 'DAILY_FACE_SHEET'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${selectedDocType === 'DAILY_FACE_SHEET' ? 'text-blue-600' : ''}`} />
              <span>1. อนุมัติดับไฟปฏิบัติงาน (Switching Order)</span>
            </button>

            <button
              onClick={() => setSelectedDocType('VSPP_NOTICE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                selectedDocType === 'VSPP_NOTICE'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${selectedDocType === 'VSPP_NOTICE' ? 'text-blue-600' : ''}`} />
              <span>2. ใบแจ้งปลดขนาน VSPP</span>
            </button>

            <button
              onClick={() => setSelectedDocType('EGAT_COORDINATION')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                selectedDocType === 'EGAT_COORDINATION'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className={`w-3.5 h-3.5 ${selectedDocType === 'EGAT_COORDINATION' ? 'text-blue-600' : ''}`} />
              <span>3. ใบประสานงานดับไฟ กฟผ.</span>
            </button>
          </div>

          {/* Sub_ID / Job Selector */}
          <div className="md:col-span-5 flex items-center gap-2">
            <span className="text-slate-600 font-medium whitespace-nowrap">เลือกงาน:</span>
            <select
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
            >
              {tasks.map((t, idx) => {
                const subCount = tasks.filter((sub) => sub.Job_ID === t.Job_ID).length;
                const formattedDates = formatMultipleThaiDates(
                  tasks.filter((sub) => sub.Job_ID === t.Job_ID).map((sub) => sub.Work_Date)
                );
                return (
                  <option key={`${t.Sub_ID}-${idx}`} value={t.Sub_ID}>
                    {t.Job_ID} ({t.Feeder}) — {formattedDates || t.Work_Date} {subCount > 1 ? `[${subCount} วัน]` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Customization Strip for DAILY_FACE_SHEET */}
        {selectedDocType === 'DAILY_FACE_SHEET' && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
            {/* Feeder Scope Selector */}
            <div className="md:col-span-4 flex items-center gap-2">
              <span className="text-slate-700 flex items-center gap-1 shrink-0 font-medium">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                ขอบเขต:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setScopeOverride('ระบบจำหน่าย TP/KT/BUS 22 kV')}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-semibold border transition-colors cursor-pointer ${
                    effectiveScope === 'ระบบจำหน่าย TP/KT/BUS 22 kV'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ระบบจำหน่าย 22 kV
                </button>
                <button
                  type="button"
                  onClick={() => setScopeOverride('สายส่ง/BAY 115 kV')}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-semibold border transition-colors cursor-pointer ${
                    effectiveScope === 'สายส่ง/BAY 115 kV'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  สายส่ง 115 kV
                </button>
              </div>
            </div>

            {/* To Input */}
            <div className="md:col-span-4 flex items-center gap-2">
              <span className="text-slate-600 shrink-0 font-medium">ถึง (ผู้รับ):</span>
              <input
                type="text"
                value={toOverride}
                onChange={(e) => setToOverride(e.target.value)}
                placeholder="เช่น กฟจ.อบ., กฟส.วรช."
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Approval No & Date */}
            <div className="md:col-span-4 flex items-center gap-2">
              <span className="text-slate-600 shrink-0 font-medium">เลขอนุมัติ/วันที่:</span>
              <input
                type="text"
                value={approvalNoOverride}
                onChange={(e) => setApprovalNoOverride(e.target.value)}
                placeholder="เช่น JOB-2026-001-01"
                className="w-1/2 bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                title="เลขที่อนุมัติ"
              />
              <input
                type="text"
                value={approvalDateOverride}
                onChange={(e) => setApprovalDateOverride(e.target.value)}
                placeholder="เช่น 2026-10-24"
                className="w-1/2 bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                title="ลงวันที่"
              />
            </div>
          </div>
        )}

        {/* Customization Strip for VSPP_NOTICE */}
        {selectedDocType === 'VSPP_NOTICE' && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
            {/* VSPP Selector */}
            <div className="md:col-span-4 flex items-center gap-2">
              <span className="text-slate-700 font-medium shrink-0">โรงไฟฟ้า:</span>
              <select
                value={selectedVsppId}
                onChange={(e) => handleVsppSelect(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
              >
                {vsppList.map((v, idx) => (
                  <option key={`${v.VSPP_ID}-${idx}`} value={v.VSPP_ID}>
                    {v.VSPP_Name} ({v.Switch_Equipment})
                  </option>
                ))}
              </select>
            </div>

            {/* Breaker Code */}
            <div className="md:col-span-2 flex items-center gap-2">
              <span className="text-slate-600 shrink-0 font-medium">เบรกเกอร์:</span>
              <input
                type="text"
                value={customBreaker}
                onChange={(e) => setCustomBreaker(e.target.value)}
                placeholder="เช่น 52PEA-H1"
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-blue-700 font-mono font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Purpose */}
            <div className="md:col-span-3 flex items-center gap-2">
              <span className="text-slate-600 shrink-0 font-medium">เพื่อปฏิบัติงาน:</span>
              <input
                type="text"
                value={customWorkPurpose}
                onChange={(e) => setCustomWorkPurpose(e.target.value)}
                placeholder="เช่น ปรับปรุงระบบจำหน่าย"
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Document Number & Date inputs */}
            <div className="md:col-span-3 flex items-center gap-2">
              <span className="text-slate-600 shrink-0 font-medium">เลขที่/เดือน:</span>
              <input
                type="text"
                value={customVsppDocNo}
                onChange={(e) => setCustomVsppDocNo(e.target.value)}
                placeholder="เลขที่ มท เช่น 1042"
                className="w-1/2 bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                title="เลขที่หนังสือ มท 5306.67/..."
              />
              <input
                type="text"
                value={customNoticeDate}
                onChange={(e) => setCustomNoticeDate(e.target.value)}
                placeholder="เดือน ปี เช่น ตุลาคม 2569"
                className="w-1/2 bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                title="เดือนและปีหนังสือ"
              />
            </div>
          </div>
        )}

        {/* Action Strip for EGAT_COORDINATION */}
        {selectedDocType === 'EGAT_COORDINATION' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-700 font-medium">
              ส่งแผนประสานงานดับไฟเข้าระบบงาน กฟผ. (CROC EGAT):
            </span>
            <a
              href="https://croc.egat.co.th/index.php/LogIn/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดเว็บ กฟผ. เพื่อส่งแผนดับไฟ</span>
            </a>
          </div>
        )}
      </div>

      {/* Realistic A4 Document Stage */}
      <div className="flex justify-center overflow-x-auto py-2">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-150"
        >
          {/* Printable A4 Sheet Paper with exact margins (Top/Bottom 1.5cm, Left/Right 2cm for VSPP notice) */}
          <div
            className={`w-[210mm] min-h-[297mm] bg-white text-black shadow-2xl rounded-sm print:shadow-none print:m-0 print:w-full print:min-h-0 print-card font-sarabun flex flex-col justify-between ${
              selectedDocType === 'VSPP_NOTICE'
                ? 'pt-[15mm] pb-[15mm] pl-[20mm] pr-[20mm] print:pt-[15mm] print:pb-[15mm] print:pl-[20mm] print:pr-[20mm]'
                : 'p-[10mm] sm:p-[12mm] print:p-[8mm]'
            }`}
          >
            {currentTask ? (
              <>
                {/* =========================================================================
                    DOCUMENT 1: อนุมัติดับไฟปฏิบัติงาน (Switching Order)
                    ออกแบบสวยงาม ไร้ตารางกรอบหนา ใช้ TH SarabunPSK ทุกจุด Line-height 1
                   ========================================================================= */}
                {selectedDocType === 'DAILY_FACE_SHEET' && (
                  <div className="text-[16px] leading-tight text-black font-sarabun flex flex-col justify-between min-h-full flex-1 px-2">
                    <div className="space-y-3">
                      {/* Header Title Section */}
                      <div className="text-center space-y-0.5 pt-0.5">
                        <div className="text-[19px] leading-tight font-bold text-black tracking-tight">
                          อนุมัติดับไฟปฏิบัติงาน
                        </div>
                        <div className="text-[15px] leading-tight font-bold text-gray-900">
                          ศูนย์ควบคุมการจ่ายไฟฟ้า กฟฉ.2 (อุบลราชธานี) แผนกควบคุมระบบไฟฟ้า กองปฏิบัติการ
                        </div>
                      </div>

                      {/* Clean Divider Line */}
                      <div className="border-b-2 border-black"></div>

                      {/* Routing Section (จาก, ถึง, เลขที่อนุมัติ, ลงวันที่) */}
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 bg-slate-50/80 p-2.5 rounded border border-slate-200 text-[16px] leading-tight font-normal">
                        <div className="flex items-center">
                          <span className="font-normal text-black w-14 shrink-0">จาก</span>
                          <span className="font-normal text-gray-900">กปบ.ฉ.2</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-normal text-black w-24 shrink-0">เลขที่อนุมัติ</span>
                          <span className="font-normal text-gray-900">
                            ฉ.2 กปบ.(คฟ) {cleanApprovalNo(effectiveApprovalNo)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-normal text-black w-14 shrink-0">ถึง</span>
                          <span className="font-normal text-gray-900">{effectiveTo}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-normal text-black w-24 shrink-0">ลงวันที่</span>
                          <span className="font-normal text-gray-900">
                            {formatThaiDate(effectiveApprovalDate) || '........................................'}
                          </span>
                        </div>
                      </div>

                      {/* Section: รายละเอียดการปฏิบัติงาน & ขอบเขตดับไฟ */}
                      <div className="pt-0.5 space-y-1.5">
                        <div className="flex items-center justify-between border-b-2 border-black pb-0.5 font-bold text-[16px] leading-tight">
                          <span>รายละเอียดการปฏิบัติงาน</span>
                          <span className="text-[16px] text-gray-900">
                            ขอบเขตดับไฟ : <span className="font-bold text-black">{effectiveScope}</span>
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[16px] leading-tight pt-0.5">
                          <div className="grid grid-cols-12 gap-2 items-baseline">
                            <div className="col-span-3 font-bold text-gray-900">เลขที่หนังสือขอดับไฟ :</div>
                            <div className="col-span-9 font-medium">
                              {currentTask.Doc_No || '-'}
                              {currentTask.Doc_Date && (
                                <span className="text-gray-700 ml-2">
                                  (ลงวันที่ {formatThaiDate(currentTask.Doc_Date)})
                                </span>
                              )}
                              <span className="ml-6 font-bold text-gray-900">กฟฟ. ขอดับไฟ :</span>
                              <span className="ml-1.5 font-medium">{currentTask.PEA_Request || '-'}</span>
                            </div>
                          </div>

                          {hasDifferentTimes ? (
                            <div className="grid grid-cols-12 gap-2 items-start py-0.5">
                              <div className="col-span-3 font-bold text-gray-900">วัน/เวลาปฏิบัติงาน :</div>
                              <div className="col-span-9 space-y-1 font-normal text-black">
                                <div className="text-[16px] font-bold text-black">
                                  รวม {allJobTasks.length} วันปฏิบัติงาน
                                </div>
                                {groupedTimeRuns.map((run, idx) => {
                                  const dateLabel =
                                    run.dates.length === 1
                                      ? formatThaiDate(run.dates[0])
                                      : formatMultipleThaiDates(run.dates);
                                  return (
                                    <div key={idx} className="flex flex-wrap items-baseline gap-x-2 text-[16px]">
                                      <span className="font-bold text-black">• วันที่ {dateLabel} :</span>
                                      <span className="font-bold text-black">เวลา {run.startTime} – {run.endTime} น.</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-12 gap-2 items-baseline">
                                <div className="col-span-3 font-bold text-gray-900">วันที่ปฏิบัติงาน :</div>
                                <div className="col-span-9 font-bold text-black">
                                  {combinedWorkDatesFormatted || formatThaiFullDateWithDay(currentTask.Work_Date)}
                                  {allJobTasks.length > 1 && (
                                    <span className="text-[15px] font-semibold text-gray-800 ml-2">
                                      (รวม {allJobTasks.length} วันปฏิบัติงาน)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-12 gap-2 items-baseline">
                                <div className="col-span-3 font-bold text-gray-900">เวลาปฏิบัติงาน :</div>
                                <div className="col-span-9 font-medium">
                                  <span className="font-bold text-black">{currentTask.Start_Time} – {currentTask.End_Time} น.</span>
                                </div>
                              </div>
                            </>
                          )}

                          <div className="grid grid-cols-12 gap-2 items-start">
                            <div className="col-span-3 font-bold text-gray-900">รายละเอียดงาน :</div>
                            <div className="col-span-9 leading-tight font-normal text-black">
                              {currentTask.Custom_Detail || currentTask.Main_Detail || '-'}
                            </div>
                          </div>

                          <div className="grid grid-cols-12 gap-2 items-start">
                            <div className="col-span-3 font-bold text-gray-900">พื้นที่ดับไฟ :</div>
                            <div className="col-span-9 leading-tight font-normal text-black">
                              {currentTask.Work_Area || '-'}
                            </div>
                          </div>

                          <div className="grid grid-cols-12 gap-2 items-baseline">
                            <div className="col-span-3 font-bold text-gray-900">ฟีดเดอร์ :</div>
                            <div className="col-span-9 font-medium">
                              <span className="font-bold text-black">{currentTask.Feeder || '-'}</span>
                              {currentTask.VSPP_ID && (
                                <span className="text-gray-700 ml-3 text-[14px]">
                                  [โรงไฟฟ้า VSPP เกี่ยวข้อง: <span className="font-bold">{currentTask.VSPP_ID}</span>]
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section: อนุมัติให้ดำเนินการดังนี้ */}
                      <div className="pt-1">
                        <div className="border-b border-gray-400 pb-0.5 text-[16px] leading-tight font-bold text-black">
                          อนุมัติให้ดำเนินการดังนี้
                        </div>
                        <div className="pt-1 space-y-0.5 text-[16px] leading-tight text-gray-900 pl-1">
                          <div className="flex gap-2">
                            <span className="font-normal shrink-0 w-4">1.</span>
                            <span>อนุมัติให้ดับไฟปฏิบัติงาน, ประสานงาน และดำเนินการย้ายโหลดตามสวิตชิ่งที่ศูนย์ฯ จัดส่งต่อไป</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-normal shrink-0 w-4">2.</span>
                            <span>ให้ กฟฟ. ที่เกี่ยวข้องกับการดับไฟปฏิบัติงานตามขั้นตอน และปฏิบัติตามมาตรการความปลอดภัยอย่างเคร่งครัด</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-normal shrink-0 w-4">3.</span>
                            <span>ให้ กฟจ., กฟส.(S,M,L) แจ้ง กฟฟ. ในสังกัด ประสานงานในการย้ายโหลด</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-normal shrink-0 w-4">4.</span>
                            <span>ให้ กฟฟ. ที่เกี่ยวข้องดำเนินการตรวจสอบความปลอดภัยสำหรับการปฏิบัติงานในโปรแกรม Wesafe ทุกครั้งก่อนดำเนินงาน</span>
                          </div>
                        </div>
                      </div>

                      {/* Section: มาตรการและข้อบังคับความปลอดภัยในการปฏิบัติงาน */}
                      <div className="pt-1">
                        <div className="border-b border-gray-400 pb-0.5 text-[16px] leading-tight font-bold text-black">
                          มาตรการและข้อบังคับความปลอดภัยในการปฏิบัติงาน
                        </div>
                        <div className="pt-1 space-y-0.5 text-[16px] leading-tight text-gray-900 pl-1">
                          <div className="flex gap-2">
                            <span className="font-normal shrink-0 w-4">1.</span>
                            <span>ให้ใช้วิทยุสื่อสารในการสั่งการ และประสานงานเป็นหลัก</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-normal shrink-0 w-4">2.</span>
                            <span>ให้ กฟฟ. ที่เกี่ยวข้องกับการดับไฟปฏิบัติงาน ตรวจสอบสภาพความพร้อมใช้งานของอุปกรณ์ป้องกันภัยส่วนบุคคล (PPE)</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-normal shrink-0 w-4">3.</span>
                            <span>ให้ กฟฟ. ที่เกี่ยวข้องกับการดับไฟปฏิบัติงาน ประสานงานแจ้งผู้ใช้ไฟให้ทราบถึงผลกระทบของการดับไฟ</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-normal shrink-0 w-4">4.</span>
                            <span>ให้ กฟฟ. ที่เกี่ยวข้อง ตรวจสอบสวิทซ์คาปาฯ ในระบบและสามารถใช้งานได้ปกติ พร้อมนำเข้าระบบ</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-normal shrink-0 w-4">5.</span>
                            <span>ศูนย์ควบคุมการจ่ายไฟฟ้าขอสงวนสิทธิ์ในการยกเลิกอนุมัติดับไฟปฏิบัติงาน หากพิจารณาแล้วว่าอาจเกิดความไม่ปลอดภัย</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-normal shrink-0 w-4">6.</span>
                            <span>กรณีที่การดับไฟเพื่อปฏิบัติงานส่งผลกระทบต่อผู้ป่วยติดเตียง ให้การไฟฟ้าหน้างานจัดหาระบบไฟสำรองเพื่อช่วยเหลือ</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-normal shrink-0 w-4">7.</span>
                            <span>ให้เจ้าหน้าที่ความปลอดภัยประจำการไฟฟ้ากำกับดูแล ตรวจสอบ และควบคุมการปฏิบัติงานให้เป็นไปตามมาตรการด้านความปลอดภัยอย่างเคร่งครัดทุกครั้ง</span>
                          </div>
                        </div>
                      </div>

                      {/* Closing statement */}
                      <div className="pt-1.5 text-[16px] leading-tight font-medium text-black">
                        จึงเรียนมาเพื่อโปรดทราบ และโปรดแจ้งส่วนเกี่ยวข้องดำเนินการต่อไป
                      </div>

                      {/* Blank buffer for manual rubber stamping & ink signing */}
                      <div className="h-16 my-1"></div>
                    </div>

                    {/* Clean System Footer Bar - Pinned strictly to bottom edge (14px) */}
                    <div className="pt-2 border-t border-gray-400 text-[14px] leading-tight text-gray-800 space-y-0.5 mt-auto font-sarabun">
                      <div className="font-bold text-black">ศูนย์ควบคุมการจ่ายไฟฟ้า กฟฉ.2 (อุบลราชธานี)</div>
                      <div className="text-gray-800">แผนกควบคุมระบบไฟฟ้า กองปฏิบัติการ</div>
                      <div className="text-gray-700">โทรศัพท์ 10550, 10551, 045-242432, 045-250375, 086-5825115</div>
                    </div>
                  </div>
                )}

                {/* =========================================================================
                    DOCUMENT 2: หนังสือแจ้งปลดสวิตช์ขนานโรงไฟฟ้า VSPP (VSPP Notice)
                    ฟอนต์ TH SarabunPSK ขนาด 16px ทั้งหมด, ท้ายกระดาษ 14px
                   ========================================================================= */}
                {selectedDocType === 'VSPP_NOTICE' && (
                  <div className="text-[16px] leading-tight text-black font-sarabun flex flex-col justify-between min-h-[267mm] h-full flex-1">
                    <div className="space-y-3">
                      {/* Top Header: PEA Logo on top, then Document Number & Department Address on the same starting line */}
                      <div className="space-y-2">
                        <div>
                          <img
                            src="/public/assets/aistudio/PEA_02_Thai_Logo_d064af34.png"
                            alt="ตราการไฟฟ้าส่วนภูมิภาค"
                            style={{ height: '3.5cm' }}
                            className="w-auto object-contain"
                          />
                        </div>
                        <div className="flex justify-between items-start pt-0.5 text-[16px] leading-tight">
                          {/* Left: Document Number */}
                          <div>
                            <span className="font-normal">ที่ มท 5306.67/</span>
                            <span>{customVsppDocNo || currentTask.Doc_No || '......'}</span>
                          </div>

                          {/* Right: Department Address starting on the same line as ที่ มท */}
                          <div className="text-right space-y-0.5 max-w-[340px]">
                            <div>กองปฏิบัติการ ฝ่ายปฏิบัติการและบำรุงรักษา</div>
                            <div>การไฟฟ้าส่วนภูมิภาค เขต 2 (ภาคตะวันออกเฉียงเหนือ)</div>
                            <div>195 หมู่ที่ 7 ถนนเลี่ยงเมือง ตำบลแจระแม</div>
                            <div>อำเภอเมือง จังหวัดอุบลราชธานี 34000</div>
                          </div>
                        </div>
                      </div>

                      {/* Date: Positioned towards the middle-right */}
                      <div className="text-center pl-32 py-1 text-[16px] leading-tight">
                        <span>{customNoticeDate || formatThaiDate(currentTask.Work_Date) || 'ตุลาคม 2569'}</span>
                      </div>

                      {/* Subject and Salutation */}
                      <div className="space-y-1.5 pt-1 text-[16px] leading-tight">
                        <div>
                          <span className="font-normal">เรื่อง&nbsp;&nbsp;&nbsp;</span>
                          <span>ขอปลดเบรกเกอร์โรงไฟฟ้า </span>
                          <span>{effectiveVsppName}</span>
                        </div>

                        <div>
                          <span className="font-normal">เรียน&nbsp;&nbsp;&nbsp;</span>
                          <span>{effectiveVsppToPosition} {effectiveVsppName}</span>
                        </div>
                      </div>

                      {/* Paragraph 1 */}
                      <div className="pt-1 text-justify indent-12 text-[16px] leading-tight">
                        ด้วยกองปฏิบัติการ ฝ่ายปฏิบัติการและบำรุงรักษา การไฟฟ้าส่วนภูมิภาค เขต 2 (ภาคตะวันออกเฉียงเหนือ) จังหวัดอุบลราชธานี มีแผนปฏิบัติงานในระบบไฟฟ้า จึงขอแจ้งให้งดการขนานเครื่องกำเนิดไฟฟ้าของโรงไฟฟ้าผู้ผลิตไฟฟ้าขนาดเล็กมาก (VSPP) โดยมีรายละเอียดดังนี้
                      </div>

                      {/* Indented Details List */}
                      <div className="pt-1 pl-12 space-y-1 text-[16px] leading-tight">
                        <div className="grid grid-cols-12 gap-2 items-baseline">
                          <div className="col-span-3 font-semibold whitespace-nowrap">ผู้ผลิตไฟฟ้า</div>
                          <div className="col-span-9">{effectiveVsppName}</div>
                        </div>

                        <div className="grid grid-cols-12 gap-2 items-baseline">
                          <div className="col-span-3 font-semibold whitespace-nowrap">วันที่ปฏิบัติงาน</div>
                          <div className="col-span-9">
                            {`วันที่ ${combinedWorkDatesFormatted || formatThaiDate(currentTask.Work_Date)} เวลา ${currentTask.Start_Time} – ${currentTask.End_Time} น.`}
                          </div>
                        </div>

                        <div className="grid grid-cols-12 gap-2 items-baseline">
                          <div className="col-span-3 font-semibold whitespace-nowrap">เพื่อปฏิบัติงาน</div>
                          <div className="col-span-9">
                            {customWorkPurpose || currentTask.Custom_Detail || currentTask.Main_Detail || 'ปรับปรุงระบบจำหน่าย'}
                          </div>
                        </div>

                        <div className="grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-3 font-semibold whitespace-nowrap">การดำเนินการ</div>
                          <div className="col-span-9 space-y-0.5">
                            <div>- โรงไฟฟ้าฯ งดการขนานจ่ายไฟเข้าระบบโครงข่ายไฟฟ้า</div>
                            <div>
                              - ปลดเบรกเกอร์ {effectiveBreaker} โรงไฟฟ้าฯ
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Paragraph 2 & 3 */}
                      <div className="pt-2 text-justify indent-12 text-[16px] leading-tight">
                        ทั้งนี้ หากปฏิบัติงานแล้วเสร็จจะแจ้งให้ บริษัทฯ ทราบเพื่อขนานเข้าระบบต่อไป
                      </div>

                      <div className="pt-0.5 text-justify indent-12 text-[16px] leading-tight">
                        จึงเรียนมาเพื่อโปรดพิจารณาดำเนินการ และขอขอบคุณมา ณ โอกาสนี้ด้วย
                      </div>

                      {/* Sign-off: No printed signature lines, blank space for manual ink stamping and signature */}
                      <div className="pt-6 pl-40 text-center text-[16px] leading-tight">
                        <div>ขอแสดงความนับถือ</div>
                        <div className="h-24"></div>
                      </div>
                    </div>

                    {/* Fixed Footer - Pinned strictly to bottom edge (14px) */}
                    <div className="pt-2 border-t border-gray-300 text-[14px] leading-tight space-y-0.5 text-gray-800 mt-auto font-sarabun">
                      <div className="font-bold text-black">
                        หมายเหตุ ให้ บริษัทฯ ทยอยลดกำลังผลิตลง ก่อนการปลดขนานทุกครั้ง
                      </div>
                      <div className="font-bold text-black pt-0.5">ศูนย์ควบคุมการจ่ายไฟฟ้า กฟฉ.2 (อุบลราชธานี)</div>
                      <div className="text-gray-800">แผนกควบคุมระบบไฟฟ้า กองปฏิบัติการ ฝ่ายปฏิบัติการและบำรุงรักษา กฟฉ.2</div>
                      <div className="text-gray-700">
                        โทรศัพท์ 10550, 10551, 045-242432, 045-250375, 086-5825115 &nbsp;|&nbsp; E-Mail : addc_ne2@pea.co.th
                      </div>
                    </div>
                  </div>
                )}

                {/* =========================================================================
                    DOCUMENT 3: ใบแจ้งประสานงานดับไฟสถานีไฟฟ้า กฟผ. (EGAT Coordination)
                    ฟอนต์ TH SarabunPSK ขนาด 16px ทั้งหมด, ท้ายกระดาษ 14px
                   ========================================================================= */}
                {selectedDocType === 'EGAT_COORDINATION' && (
                  <div className="space-y-4 text-[16px] leading-tight text-black font-sarabun flex flex-col justify-between min-h-full flex-1 px-4">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="text-center space-y-1 pb-2 border-b-2 border-black">
                        <div className="text-[16px] leading-tight font-bold text-gray-800">
                          การไฟฟ้าส่วนภูมิภาค — การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย
                        </div>
                        <div className="text-[18px] leading-tight font-bold">
                          แบบฟอร์มประสานงานดับไฟระบบส่งและสถานีไฟฟ้าแรงสูง กฟผ.
                        </div>
                        <div className="text-[15px] leading-tight text-gray-800">
                          แผนกปฏิบัติการระบบไฟฟ้า ศูนย์ควบคุมการจ่ายไฟฟ้า กฟฉ.2 (อุบลราชธานี)
                        </div>
                      </div>

                      {/* Memo details */}
                      <div className="grid grid-cols-2 gap-2 text-[16px] leading-tight">
                        <div>
                          <strong>สถานีไฟฟ้าแรงสูง กฟผ.: </strong> สถานีไฟฟ้าแรงสูงอุบลราชธานี 1 (หรือที่เกี่ยวข้อง)
                        </div>
                        <div className="text-right">
                          <strong>รหัสงานอ้างอิง: </strong> <span>{currentTask.Sub_ID}</span>
                        </div>
                      </div>

                      <table className="w-full border-collapse border border-black text-[16px] leading-tight">
                        <tbody>
                          <tr className="border-b border-black">
                            <td className="w-1/3 p-2 font-bold bg-gray-100 border-r border-black">
                              เบย์ / ฟีดเดอร์ขอดับไฟ
                            </td>
                            <td className="p-2 font-bold">
                              {currentTask.Feeder}
                            </td>
                          </tr>
                          <tr className="border-b border-black">
                            <td className="p-2 font-bold bg-gray-100 border-r border-black">
                              วันและเวลาขอเปิดใบอนุญาตปฏิบัติงาน
                            </td>
                            <td className="p-2">
                              วันที่ {combinedWorkDatesFormatted || formatThaiDate(currentTask.Work_Date)} เวลา {currentTask.Start_Time} น.
                            </td>
                          </tr>
                          <tr className="border-b border-black">
                            <td className="p-2 font-bold bg-gray-100 border-r border-black">
                              วันและเวลาส่งคืนสภาพ
                            </td>
                            <td className="p-2">
                              วันที่ {combinedWorkDatesFormatted || formatThaiDate(currentTask.Work_Date)} เวลา {currentTask.End_Time} น.
                            </td>
                          </tr>
                          <tr className="border-b border-black">
                            <td className="p-2 font-bold bg-gray-100 border-r border-black">
                              วัตถุประสงค์การดับไฟ
                            </td>
                            <td className="p-2">
                              {currentTask.Main_Detail} ({currentTask.Work_Area})
                            </td>
                          </tr>
                          <tr className="border-b border-black">
                            <td className="p-2 font-bold bg-gray-100 border-r border-black">
                              เนื้องานประจำวัน
                            </td>
                            <td className="p-2">
                              {currentTask.Custom_Detail || currentTask.Main_Detail}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold bg-gray-100 border-r border-black">
                              ผู้ประสานงานศูนย์ควบคุม กฟภ.
                            </td>
                            <td className="p-2">
                              {currentTask.Creator} / {currentTask.Inspector}
                            </td>
                          </tr>
                        </tbody>
                      </table>


                    </div>

                    {/* Clean System Footer Bar - Pinned strictly to bottom edge (14px) */}
                    <div className="pt-2 border-t border-gray-400 text-[14px] leading-tight text-gray-800 space-y-0.5 mt-auto font-sarabun">
                      <div className="font-bold text-black">ศูนย์ควบคุมการจ่ายไฟฟ้า กฟฉ.2 (อุบลราชธานี)</div>
                      <div className="text-gray-800">แผนกควบคุมระบบไฟฟ้า กองปฏิบัติการ</div>
                      <div className="text-gray-700">โทรศัพท์ 10550, 10551, 045-242432, 045-250375, 086-5825115</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-20 text-center text-gray-400 text-sm">
                ไม่พบข้อมูลแผนงานสำหรับพิมพ์
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
