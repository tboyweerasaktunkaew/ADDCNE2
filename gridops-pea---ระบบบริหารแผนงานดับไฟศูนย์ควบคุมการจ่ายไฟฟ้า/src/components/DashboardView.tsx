import React, { useState, useMemo } from 'react';
import { TaskItem, ConflictRecord, UserRole } from '../types/grid';
import { formatThaiDate } from './PrintView';
import {
  Search,
  Filter,
  PlusCircle,
  FileEdit,
  Printer,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  Activity,
  Layers,
  CalendarDays,
  Zap,
  Eye,
  Info,
  X,
} from 'lucide-react';

interface DashboardViewProps {
  tasks: TaskItem[];
  conflicts: ConflictRecord[];
  userRole: UserRole;
  onNavigateToForm: (jobId?: string, subId?: string) => void;
  onNavigateToPrint: (subId: string) => void;
  onDeleteSubTask: (subId: string) => void;
  onUpdateSubTaskStatus: (subId: string, dailyStatus: TaskItem['Daily_Status'], overallStatus?: TaskItem['Overall_Status']) => void;
  peaList: string[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  conflicts,
  userRole,
  onNavigateToForm,
  onNavigateToPrint,
  onDeleteSubTask,
  onUpdateSubTaskStatus,
  peaList,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPea, setSelectedPea] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'NEXT_7_DAYS' | 'THIS_MONTH'>('ALL');
  const [viewMode, setViewMode] = useState<'DATE_GROUP' | 'SUB_ID' | 'JOB_GROUP'>('DATE_GROUP');
  const [filterConflictsOnly, setFilterConflictsOnly] = useState(false);
  const [detailModalTask, setDetailModalTask] = useState<TaskItem | null>(null);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Conflict reporting is shown only in JobFormView
  const conflictMap = useMemo(() => new Map<string, ConflictRecord[]>(), []);

  // KPI calculations
  const stats = useMemo(() => {
    const totalSub = tasks.length;
    const todayCount = tasks.filter((t) => t.Work_Date === todayStr).length;
    const pendingCount = tasks.filter((t) => t.Overall_Status === 'รออนุมัติ').length;
    const approvedCount = tasks.filter((t) => t.Overall_Status === 'อนุมัติ').length;
    const uniqueFeeders = new Set(tasks.map((t) => t.Feeder).filter(Boolean)).size;

    return {
      totalSub,
      todayCount,
      pendingCount,
      approvedCount,
      uniqueFeeders,
      conflictCount: conflicts.length,
    };
  }, [tasks, conflicts, todayStr]);

  // Filter and sort tasks by Work_Date (ascending) then Start_Time
  const filteredTasks = useMemo(() => {
    const list = tasks.filter((t) => {
      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          t.Sub_ID.toLowerCase().includes(q) ||
          t.Job_ID.toLowerCase().includes(q) ||
          t.Feeder.toLowerCase().includes(q) ||
          t.PEA_Request.toLowerCase().includes(q) ||
          t.Work_Area.toLowerCase().includes(q) ||
          t.Main_Detail.toLowerCase().includes(q) ||
          t.Custom_Detail.toLowerCase().includes(q) ||
          (t.VSPP_ID && t.VSPP_ID.toLowerCase().includes(q)) ||
          t.Creator.toLowerCase().includes(q);
        if (!match) return false;
      }

      // PEA filter
      if (selectedPea !== 'ALL' && t.PEA_Request !== selectedPea) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (t.Overall_Status !== selectedStatus && t.Daily_Status !== selectedStatus) {
          return false;
        }
      }

      // Conflicts only filter
      if (filterConflictsOnly) {
        if (!conflictMap.has(t.Sub_ID)) return false;
      }

      // Date filter
      if (dateFilter === 'TODAY') {
        if (t.Work_Date !== todayStr) return false;
      } else if (dateFilter === 'NEXT_7_DAYS') {
        const taskTime = new Date(t.Work_Date).getTime();
        const todayTime = new Date(todayStr).getTime();
        const maxTime = todayTime + 7 * 86400000;
        if (taskTime < todayTime || taskTime > maxTime) return false;
      } else if (dateFilter === 'THIS_MONTH') {
        const curMonthPrefix = todayStr.substring(0, 7);
        if (!t.Work_Date.startsWith(curMonthPrefix)) return false;
      }

      return true;
    });

