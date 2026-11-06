import React, { useState, useMemo } from 'react';
import { TaskItem, ConflictRecord, UserRole } from '../types/grid';
import { formatThaiDate } from './PrintView';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  Printer,
  FileEdit,
  Zap,
  Calendar as CalendarIcon,
  ShieldAlert,
  CheckCircle2,
  Eye,
  Info,
  X,
} from 'lucide-react';

interface CalendarViewProps {
  tasks: TaskItem[];
  conflicts: ConflictRecord[];
  userRole?: UserRole;
  onNavigateToForm: (jobId: string, subId?: string) => void;
  onNavigateToPrint: (subId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  conflicts,
  userRole = 'admin',
  onNavigateToForm,
  onNavigateToPrint,
}) => {
  const [detailModalTask, setDetailModalTask] = useState<TaskItem | null>(null);
  // Calendar month state
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Thai month names
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Map conflicts by date
  const conflictsByDate = useMemo(() => {
    const map = new Map<string, ConflictRecord[]>();
    for (const c of conflicts) {
      const list = map.get(c.date) || [];
      list.push(c);
      map.set(c.date, list);
    }
    return map;
  }, [conflicts]);

  // Map subId to conflicts
  const subIdConflictMap = useMemo(() => {
    const map = new Map<string, ConflictRecord[]>();
    for (const c of conflicts) {
      for (const s of c.subIds) {
        const list = map.get(s) || [];
        list.push(c);
        map.set(s, list);
      }
    }
    return map;
  }, [conflicts]);

  // Tasks grouped by Work_Date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const t of tasks) {
      if (!t.Work_Date) continue;
      const list = map.get(t.Work_Date) || [];
      list.push(t);
      map.set(t.Work_Date, list);
    }
    return map;
  }, [tasks]);

  // Build calendar matrix (days)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding to complete 35 or 42 cells
    const remaining = 35 - days.length > 0 ? 35 - days.length : (42 - days.length > 0 ? 42 - days.length : 0);
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateStr(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    );
  };

  // Selected date tasks & conflicts
  const selectedDateTasks = useMemo(() => {
    return tasksByDate.get(selectedDateStr) || [];
  }, [tasksByDate, selectedDateStr]);

  const selectedDateConflicts = useMemo(() => {
    return conflictsByDate.get(selectedDateStr) || [];
  }, [conflictsByDate, selectedDateStr]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Calendar Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <span>มุมมองปฏิทินแผนงานดับไฟและปฏิบัติการระบบไฟฟ้า</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ศูนย์ควบคุมการจ่ายไฟฟ้า — ตารางแผนงานดับไฟรายเดือนและรายละเอียดการปฏิบัติงานประจำวัน
          </p>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-bold text-slate-900 min-w-[140px] text-center">
              {thaiMonths[month]} {year + 543}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition-colors"
          >
            วันนี้
          </button>
        </div>
      </div>

      {/* Main Multi-Column Split: Calendar (Left) + Day Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar Grid */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
          {/* Calendar Top Bar */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span>ปฏิทินแผนงานดับไฟรายเดือน</span>
            </div>
            <div className="text-blue-700 text-sm font-bold tracking-wide">
              {thaiMonths[month]} {year + 543}
            </div>
          </div>

          <div className="p-4 space-y-2.5">
            {/* Day of Week Header */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-slate-500 pb-2 border-b border-slate-100">
              <span className="text-rose-600">อา</span>
              <span>จ</span>
              <span>อ</span>
              <span>พ</span>
              <span>พฤ</span>
              <span>ศ</span>
              <span className="text-blue-600">ส</span>
            </div>

            {/* Calendar Day Grid */}
            <div className="grid grid-cols-7 gap-2 pt-1">
              {calendarDays.map((day) => {
                const dayTasks = tasksByDate.get(day.dateStr) || [];
                const isSelected = day.dateStr === selectedDateStr;

                return (
                  <div
                    key={day.dateStr}
                    onClick={() => setSelectedDateStr(day.dateStr)}
                    className={`min-h-[104px] p-2 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                      !day.isCurrentMonth
                        ? 'opacity-45 bg-slate-50 border-slate-100 text-slate-400 hover:opacity-75'
                        : isSelected
                        ? 'bg-blue-50/50 border-blue-600 ring-2 ring-blue-600/20 shadow-sm z-10'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Bar of Day */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                          day.isToday
                            ? 'bg-blue-600 text-white font-bold shadow-2xs'
                            : isSelected
                            ? 'text-blue-700'
                            : day.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {/* Task Count Badge */}
                      {dayTasks.length > 0 && (
                        <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md font-mono font-semibold">
                          {dayTasks.length} งาน
                        </span>
                      )}
                    </div>

                    {/* Tasks List within day (Truncated to 3 items) */}
                    <div className="space-y-1 mt-1.5 overflow-hidden flex-1">
                      {dayTasks.slice(0, 3).map((t) => (
                        <div
                          key={t.Sub_ID}
                          className={`text-[10px] px-1.5 py-0.5 rounded-md truncate leading-tight flex items-center gap-1 ${
                            t.Overall_Status === 'อนุมัติ'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : t.Overall_Status === 'เลื่อน'
                              ? 'bg-orange-50 text-orange-800 border border-orange-200'
                              : 'bg-amber-50/80 text-amber-900 border border-amber-200'
                          }`}
                          title={`${t.Sub_ID} | Feeder: ${t.Feeder} | ${t.Start_Time}-${t.End_Time} น.`}
                        >
                          <span className="font-mono font-bold shrink-0">{t.Feeder}</span>
                          <span className="truncate">{t.Start_Time}</span>
                        </div>
                      ))}

                      {dayTasks.length > 3 && (
                        <div className="text-[9px] text-slate-500 text-center font-medium">
                          +{dayTasks.length - 3} งานเพิ่มเติม
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 px-4 py-3 bg-slate-50 border-t border-slate-200">
            <span className="text-slate-600 font-medium">คำอธิบายสถานะ:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>อนุมัติแล้ว</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>รออนุมัติ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <span>เลื่อน</span>
            </div>
          </div>
        </div>

        {/* Right Column: Day Inspector */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <div className="text-xs font-semibold text-blue-600">แผงตรวจสอบข้อมูลประจำวัน</div>
              <div className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <span>{formatThaiDate(selectedDateStr)}</span>
                <span className="text-xs font-mono text-slate-500">
                  · {selectedDateTasks.length} งาน
                </span>
              </div>
            </div>
          </div>

          {/* Timeline distribution representation for the selected day */}
          {selectedDateTasks.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                <span>ช่วงเวลาดับไฟของฟีดเดอร์</span>
                <span className="text-[10px] text-slate-500 font-mono">08:00 - 17:00 น.</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {selectedDateTasks.map((task) => (
                  <div key={task.Sub_ID} className="text-xs space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-900 font-bold">{task.Feeder}</span>
                      <span className="font-mono text-blue-700 font-medium">{task.Start_Time} - {task.End_Time} น.</span>
                    </div>
                    {/* Visual Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded overflow-hidden relative">
                      <div
                        className={`h-full rounded ${
                          task.Overall_Status === 'อนุมัติ'
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List of sub-tasks scheduled for this day */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-800">
              รายละเอียดงานปฏิบัติการในวันนี้
            </div>

            {selectedDateTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-300 rounded-lg bg-slate-50/50">
                ไม่มีแผนงานดับไฟที่กำหนดในวันที่ {formatThaiDate(selectedDateStr)}
              </div>
            ) : (
              selectedDateTasks.map((t) => {
                return (
                  <div
                    key={t.Sub_ID}
                    className="p-3.5 rounded-lg border space-y-2.5 transition-colors bg-white border-slate-200 hover:border-blue-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-700 text-xs">
                        {t.Sub_ID}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-blue-700 font-bold">
                          {t.Start_Time} - {t.End_Time} น.
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            t.Overall_Status === 'อนุมัติ'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {t.Overall_Status}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-900 font-semibold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>ฟีดเดอร์: {t.Feeder}</span>
                    </div>

                    <div className="text-[11px] text-slate-700">
                      <strong className="text-slate-900">กฟฟ.:</strong> {t.PEA_Request}
                      {t.VSPP_ID && (
                        <span className="text-emerald-700 font-medium ml-2">
                          [รฟ. {t.VSPP_ID}]
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-600 line-clamp-2">
                      {t.Custom_Detail || t.Main_Detail}
                    </div>

                    <div className="text-[10px] text-slate-500">
                      พื้นที่: {t.Work_Area}
                    </div>

                    {/* Action buttons inside day inspector */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setDetailModalTask(t)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[11px] font-medium transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>รายละเอียด</span>
                      </button>

                      {userRole === 'admin' && (
                        <>
                          <button
                            onClick={() => onNavigateToPrint(t.Sub_ID)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] transition-colors"
                          >
                            <Printer className="w-3 h-3" />
                            <span>พิมพ์ใบปะหน้า</span>
                          </button>
                          <button
                            onClick={() => onNavigateToForm(t.Job_ID, t.Sub_ID)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-medium transition-colors"
                          >
                            <FileEdit className="w-3 h-3" />
                            <span>แก้ไขข้อมูล</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Read-Only Job Details Modal Dialog */}
      {detailModalTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-900 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900 flex flex-wrap items-center gap-2">
                    <span>รายละเอียดแผนงานปฏิบัติการ</span>
                    {detailModalTask.Doc_No && (
                      <span className="text-blue-700 font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                        {detailModalTask.Doc_No}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    <span className="font-medium text-slate-800">กฟฟ.ขอดับไฟ:</span> {detailModalTask.PEA_Request || '-'}
                    {!detailModalTask.Doc_No && (
                      <span className="ml-2 text-slate-400">• เลขที่หนังสือขอดับไฟ: -</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalTask(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Status & Timing Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px]">สถานะภาพรวม</span>
                  <span className="font-bold text-slate-900">{detailModalTask.Overall_Status}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">เลขที่อนุมัติ</span>
                  <span className="font-bold text-slate-900 font-mono">{detailModalTask.Approval_No || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">วันที่ปฏิบัติงาน</span>
                  <span className="font-bold text-blue-700">{formatThaiDate(detailModalTask.Work_Date)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ช่วงเวลา</span>
                  <span className="font-bold text-blue-700 font-mono">{detailModalTask.Start_Time} - {detailModalTask.End_Time} น.</span>
                </div>
              </div>

              {/* Outage Request Info */}
              <div className="space-y-2 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-blue-700 text-xs">ข้อมูลขออนุมัติดับไฟ</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  <div><strong className="text-slate-900">กฟฟ.ขอดับไฟ:</strong> {detailModalTask.PEA_Request}</div>
                  <div><strong className="text-slate-900">เลขที่หนังสือขอดับไฟ:</strong> {detailModalTask.Doc_No || '-'} ({detailModalTask.Doc_Date ? `ลงวันที่ ${formatThaiDate(detailModalTask.Doc_Date)}` : '-'})</div>
                  <div><strong className="text-slate-900">เกณฑ์การขอดับไฟล่วงหน้า P6:</strong> <span className="text-emerald-700 font-medium">{detailModalTask.SLA || '-'}</span></div>
                </div>
              </div>

              {/* Operation Details */}
              <div className="space-y-2 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-blue-700 text-xs">รายละเอียดงานและอุปกรณ์</h3>
                <div className="space-y-1.5 text-slate-700">
                  <div><strong className="text-slate-900">รายละเอียดงาน:</strong> {detailModalTask.Main_Detail || detailModalTask.Custom_Detail}</div>
                  <div><strong className="text-slate-900">พื้นที่ปฏิบัติงาน:</strong> {detailModalTask.Work_Area}</div>
                  <div><strong className="text-slate-900">ฟีดเดอร์ปฏิบัติงาน:</strong> <span className="font-mono text-blue-700 font-bold">{detailModalTask.Feeder}</span></div>
                  <div><strong className="text-slate-900">ขอบเขตดับไฟ:</strong> {detailModalTask.Feeder_Scope}</div>
                  <div><strong className="text-slate-900">โรงไฟฟ้า VSPP ที่เกี่ยวข้อง:</strong> {detailModalTask.VSPP_ID ? <span className="text-emerald-700 font-semibold">{detailModalTask.VSPP_ID}</span> : 'ไม่มี'}</div>
                  {detailModalTask.Note && <div><strong className="text-slate-900">หมายเหตุ:</strong> <span className="italic text-amber-700">{detailModalTask.Note}</span></div>}
                </div>
              </div>

              {/* Signatories */}
              <div className="space-y-2">
                <h3 className="font-bold text-blue-700 text-xs">เจ้าหน้าที่ผู้รับผิดชอบ</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  <div><strong className="text-slate-900">ผู้จัดทำ:</strong> {detailModalTask.Creator || '-'}</div>
                  <div><strong className="text-slate-900">ผู้ตรวจสอบ:</strong> {detailModalTask.Inspector || '-'}</div>
                  <div><strong className="text-slate-900">ผู้ลงรับ:</strong> {detailModalTask.Receiver || '-'}</div>
                  <div><strong className="text-slate-900">ผู้ลงอนุมัติ:</strong> {detailModalTask.Approver_Receiver || '-'}</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Dispatching Center NE2 — ระบบบริหารแผนงานดับไฟ</span>
              <button
                onClick={() => setDetailModalTask(null)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
