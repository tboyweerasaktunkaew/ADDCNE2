import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ActivePage, UserRole, TaskItem, VSPPMaster, PEAMaster, PersonnelMaster, SubstationMaster, FeederNoMaster } from './types/grid';
import { StorageService } from './services/storage';
import { detectConflicts } from './utils/conflictDetector';
import { NavigationHeader } from './components/NavigationHeader';
import { DashboardView } from './components/DashboardView';
import { JobFormView } from './components/JobFormView';
import { CalendarView } from './components/CalendarView';
import { PrintView } from './components/PrintView';
import { MasterDataView } from './components/MasterDataView';
import { SetupGuideView } from './components/SetupGuideView';

export default function App() {
  // Navigation & Role State
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [userRole, setUserRoleState] = useState<UserRole>(() => StorageService.getUserRole());

  // Master & Task Data State
  const [tasks, setTasks] = useState<TaskItem[]>(() => StorageService.getTasks());
  const [vsppList, setVsppList] = useState<VSPPMaster[]>(() => StorageService.getVSPPMaster());
  const [peaList, setPeaList] = useState<PEAMaster[]>(() => StorageService.getPEAMaster());
  const [personnelList, setPersonnelList] = useState<PersonnelMaster[]>(() => StorageService.getPersonnelMaster());
  const [substationList, setSubstationList] = useState<SubstationMaster[]>(() => StorageService.getSubstationMaster());
  const [feederNoList, setFeederNoList] = useState<FeederNoMaster[]>(() => StorageService.getFeederNoMaster());

  // Cloud & Sync State
  const [gasUrl, setGasUrl] = useState<string>(() => StorageService.getGasUrl());
  const [gasConnected, setGasConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form & Print Navigation Targets
  const [editJobId, setEditJobId] = useState<string | undefined>(undefined);
  const [editSubId, setEditSubId] = useState<string | undefined>(undefined);
  const [printSubId, setPrintSubId] = useState<string | undefined>(undefined);

  // Helper for displaying toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  }, []);

  // Set user role and persist
  const setUserRole = useCallback((role: UserRole) => {
    setUserRoleState(role);
    StorageService.setUserRole(role);
    if (role === 'viewer' && activePage !== 'dashboard' && activePage !== 'calendar') {
      setActivePage('dashboard');
    }
  }, [activePage]);

  // Enforce page restriction for Viewer role
  useEffect(() => {
    if (userRole === 'viewer' && activePage !== 'dashboard' && activePage !== 'calendar') {
      setActivePage('dashboard');
    }
  }, [userRole, activePage]);

  // Compute Conflicts dynamically across all scheduled tasks
  const conflicts = useMemo(() => {
    return detectConflicts(tasks);
  }, [tasks]);

  // Sync data from Google Apps Script
  const handleSyncData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await StorageService.syncFromGas();
      if (res.success) {
        setTasks(StorageService.getTasks());
        setVsppList(StorageService.getVSPPMaster());
        setPeaList(StorageService.getPEAMaster());
        setPersonnelList(StorageService.getPersonnelMaster());
        setSubstationList(StorageService.getSubstationMaster());
        setFeederNoList(StorageService.getFeederNoMaster());
        setGasConnected(true);
        showToast(res.message);
      } else {
        setGasConnected(false);
        showToast(res.message);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(`ซิงก์ข้อมูลล้มเหลว: ${errMsg}`);
    } finally {
      setIsSyncing(false);
    }
  }, [showToast]);

  // Initial auto-sync from Google Apps Script URL if configured
  useEffect(() => {
    const currentGas = StorageService.getGasUrl();
    if (currentGas) {
      handleSyncData();
    }
  }, [handleSyncData]);

  // Save Job Batch (Multi-Day Sub_IDs)
  const handleSaveJobBatch = useCallback(
    async (items: TaskItem[]) => {
      if (!items || items.length === 0) return;
      const targetJobId = items[0].Job_ID;

      // Update local tasks
      setTasks((prevTasks) => {
        // Remove old entries for this Job_ID if editing, then append new ones
        const remaining = prevTasks.filter((t) => t.Job_ID !== targetJobId);
        const updated = [...remaining, ...items];
        StorageService.saveTasks(updated);
        return updated;
      });

      showToast(`บันทึกแผนงาน ${targetJobId} (${items.length} วัน) เรียบร้อยแล้ว`);

      // Push to Google Apps Script in background if configured
      if (StorageService.getGasUrl()) {
        StorageService.pushJobBatchToGas(items).catch(console.warn);
      }
    },
    [showToast]
  );

  // Update specific sub task status
  const handleUpdateSubTaskStatus = useCallback(
    (
      subId: string,
      dailyStatus: TaskItem['Daily_Status'],
      overallStatus?: TaskItem['Overall_Status']
    ) => {
      setTasks((prev) => {
        const updated = prev.map((t) => {
          if (t.Sub_ID === subId) {
            return {
              ...t,
              Daily_Status: dailyStatus,
              Overall_Status: overallStatus || t.Overall_Status,
            };
          }
          return t;
        });
        StorageService.saveTasks(updated);
        return updated;
      });

      showToast(`อัปเดตสถานะ ${subId} เรียบร้อยแล้ว`);

      // Push to GAS
      if (StorageService.getGasUrl()) {
        StorageService.pushSubTaskUpdateToGas(subId, {
          Daily_Status: dailyStatus,
          ...(overallStatus ? { Overall_Status: overallStatus } : {}),
        }).catch(console.warn);
      }
    },
    [showToast]
  );

  // Delete specific sub task
  const handleDeleteSubTask = useCallback(
    (subId: string) => {
      if (!window.confirm(`ยืนยันการลบรายการวันปฏิบัติงาน ${subId}?`)) return;

      setTasks((prev) => {
        const updated = prev.filter((t) => t.Sub_ID !== subId);
        StorageService.saveTasks(updated);
        return updated;
      });

      showToast(`ลบรายการ ${subId} สำเร็จ`);

      if (StorageService.getGasUrl()) {
        StorageService.pushDeleteSubTaskToGas(subId).catch(console.warn);
      }
    },
    [showToast]
  );

  // VSPP Master CRUD
  const handleSaveVSPP = useCallback(
    async (record: VSPPMaster) => {
      setVsppList((prev) => {
        const existingIdx = prev.findIndex((v) => v.VSPP_ID === record.VSPP_ID);
        let updated: VSPPMaster[];
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = record;
        } else {
          updated = [...prev, record];
        }
        StorageService.saveVSPPMaster(updated);
        return updated;
      });

      if (StorageService.getGasUrl()) {
        StorageService.pushVSPPToGas(record, false).catch(console.warn);
      }
    },
    []
  );

  const handleDeleteVSPP = useCallback(
    async (vsppId: string) => {
      if (!window.confirm(`ยืนยันการลบข้อมูลโรงไฟฟ้า ${vsppId}?`)) return;

      setVsppList((prev) => {
        const updated = prev.filter((v) => v.VSPP_ID !== vsppId);
        StorageService.saveVSPPMaster(updated);
        return updated;
      });

      showToast(`ลบข้อมูล VSPP ${vsppId} สำเร็จ`);

      if (StorageService.getGasUrl()) {
        StorageService.pushVSPPToGas({ VSPP_ID: vsppId } as VSPPMaster, true).catch(
          console.warn
        );
      }
    },
    [showToast]
  );

  // PEA Master CRUD
  const handleSavePEA = useCallback(
    async (record: PEAMaster) => {
      setPeaList((prev) => {
        const existingIdx = prev.findIndex((p) => p.PEA_ID === record.PEA_ID);
        let updated: PEAMaster[];
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = record;
        } else {
          updated = [...prev, record];
        }
        StorageService.savePEAMaster(updated);
        return updated;
      });

      if (StorageService.getGasUrl()) {
        StorageService.pushPEAToGas(record, false).catch(console.warn);
      }
    },
    []
  );

  const handleDeletePEA = useCallback(
    async (peaId: string) => {
      if (!window.confirm(`ยืนยันการลบข้อมูลการไฟฟ้า ${peaId}?`)) return;

      setPeaList((prev) => {
        const updated = prev.filter((p) => p.PEA_ID !== peaId);
        StorageService.savePEAMaster(updated);
        return updated;
      });

      showToast(`ลบข้อมูล PEA ${peaId} สำเร็จ`);

      if (StorageService.getGasUrl()) {
        StorageService.pushPEAToGas({ PEA_ID: peaId } as PEAMaster, true).catch(
          console.warn
        );
      }
    },
    [showToast]
  );

  // Personnel Master CRUD
  const handleSavePersonnel = useCallback(
    async (record: PersonnelMaster) => {
      setPersonnelList((prev) => {
        const existingIdx = prev.findIndex((p) => p.id === record.id);
        let updated: PersonnelMaster[];
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = record;
        } else {
          updated = [...prev, record];
        }
        StorageService.savePersonnelMaster(updated);
        return updated;
      });
      showToast(`บันทึกข้อมูลเจ้าหน้าที่ ${record.name} เรียบร้อยแล้ว`);
      if (StorageService.getGasUrl()) {
        StorageService.pushPersonnelToGas(record, false).catch(console.warn);
      }
    },
    [showToast]
  );

  const handleDeletePersonnel = useCallback(
    async (id: string) => {
      if (!window.confirm('ยืนยันการลบข้อมูลเจ้าหน้าที่นี้?')) return;

      setPersonnelList((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        StorageService.savePersonnelMaster(updated);
        return updated;
      });

      showToast('ลบข้อมูลเจ้าหน้าที่เรียบร้อยแล้ว');
      if (StorageService.getGasUrl()) {
        StorageService.pushPersonnelToGas({ id } as PersonnelMaster, true).catch(console.warn);
      }
    },
    [showToast]
  );

  // Substation Master CRUD
  const handleSaveSubstation = useCallback(
    async (record: SubstationMaster) => {
      setSubstationList((prev) => {
        const existingIdx = prev.findIndex((s) => s.Substation_Code === record.Substation_Code);
        let updated: SubstationMaster[];
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = record;
        } else {
          updated = [...prev, record];
        }
        StorageService.saveSubstationMaster(updated);
        return updated;
      });
      showToast(`บันทึกข้อมูลสถานี ${record.Substation_Code} เรียบร้อยแล้ว`);
      if (StorageService.getGasUrl()) {
        StorageService.pushSubstationToGas(record, false).catch(console.warn);
      }
    },
    [showToast]
  );

  const handleDeleteSubstation = useCallback(
    async (substationCode: string) => {
      if (!window.confirm(`ยืนยันการลบข้อมูลสถานี ${substationCode}?`)) return;

      const targetRecord = substationList.find((s) => s.Substation_Code === substationCode);

      setSubstationList((prev) => {
        const updated = prev.filter((s) => s.Substation_Code !== substationCode);
        StorageService.saveSubstationMaster(updated);
        return updated;
      });

      showToast(`ลบข้อมูลสถานี ${substationCode} เรียบร้อยแล้ว`);
      if (StorageService.getGasUrl() && targetRecord) {
        StorageService.pushSubstationToGas(targetRecord, true).catch(console.warn);
      }
    },
    [showToast, substationList]
  );

  // Feeder No Master CRUD
  const handleSaveFeederNo = useCallback(
    async (record: FeederNoMaster) => {
      setFeederNoList((prev) => {
        const existingIdx = prev.findIndex((f) => f.Feeder_No === record.Feeder_No);
        let updated: FeederNoMaster[];
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = record;
        } else {
          updated = [...prev, record];
        }
        StorageService.saveFeederNoMaster(updated);
        return updated;
      });
      showToast(`บันทึกข้อมูลฟีดเดอร์ ${record.Feeder_No} เรียบร้อยแล้ว`);
      if (StorageService.getGasUrl()) {
        StorageService.pushFeederNoToGas(record, false).catch(console.warn);
      }
    },
    [showToast]
  );

  const handleDeleteFeederNo = useCallback(
    async (feederNo: string) => {
      if (!window.confirm(`ยืนยันการลบข้อมูลฟีดเดอร์ ${feederNo}?`)) return;

      const targetRecord = feederNoList.find((f) => f.Feeder_No === feederNo);

      setFeederNoList((prev) => {
        const updated = prev.filter((f) => f.Feeder_No !== feederNo);
        StorageService.saveFeederNoMaster(updated);
        return updated;
      });

      showToast(`ลบข้อมูลฟีดเดอร์ ${feederNo} เรียบร้อยแล้ว`);
      if (StorageService.getGasUrl() && targetRecord) {
        StorageService.pushFeederNoToGas(targetRecord, true).catch(console.warn);
      }
    },
    [showToast, feederNoList]
  );

  // Batch Master Data Saves (for Excel/CSV Import)
  const handleBatchSaveVSPP = useCallback(async (records: VSPPMaster[]) => {
    const updated = StorageService.saveVSPPMasterBatch(records);
    setVsppList(updated);
    if (StorageService.getGasUrl()) {
      for (const r of records) {
        StorageService.pushVSPPToGas(r, false).catch(console.warn);
      }
    }
  }, []);

  const handleBatchSavePEA = useCallback(async (records: PEAMaster[]) => {
    const updated = StorageService.savePEAMasterBatch(records);
    setPeaList(updated);
    if (StorageService.getGasUrl()) {
      for (const r of records) {
        StorageService.pushPEAToGas(r, false).catch(console.warn);
      }
    }
  }, []);

  const handleBatchSavePersonnel = useCallback(async (records: PersonnelMaster[]) => {
    const updated = StorageService.savePersonnelMasterBatch(records);
    setPersonnelList(updated);
    if (StorageService.getGasUrl()) {
      for (const r of records) {
        StorageService.pushPersonnelToGas(r, false).catch(console.warn);
      }
    }
  }, []);

  const handleBatchSaveSubstation = useCallback(async (records: SubstationMaster[]) => {
    const updated = StorageService.saveSubstationMasterBatch(records);
    setSubstationList(updated);
    if (StorageService.getGasUrl()) {
      for (const r of records) {
        StorageService.pushSubstationToGas(r, false).catch(console.warn);
      }
    }
  }, []);

  const handleBatchSaveFeederNo = useCallback(async (records: FeederNoMaster[]) => {
    const updated = StorageService.saveFeederNoMasterBatch(records);
    setFeederNoList(updated);
    if (StorageService.getGasUrl()) {
      for (const r of records) {
        StorageService.pushFeederNoToGas(r, false).catch(console.warn);
      }
    }
  }, []);

  // Reset to Demo Data
  const handleResetDemo = useCallback(() => {
    if (window.confirm('ยืนยันการรีเซ็ตข้อมูลตัวอย่างเริ่มต้นทั้งหมดหรือไม่?')) {
      StorageService.resetToDemo();
      setTasks(StorageService.getTasks());
      setVsppList(StorageService.getVSPPMaster());
      setPeaList(StorageService.getPEAMaster());
      setPersonnelList(StorageService.getPersonnelMaster());
      setSubstationList(StorageService.getSubstationMaster());
      setFeederNoList(StorageService.getFeederNoMaster());
      showToast('โหลดข้อมูลตัวอย่างเรียบร้อยแล้ว');
    }
  }, [showToast]);

  // Navigate to Form
  const handleNavigateToForm = useCallback((jobId?: string, subId?: string) => {
    setEditJobId(jobId);
    setEditSubId(subId);
    setActivePage('form');
  }, []);

  // Navigate to Print
  const handleNavigateToPrint = useCallback((subId: string) => {
    setPrintSubId(subId);
    setActivePage('print');
  }, []);

  // Distinct PEA list for filtering
  const distinctPeaNames = useMemo(() => {
    const fromMaster = peaList.map((p) => p.PEA_Short);
    const fromTasks = tasks.map((t) => t.PEA_Request);
    return Array.from(new Set([...fromMaster, ...fromTasks])).filter(Boolean);
  }, [peaList, tasks]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* Top Bar Navigation (Clean 3-Zone Contract) */}
      <NavigationHeader
        activePage={activePage}
        setActivePage={(page) => {
          if (page === 'form') {
            setEditJobId(undefined);
            setEditSubId(undefined);
          }
          setActivePage(page);
        }}
        userRole={userRole}
        setUserRole={setUserRole}
        gasConnected={gasConnected}
        isSyncing={isSyncing}
        onSync={handleSyncData}
        conflictCount={conflicts.length}
      />

      {/* In-app Toast Banner */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Multi-Page View Container (Zero Popups/Modals) */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 pt-5">
        {/* Page 1: Dashboard / Job List */}
        {activePage === 'dashboard' && (
          <DashboardView
            tasks={tasks}
            conflicts={conflicts}
            userRole={userRole}
            onNavigateToForm={handleNavigateToForm}
            onNavigateToPrint={handleNavigateToPrint}
            onDeleteSubTask={handleDeleteSubTask}
            onUpdateSubTaskStatus={handleUpdateSubTaskStatus}
            peaList={distinctPeaNames}
          />
        )}

        {/* Page 2: Full-Page Multi-Day Job Form */}
        {activePage === 'form' && (
          <JobFormView
            initialJobId={editJobId}
            initialSubId={editSubId}
            existingTasks={tasks}
            vsppList={vsppList}
            peaList={peaList}
            personnelList={personnelList}
            substationList={substationList}
            feederNoList={feederNoList}
            onSaveJobBatch={handleSaveJobBatch}
            onCancel={() => {
              setEditJobId(undefined);
              setEditSubId(undefined);
              setActivePage('dashboard');
            }}
          />
        )}

        {/* Page 3: Calendar & Conflict Inspector */}
        {activePage === 'calendar' && (
          <CalendarView
            tasks={tasks}
            conflicts={conflicts}
            userRole={userRole}
            onNavigateToForm={handleNavigateToForm}
            onNavigateToPrint={handleNavigateToPrint}
          />
        )}

        {/* Page 4: Document Printing & PDF Export (A4 Sheets) */}
        {activePage === 'print' && (
          <PrintView
            tasks={tasks}
            vsppList={vsppList}
            peaList={peaList}
            initialSubId={printSubId}
            onBack={() => setActivePage('dashboard')}
          />
        )}

        {/* Page 5: Master Data Management (VSPP & PEA & Personnel & Substation/Feeder) */}
        {activePage === 'master' && userRole === 'admin' && (
          <MasterDataView
            vsppList={vsppList}
            peaList={peaList}
            personnelList={personnelList}
            substationList={substationList}
            feederNoList={feederNoList}
            userRole={userRole}
            gasConnected={gasConnected}
            isSyncing={isSyncing}
            onSync={handleSyncData}
            onSaveVSPP={handleSaveVSPP}
            onDeleteVSPP={handleDeleteVSPP}
            onSavePEA={handleSavePEA}
            onDeletePEA={handleDeletePEA}
            onSavePersonnel={handleSavePersonnel}
            onDeletePersonnel={handleDeletePersonnel}
            onSaveSubstation={handleSaveSubstation}
            onDeleteSubstation={handleDeleteSubstation}
            onSaveFeederNo={handleSaveFeederNo}
            onDeleteFeederNo={handleDeleteFeederNo}
            onBatchSaveVSPP={handleBatchSaveVSPP}
            onBatchSavePEA={handleBatchSavePEA}
            onBatchSavePersonnel={handleBatchSavePersonnel}
            onBatchSaveSubstation={handleBatchSaveSubstation}
            onBatchSaveFeederNo={handleBatchSaveFeederNo}
          />
        )}

        {/* Page 6: Google Apps Script Setup & GitHub Pages Deployment Guide */}
        {activePage === 'setup' && (
          <SetupGuideView
            gasUrl={gasUrl}
            onSaveGasUrl={(url) => {
              StorageService.setGasUrl(url);
              setGasUrl(url);
              showToast('บันทึก Web App URL เรียบร้อยแล้ว');
            }}
            onTestConnection={async (url) => {
              const res = await StorageService.testGasConnection(url);
              setGasConnected(res.success);
              return res;
            }}
            onSync={handleSyncData}
            onResetDemo={handleResetDemo}
          />
        )}
      </main>

      {/* Clean System Footer */}
      <footer className="no-print border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>ศูนย์ควบคุมการจ่ายไฟฟ้า กฟฉ.2 อุบลราชธานี — ระบบบริหารจัดการแผนงานดับไฟและปฏิบัติการระบบไฟฟ้า</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>สิทธิ์ผู้ใช้: <strong className="text-slate-800">{userRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ดูข้อมูล'}</strong></span>
            <span>·</span>
            <span>ฐานข้อมูล: {gasConnected ? 'Google Sheets' : 'บันทึกในเครื่อง'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
