import React from 'react';
import { ActivePage, UserRole } from '../types/grid';
import {
  LayoutDashboard,
  FilePlus2,
  Calendar,
  Printer,
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  User,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface NavigationHeaderProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  gasConnected: boolean;
  isSyncing: boolean;
  onSync: () => void;
  conflictCount: number;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  activePage,
  setActivePage,
  userRole,
  setUserRole,
  gasConnected,
  isSyncing,
  onSync,
}) => {
  const allNavItems: { id: ActivePage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
    { id: 'form', label: 'บันทึก/แก้ไขงาน', icon: FilePlus2 },
    { id: 'calendar', label: 'ปฏิทินงาน', icon: Calendar },
    { id: 'print', label: 'พิมพ์เอกสาร A4', icon: Printer },
    { id: 'master', label: 'ข้อมูลพื้นฐาน', icon: Database },
    { id: 'setup', label: 'เชื่อมต่อ Google Sheets', icon: Cloud },
  ];

  const navItems = userRole === 'viewer'
    ? allNavItems.filter((item) => item.id === 'dashboard' || item.id === 'calendar')
    : allNavItems;

  return (
    <header className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 text-slate-900">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
              <Zap className="w-4 h-4 fill-white/20" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">
                Dispatching Center NE2
              </span>
              <span className="text-[11px] text-slate-500 font-normal block leading-none mt-0.5">
                ศูนย์ควบคุมการจ่ายไฟฟ้า กฟฉ.2
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Minimal Typography Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto h-full scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`relative flex items-center gap-2 px-3 h-full text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-700 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Sync & Role Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              gasConnected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={gasConnected ? 'เชื่อมต่อ Google Sheets แล้ว' : 'โหมดบันทึกในเครื่อง'}
          >
            {gasConnected ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden md:inline">
              {isSyncing ? 'กำลังซิงก์...' : gasConnected ? 'Google Sheets' : 'บันทึกในเครื่อง'}
            </span>
          </button>

          <div className="flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setUserRole('admin')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                userRole === 'admin'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${userRole === 'admin' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>ผู้ดูแล</span>
            </button>
            <button
              onClick={() => setUserRole('viewer')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                userRole === 'viewer'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className={`w-3.5 h-3.5 ${userRole === 'viewer' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>ผู้ดูข้อมูล</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