    // Sort strictly by Work_Date ascending, then by Start_Time ascending
    return list.sort((a, b) => {
      if (a.Work_Date !== b.Work_Date) {
        return a.Work_Date.localeCompare(b.Work_Date);
      }
      return (a.Start_Time || '').localeCompare(b.Start_Time || '');
    });
  }, [tasks, searchTerm, selectedPea, selectedStatus, filterConflictsOnly, dateFilter, todayStr, conflictMap]);

  // Grouped by Date (Work_Date)
  const groupedByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const t of filteredTasks) {
      const list = map.get(t.Work_Date) || [];
      list.push(t);
      map.set(t.Work_Date, list);
    }
    // Sorted by date string
    const entries = Array.from(map.entries());
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }, [filteredTasks]);

  // Grouped by Job_ID if viewMode === 'JOB_GROUP'
  const groupedJobs = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const t of filteredTasks) {
      const list = map.get(t.Job_ID) || [];
      list.push(t);
      map.set(t.Job_ID, list);
    }
    return Array.from(map.entries());
  }, [filteredTasks]);

  const getStatusBadge = (status: TaskItem['Overall_Status']) => {
    switch (status) {
      case 'อนุมัติ':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            อนุมัติ
          </span>
        );
      case 'รออนุมัติ':
        return (
          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            รออนุมัติ
          </span>
        );
      case 'เลื่อน':
        return (
          <span className="inline-flex items-center gap-1 text-orange-700 font-semibold text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            เลื่อน
          </span>
        );
      case 'ยกเลิก':
        return (
          <span className="inline-flex items-center gap-1 text-slate-500 font-medium text-xs">
            <Ban className="w-3.5 h-3.5 text-slate-400" />
            ยกเลิก
          </span>
        );
      default:
        return <span className="text-slate-500 text-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              ภาพรวมแผนงานดับไฟและปฏิบัติการระบบไฟฟ้า
            </h1>
            <span className="text-xs text-slate-500 font-mono">
              · {formatThaiDate(todayStr)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ศูนย์ควบคุมการจ่ายไฟฟ้า — ตรวจสอบและบริหารแผนงานตัดแยกวงจรดับไฟ บำรุงรักษา และการปลดสวิตช์ขนานโรงไฟฟ้า VSPP
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            onClick={() => onNavigateToForm()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>สร้างแผนงานดับไฟใหม่</span>
          </button>
        )}
      </div>

      {/* Filter and Control Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหารหัสงาน, ฟีดเดอร์, กฟฟ., พื้นที่ปฏิบัติงาน..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors"
            />
          </div>

          {/* PEA filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedPea}
              onChange={(e) => setSelectedPea(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors"
            >
              <option value="ALL">กฟฟ. ขอดับไฟทั้งหมด</option>
              {peaList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="รออนุมัติ">รออนุมัติ</option>
              <option value="อนุมัติ">อนุมัติ</option>
              <option value="เลื่อน">เลื่อน</option>
              <option value="ยกเลิก">ยกเลิก</option>
            </select>
          </div>

          {/* Date Segmented Filter */}
          <div className="lg:col-span-3 flex items-center justify-end gap-1">
            <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-[11px]">
              <button
                onClick={() => setDateFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors ${dateFilter === 'ALL' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setDateFilter('TODAY')}
                className={`px-2.5 py-1 rounded-md transition-colors ${dateFilter === 'TODAY' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                วันนี้
              </button>
              <button
                onClick={() => setDateFilter('NEXT_7_DAYS')}
                className={`px-2.5 py-1 rounded-md transition-colors ${dateFilter === 'NEXT_7_DAYS' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                7 วันหน้า
              </button>
              <button
                onClick={() => setDateFilter('THIS_MONTH')}
                className={`px-2.5 py-1 rounded-md transition-colors ${dateFilter === 'THIS_MONTH' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                เดือนนี้
              </button>
            </div>
          </div>
        </div>

        {/* View Mode & Active Filter summary */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span>แสดงผล: <strong className="text-slate-900 font-mono">{filteredTasks.length}</strong> รายการ</span>
            {filterConflictsOnly && (
              <button
                onClick={() => setFilterConflictsOnly(false)}
                className="text-rose-600 underline hover:text-rose-700 ml-2"
              >
                ยกเลิกการกรอง
              </button>
            )}
            {(searchTerm || selectedPea !== 'ALL' || selectedStatus !== 'ALL' || dateFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedPea('ALL');
                  setSelectedStatus('ALL');
                  setDateFilter('ALL');
                  setFilterConflictsOnly(false);
                }}
                className="text-blue-600 underline hover:text-blue-700 ml-2 font-medium"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('DATE_GROUP')}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${viewMode === 'DATE_GROUP' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              จัดกลุ่มตามวันที่
            </button>
            <button
              onClick={() => setViewMode('SUB_ID')}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${viewMode === 'SUB_ID' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              ตารางรวมเรียงตามวัน
            </button>
            <button
              onClick={() => setViewMode('JOB_GROUP')}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${viewMode === 'JOB_GROUP' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              จัดกลุ่มตามรหัสงานหลัก
            </button>
          </div>
        </div>
      </div>

      {/* Main Data Table according to viewMode */}
      {viewMode === 'DATE_GROUP' ? (
        /* Date Grouped View - Single Continuous Table with Merged Date Separator Rows */
        <div className="bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          {groupedByDate.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              ไม่พบรายการแผนงานดับไฟตามเงื่อนไขที่เลือก
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-600 border-b border-slate-200 font-semibold">
                    <th className="py-3 px-3.5">วัน-เวลาปฏิบัติงาน</th>
                    <th className="py-3 px-3.5">เลขที่หนังสือขอดับไฟ</th>
                    <th className="py-3 px-3.5">กฟฟ. ขอดับไฟ</th>
                    <th className="py-3 px-3.5">ฟีดเดอร์/VSPP</th>
                    <th className="py-3 px-3.5">รายละเอียดงาน และหมายเหตุ</th>
                    <th className="py-3 px-3.5">สถานะอนุมัติ</th>
                    <th className="py-3 px-3.5">เลขที่อนุมัติ</th>
                    <th className="py-3 px-3.5 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedByDate.map(([dateStr, dayTasks]) => {
                    const isToday = dateStr === todayStr;

                    return (
                      <React.Fragment key={dateStr}>
                        {/* Merged Date Separator Row */}
                        <tr className="bg-slate-50/80 border-y border-slate-200">
                          <td colSpan={8} className="py-2.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <CalendarDays className={`w-4 h-4 ${isToday ? 'text-blue-600' : 'text-slate-500'}`} />
                                <span className="font-bold text-slate-900 text-sm">
                                  {formatThaiDate(dateStr)}
                                </span>
                                {isToday && (
                                  <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold">
                                    วันนี้
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-300">·</span>
                              <span className="text-xs text-slate-600">
                                มีงานดับไฟ <strong className="text-blue-700 font-mono">{dayTasks.length}</strong> รายการ
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Sub-tasks for this date */}
                        {dayTasks.map((task) => {
                          const taskConflicts = conflictMap.get(task.Sub_ID) || [];
                          const hasCrit = taskConflicts.some((c) => c.type === 'CRITICAL');

                          return (
                            <tr
                              key={task.Sub_ID}
                              className={`hover:bg-blue-50/35 transition-colors ${
                                hasCrit ? 'bg-rose-50/40' : 'bg-white'
                              }`}
                            >
                              {/* 1. วัน-เวลาปฏิบัติงาน */}
                              <td className="py-3 px-3.5 align-top whitespace-nowrap">
                                <div className="text-blue-700 font-mono font-bold flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{task.Start_Time} - {task.End_Time} น.</span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {task.Sub_ID}
                                </div>
                              </td>

                              {/* 2. เลขที่หนังสือขอดับไฟ */}
                              <td className="py-3 px-3.5 align-top whitespace-nowrap">
                                <div className="text-slate-800 font-medium">
                                  {task.Doc_No || '-'}
                                </div>
                                {task.Doc_Date && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    ลงวันที่ {formatThaiDate(task.Doc_Date)}
                                  </div>
                                )}
                              </td>

                              {/* 3. กฟฟ. ขอดับไฟ */}
                              <td className="py-3 px-3.5 align-top whitespace-nowrap">
                                <div className="text-slate-900 font-semibold">
                                  {task.PEA_Request || '-'}
                                </div>
                              </td>

                              {/* 4. ฟีดเดอร์/VSPP */}
                              <td className="py-3 px-3.5 align-top whitespace-nowrap">
                                <div className="font-mono font-bold text-slate-900 flex items-center gap-1">
                                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                                  <span>{task.Feeder}</span>
                                </div>
                                {task.VSPP_ID && (
                                  <div className="text-[11px] text-emerald-700 font-mono font-medium mt-0.5">
                                    รฟ. {task.VSPP_ID}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-500 mt-0.5 max-w-[150px] truncate" title={task.Feeder_Scope}>
                                  {task.Feeder_Scope}
                                </div>
                              </td>

                              {/* 5. รายละเอียดงาน และหมายเหตุ */}
                              <td className="py-3 px-3.5 align-top max-w-[320px]">
                                <div className="text-slate-800 line-clamp-2" title={task.Custom_Detail || task.Main_Detail}>
                                  {task.Custom_Detail || task.Main_Detail || '-'}
                                </div>
                                {task.Work_Area && (
                                  <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                    พื้นที่: {task.Work_Area}
                                  </div>
                                )}
                                {task.Note && (
                                  <div className="text-[10px] text-amber-700 mt-1 italic">
                                    หมายเหตุ: {task.Note}
                                  </div>
                                )}
                              </td>

                              {/* 6. สถานะอนุมัติ */}
                              <td className="py-3 px-3.5 align-top whitespace-nowrap">
                                <div>{getStatusBadge(task.Overall_Status)}</div>
                                <div className="text-[10px] text-slate-500 mt-1">
                                  สถานะวัน: {task.Daily_Status}
                                </div>
                              </td>

                              {/* 7. เลขที่อนุมัติ */}
                              <td className="py-3 px-3.5 align-top whitespace-nowrap">
                                <div className="text-slate-800 font-medium">
                                  {task.Approval_No || '-'}
                                </div>
                                {task.Approval_Date && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    ลงวันที่ {formatThaiDate(task.Approval_Date)}
                                  </div>
                                )}
                              </td>

                              {/* 8. การจัดการ */}
                              <td className="py-3 px-3.5 align-top text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setDetailModalTask(task)}
                                    className="p-1.5 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 transition-colors"
                                    title="ดูรายละเอียดแผนงาน"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {userRole === 'admin' && (
                                    <>
                                      <button
                                        onClick={() => onNavigateToPrint(task.Sub_ID)}
                                        className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                                        title="พิมพ์ใบปะหน้าสรุปงาน A4 / หนังสือ VSPP"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        onClick={() => onNavigateToForm(task.Job_ID, task.Sub_ID)}
                                        className="p-1.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                                        title="เปิดหน้าแก้ไขแผนงาน"
                                      >
                                        <FileEdit className="w-3.5 h-3.5" />
                                      </button>

                                      <div className="flex items-center gap-1">
                                        {task.Overall_Status === 'รออนุมัติ' && (
                                          <button
                                            onClick={() => onUpdateSubTaskStatus(task.Sub_ID, 'ปกติ', 'อนุมัติ')}
                                            className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold transition-colors"
                                            title="อนุมัติแผนงานทันที"
                                          >
                                            อนุมัติ
                                          </button>
                                        )}
                                        <button
                                          onClick={() => onDeleteSubTask(task.Sub_ID)}
                                          className="p-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                                          title="ลบรายการ Sub_ID นี้"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : viewMode === 'SUB_ID' ? (
        /* Flat Table strictly sorted by Work_Date then Start_Time */
        <div className="bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-3 px-3.5">วัน-เวลาปฏิบัติงาน</th>
                  <th className="py-3 px-3.5">เลขที่หนังสือขอดับไฟ</th>
                  <th className="py-3 px-3.5">กฟฟ. ขอดับไฟ</th>
                  <th className="py-3 px-3.5">ฟีดเดอร์/VSPP</th>
                  <th className="py-3 px-3.5">รายละเอียดงาน และหมายเหตุ</th>
                  <th className="py-3 px-3.5">สถานะอนุมัติ</th>
                  <th className="py-3 px-3.5">เลขที่อนุมัติ</th>
                  <th className="py-3 px-3.5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      ไม่พบรายการแผนงานดับไฟตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const taskConflicts = conflictMap.get(task.Sub_ID) || [];
                    const hasCritical = taskConflicts.some((c) => c.type === 'CRITICAL');
                    const isToday = task.Work_Date === todayStr;

                    return (
                      <tr
                        key={task.Sub_ID}
                        className={`hover:bg-blue-50/35 transition-colors ${
                          hasCritical
                            ? 'bg-rose-50/40'
                            : isToday
                            ? 'bg-blue-50/20'
                            : 'bg-white'
                        }`}
                      >
                        {/* 1. วัน-เวลาปฏิบัติงาน */}
                        <td className="py-3 px-3.5 align-top whitespace-nowrap">
                          <div className="text-slate-900 font-semibold flex items-center gap-1.5">
                            <span>{formatThaiDate(task.Work_Date)}</span>
                            {isToday && (
                              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-sans font-semibold">
                                วันนี้
                              </span>
                            )}
                          </div>
                          <div className="text-blue-700 font-mono font-bold mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>{task.Start_Time} - {task.End_Time} น.</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {task.Sub_ID}
                          </div>
                        </td>

                        {/* 2. เลขที่หนังสือขอดับไฟ */}
                        <td className="py-3 px-3.5 align-top whitespace-nowrap">
                          <div className="text-slate-800 font-medium">
                            {task.Doc_No || '-'}
                          </div>
                          {task.Doc_Date && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              ลงวันที่ {formatThaiDate(task.Doc_Date)}
                            </div>
                          )}
                        </td>

                        {/* 3. กฟฟ. ขอดับไฟ */}
                        <td className="py-3 px-3.5 align-top whitespace-nowrap">
                          <div className="text-slate-900 font-semibold">
                            {task.PEA_Request || '-'}
                          </div>
                        </td>

                        {/* 4. ฟีดเดอร์/VSPP */}
                        <td className="py-3 px-3.5 align-top whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>{task.Feeder}</span>
                          </div>
                          {task.VSPP_ID && (
                            <div className="text-[11px] text-emerald-700 font-mono font-medium mt-0.5">
                              รฟ. {task.VSPP_ID}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 mt-0.5 max-w-[150px] truncate" title={task.Feeder_Scope}>
                            {task.Feeder_Scope}
                          </div>
                        </td>

                        {/* 5. รายละเอียดงาน และหมายเหตุ */}
                        <td className="py-3 px-3.5 align-top max-w-[320px]">
                          <div className="text-slate-800 line-clamp-2" title={task.Custom_Detail || task.Main_Detail}>
                            {task.Custom_Detail || task.Main_Detail || '-'}
                          </div>
                          {task.Work_Area && (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              พื้นที่: {task.Work_Area}
                            </div>
                          )}
                          {task.Note && (
                            <div className="text-[10px] text-amber-700 mt-1 italic">
                              หมายเหตุ: {task.Note}
                            </div>
                          )}
                        </td>

                        {/* 6. สถานะอนุมัติ */}
                        <td className="py-3 px-3.5 align-top whitespace-nowrap">
                          <div>{getStatusBadge(task.Overall_Status)}</div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            สถานะวัน: {task.Daily_Status}
                          </div>
                        </td>

                        {/* 7. เลขที่อนุมัติ */}
                        <td className="py-3 px-3.5 align-top whitespace-nowrap">
                          <div className="text-slate-800 font-medium">
                            {task.Approval_No || '-'}
                          </div>
                          {task.Approval_Date && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              ลงวันที่ {formatThaiDate(task.Approval_Date)}
                            </div>
                          )}
                        </td>

                        {/* 8. การจัดการ */}
                        <td className="py-3 px-3.5 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setDetailModalTask(task)}
                              className="p-1.5 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 transition-colors"
                              title="ดูรายละเอียดแผนงาน"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {userRole === 'admin' && (
                              <>
                                <button
                                  onClick={() => onNavigateToPrint(task.Sub_ID)}
                                  className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                                  title="พิมพ์ใบปะหน้าสรุปงาน A4 / หนังสือ VSPP"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => onNavigateToForm(task.Job_ID, task.Sub_ID)}
                                  className="p-1.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                                  title="เปิดหน้าแก้ไขแผนงานแบบเต็มหน้าจอ"
                                >
                                  <FileEdit className="w-3.5 h-3.5" />
                                </button>

                                <div className="flex items-center gap-1">
                                  {task.Overall_Status === 'รออนุมัติ' && (
                                    <button
                                      onClick={() => onUpdateSubTaskStatus(task.Sub_ID, 'ปกติ', 'อนุมัติ')}
                                      className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold transition-colors"
                                      title="อนุมัติแผนงานทันที"
                                    >
                                      อนุมัติ
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onDeleteSubTask(task.Sub_ID)}
                                    className="p-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                                    title="ลบรายการ Sub_ID นี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Job Group View */
        <div className="space-y-4">
          {groupedJobs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              ไม่พบงานตามเงื่อนไขที่เลือก
            </div>
          ) : (
            groupedJobs.map(([jobId, subTasks]) => {
              const primaryTask = subTasks[0];
              const hasConflict = subTasks.some((s) => conflictMap.has(s.Sub_ID));

              return (
                <div
                  key={jobId}
                  className={`bg-white border rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden ${
                    hasConflict ? 'border-rose-300' : 'border-slate-200'
                  }`}
                >
                  {/* Job Header */}
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-blue-700 text-sm">
                        {jobId}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-900 font-semibold text-xs">
                        {primaryTask.PEA_Request}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600 text-xs">
                        {primaryTask.Main_Detail}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500">
                        รวม {subTasks.length} วันปฏิบัติงาน
                      </span>
                      <div>{getStatusBadge(primaryTask.Overall_Status)}</div>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => onNavigateToForm(jobId)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-xs transition-colors"
                        >
                          แก้ไขทั้ง Job
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub-tasks in this Job */}
                  <div className="divide-y divide-slate-100">
                    {subTasks.map((sub) => {
                      return (
                        <div
                          key={sub.Sub_ID}
                          className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-blue-50/30"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-slate-600 font-semibold">
                              {sub.Sub_ID}
                            </span>
                            <span className="text-slate-900 font-medium">{formatThaiDate(sub.Work_Date)}</span>
                            <span className="text-blue-700 font-mono font-semibold">
                              {sub.Start_Time} - {sub.End_Time} น.
                            </span>
                            <span className="text-slate-700 font-mono">
                              ฟีดเดอร์: {sub.Feeder}
                            </span>
                            <span className="text-slate-500 max-w-[280px] truncate">
                              {sub.Custom_Detail || sub.Work_Area}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setDetailModalTask(sub)}
                              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[11px] font-medium"
                            >
                              รายละเอียด
                            </button>
                            {userRole === 'admin' && (
                              <>
                                <button
                                  onClick={() => onNavigateToPrint(sub.Sub_ID)}
                                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px]"
                                >
                                  พิมพ์ใบปะหน้า
                                </button>
                                <button
                                  onClick={() => onNavigateToForm(sub.Job_ID, sub.Sub_ID)}
                                  className="px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-medium"
                                >
                                  แก้ไขวันนี้
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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
