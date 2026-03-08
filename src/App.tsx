import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AppView, RiskArea, Notification, Incident } from './types';
import AMapView from './components/AMapView';
import {
  Map as MapIcon, TrendingUp, AlertTriangle, Navigation, Search, Bell, Settings,
  ChevronRight, Accessibility, Siren, Info, CheckCircle2, X, User, Activity, MapPin,
  Clock, ShieldCheck, Plus, Minus, Phone, Timer, Heart, BellPlus,
  Footprints, Moon, Droplets, Home, Zap
} from 'lucide-react';

const RISK_AREAS: RiskArea[] = [
  { id: '1', name: '北广场片区', riskLevel: '极高', percentage: 84, activeCases: 156, trend: 'up', population: 1200, description: '该区域为高密度住宅区，近期检测到多起聚集性感染。', coordinates: { top: '30%', left: '38%' } },
  { id: '2', name: '社区中心', riskLevel: '中等', percentage: 52, activeCases: 42, trend: 'stable', population: 800, description: '公共服务中心，人流量较大。', coordinates: { top: '55%', left: '45%' } },
  { id: '3', name: '中心交通枢纽', riskLevel: '中等', percentage: 48, activeCases: 35, trend: 'down', population: 2500, description: '交通枢纽区域，流动人口多。', coordinates: { top: '40%', left: '65%' } },
];

const NOTIFICATIONS: Notification[] = [
  { id: '1', title: '强制佩戴口罩区域', content: '由于流感样症状激增，第4区和中央广场立即生效。', time: '12分钟前', type: 'danger', isRead: false },
  { id: '2', title: '移动检测诊所', content: '位于东侧图书馆。开放至下午6:00。', time: '1小时前', type: 'info', isRead: false },
  { id: '3', title: '避让警告', content: '地铁站空气传感器检测到高病毒载量。', time: '3小时前', type: 'warning', isRead: false },
  { id: '4', title: '区域清理完毕', content: '西侧健身房已完成深度消毒。', time: '5小时前', type: 'success', isRead: false },
];

const INCIDENTS: Incident[] = [
  { id: '1', type: '检测到摔倒', location: '爱华里', resident: '王建国', time: '02:14', status: 'pending', distance: '0.2公里', image: '', coordinates: [117.188, 39.149] as [number, number] },
  { id: '2', type: '紧急求助', location: '估衣街', resident: '李明华', time: '02:18', status: 'pending', distance: '0.3公里', image: '', coordinates: [117.183, 39.151] as [number, number] },
  { id: '3', type: '健康异常', location: '天津都行商城', resident: '张伟', time: '02:25', status: 'pending', distance: '0.4公里', image: '', coordinates: [117.186, 39.148] as [number, number] },
  { id: '4', type: '突发晕倒', location: '北大关', resident: '赵丽', time: '02:30', status: 'pending', distance: '0.3公里', image: '', coordinates: [117.179, 39.147] as [number, number] },
  { id: '5', type: '紧急求助', location: '爱华里附近', resident: '刘强', time: '02:35', status: 'pending', distance: '0.2公里', image: '', coordinates: [117.189, 39.150] as [number, number] },
  { id: '6', type: '健康异常', location: '估衣街西口', resident: '陈芳', time: '02:40', status: 'pending', distance: '0.3公里', image: '', coordinates: [117.180, 39.152] as [number, number] },
  { id: '7', type: '检测到摔倒', location: '天津都行商城北', resident: '周杰', time: '02:45', status: 'pending', distance: '0.4公里', image: '', coordinates: [117.185, 39.150] as [number, number] },
  { id: '8', type: '突发晕倒', location: '北大关南', resident: '孙娟', time: '02:50', status: 'pending', distance: '0.3公里', image: '', coordinates: [117.177, 39.148] as [number, number] },
  { id: '9', type: '紧急求助', location: '估衣街中段', resident: '吴磊', time: '02:55', status: 'pending', distance: '0.2公里', image: '', coordinates: [117.181, 39.149] as [number, number] },
  { id: '10', type: '健康异常', location: '爱华里东', resident: '郑浩', time: '03:00', status: 'pending', distance: '0.3公里', image: '', coordinates: [117.190, 39.147] as [number, number] },
];

const STATS_DATA = {
  responseTime: {
    title: '平均响应时间',
    value: '8.5分钟',
    icon: Timer,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    unit: '分钟',
    weekly: [12, 10, 9, 11, 8, 7, 8.5],
    monthly: [15, 14, 12, 11, 10, 9, 8.5, 9, 10, 8, 7, 8.5],
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    monthlyLabels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  },
  activeAlerts: {
    title: '活动警报',
    value: '3',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    unit: '次',
    weekly: [5, 3, 4, 2, 6, 4, 3],
    monthly: [12, 8, 15, 10, 7, 9, 11, 6, 8, 5, 4, 3],
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    monthlyLabels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  },
  healthIndex: {
    title: '社区健康指数',
    value: '良好',
    icon: Heart,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    unit: '分',
    weekly: [78, 82, 85, 80, 88, 90, 92],
    monthly: [65, 70, 72, 75, 78, 80, 82, 85, 88, 90, 92, 95],
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    monthlyLabels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  }
};

type StatType = 'responseTime' | 'activeAlerts' | 'healthIndex';

const FAQ_DATA = [
  { id: '1', question: '如何申请检测包？', answer: '点击"申请检测包"，填写基本信息后提交，社区将安排配送。' },
  { id: '2', question: '检测结果如何查询？', answer: '检测结果将在24小时内通过短信或APP通知您。' },
  { id: '3', question: '如何联系家庭医生？', answer: '可拨打社区服务热线或在线预约家庭医生问诊。' },
  { id: '4', question: '症状严重怎么办？', answer: '如出现严重症状，请立即拨打120急救电话。' },
];

const HELP_INFO = {
  hotline: '400-888-9999',
  emergency: '120',
  police: '110',
  serviceHours: '周一至周日 8:00-20:00',
  address: '天津市红桥区三岔河口社区服务中心',
};

type HelpTab = 'form' | 'help' | 'faq';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>(AppView.HOME);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showHomeSearchResults, setShowHomeSearchResults] = useState(false);
  const [incidentsCollapsed, setIncidentsCollapsed] = useState(true);
  const [allIncidents, setAllIncidents] = useState<Incident[]>(INCIDENTS);
  const [activeDataLayer, setActiveDataLayer] = useState<'disease' | 'heat' | 'air'>('heat');

  // 根据搜索关键词过滤急救点
  const filteredIncidents = allIncidents.filter(incident =>
    incident.location.includes(searchQuery) ||
    incident.resident.includes(searchQuery) ||
    incident.type.includes(searchQuery)
  );

  // 处理搜索提交
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (activeView === AppView.HOME) {
        setShowHomeSearchResults(true);
      } else {
        setShowSearchResults(true);
      }
    }
  };

  // 选择搜索结果
  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsIncidentDismissed(false);
    setShowSearchResults(false);
  };

  const [selectedRiskArea, setSelectedRiskArea] = useState<RiskArea | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isIncidentDismissed, setIsIncidentDismissed] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDispatched, setIsDispatched] = useState(false);
  const [countdown, setCountdown] = useState(105);
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS);
  const [selectedStat, setSelectedStat] = useState<StatType | null>(null);
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly'>('weekly');
  const [helpTab, setHelpTab] = useState<HelpTab>('form');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [newNotification, setNewNotification] = useState({ title: '', content: '', type: 'info' as 'info' | 'warning' | 'danger' | 'success' });

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isDispatched && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev: number) => {
          if (prev <= 1) {
            setIsDispatched(false);
            return 105;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isDispatched, countdown]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isIncidentDismissed) {
      timer = setTimeout(() => setIsIncidentDismissed(false), 30000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [isIncidentDismissed]);

  // 当选择新事件时，重置忽略状态
  useEffect(() => {
    if (selectedIncident) {
      setIsIncidentDismissed(false);
    }
  }, [selectedIncident]);
  const handleZoomIn = () => setZoom((prev: number) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom((prev: number) => Math.max(prev - 0.2, 0.5));

  const renderLineChart = (stat: StatType) => {
    const data = STATS_DATA[stat];
    const values = timeRange === 'weekly' ? data.weekly : data.monthly;
    const labels = timeRange === 'weekly' ? data.labels : data.monthlyLabels;
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;
    const chartHeight = 140;
    const paddingX = 10;
    const chartInnerWidth = 280;
    const chartWidth = chartInnerWidth - paddingX * 2;

    const points = values.map((value: number, index: number) => {
      const x = paddingX + (index / (values.length - 1)) * chartWidth;
      const y = chartHeight - ((value - minValue) / range) * chartHeight;
      return { x, y, value, label: labels[index] };
    });

    const pathD = points.map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    return (
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">时间范围:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setTimeRange('weekly')}
              className={`px-3 py-1 text-xs rounded ${timeRange === 'weekly' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              每周
            </button>
            <button
              onClick={() => setTimeRange('monthly')}
              className={`px-3 py-1 text-xs rounded ${timeRange === 'monthly' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              每月
            </button>
          </div>
        </div>

        <div className="relative bg-slate-50 rounded-lg p-2">
          <div className="absolute left-0 top-1 bottom-6 w-8 flex flex-col justify-between text-[8px] text-slate-400">
            <span>{maxValue}{data.unit}</span>
            <span>{Math.round((maxValue + minValue) / 2)}{data.unit}</span>
            <span>{minValue}{data.unit}</span>
          </div>

          <div className="ml-8 mr-2">
            <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartInnerWidth} ${chartHeight}`} className="overflow-visible">
              <defs>
                <linearGradient id={`gradient-${stat}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={stat === 'activeAlerts' ? '#ef4444' : stat === 'healthIndex' ? '#10b981' : '#3b82f6'} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={stat === 'activeAlerts' ? '#ef4444' : stat === 'healthIndex' ? '#10b981' : '#3b82f6'} stopOpacity="0.05" />
                </linearGradient>
              </defs>

              <line x1={paddingX} y1="0" x2={paddingX} y2={chartHeight} stroke="#e2e8f0" strokeWidth="1" />
              <line x1={paddingX} y1={chartHeight / 3} x2={chartInnerWidth - 10} y2={chartHeight / 3} stroke="#e2e8f0" strokeDasharray="4" />
              <line x1={paddingX} y1={(chartHeight * 2) / 3} x2={chartInnerWidth - 10} y2={(chartHeight * 2) / 3} stroke="#e2e8f0" strokeDasharray="4" />
              <line x1={paddingX} y1={chartHeight} x2={chartInnerWidth - 10} y2={chartHeight} stroke="#e2e8f0" strokeWidth="1" />

              <path d={`${pathD} L ${paddingX + chartWidth} ${chartHeight} L ${paddingX} ${chartHeight} Z`} fill={`url(#gradient-${stat})`} />

              <path d={pathD} fill="none" stroke={stat === 'activeAlerts' ? '#ef4444' : stat === 'healthIndex' ? '#10b981' : '#3b82f6'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {points.map((point, index) => (
                <g key={index}>
                  <circle cx={point.x} cy={point.y} r="3" fill="white" stroke={stat === 'activeAlerts' ? '#ef4444' : stat === 'healthIndex' ? '#10b981' : '#3b82f6'} strokeWidth="2" />
                  <title>{point.label}: {point.value}{data.unit}</title>
                </g>
              ))}
            </svg>

            <div className="flex justify-between text-[8px] text-slate-400 mt-1 px-1">
              {labels.map((label: string, index: number) => (
                <span key={index} className="flex-1 text-center">{label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background-light text-slate-900 overflow-hidden">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-1.5 rounded-lg text-white">
            <Activity size={24} />
          </div>
          <h2 className="text-xl font-bold tracking-tight">智康社区</h2>
        </div>
        <div className="flex-1 max-w-xl mx-8">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="w-full bg-slate-100 border-none rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary text-sm outline-none"
                placeholder="搜索健康档案，服务..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
              />
            </div>
          </form>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveView(AppView.NOTIFICATIONS)} className="p-2 rounded-lg relative">
            <Bell size={20} />
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white">
              <User size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">张先生</span>
              <span className="text-[10px] text-primary">高级居民</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {activeView !== AppView.HOME && (
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col p-4 shrink-0 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">
              {activeView === AppView.HEALTH_RISK ? '主仪表板' : activeView === AppView.ACCESSIBILITY ? '监测' : '应急监测'}
            </h3>
            <nav className="space-y-1">
              <button onClick={() => setActiveView(AppView.EMERGENCY_RESPONSE)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${activeView === AppView.EMERGENCY_RESPONSE ? 'bg-primary text-white' : 'hover:bg-slate-100'}`}>
                <Siren size={20} /><span className="text-sm">应急响应</span>
              </button>
              <button onClick={() => setActiveView(AppView.HEALTH_RISK)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${activeView === AppView.HEALTH_RISK ? 'bg-primary text-white' : 'hover:bg-slate-100'}`}>
                <MapIcon size={20} /><span className="text-sm">健康风险热力图</span>
              </button>
              <button onClick={() => setActiveView(AppView.ACCESSIBILITY)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${activeView === AppView.ACCESSIBILITY ? 'bg-primary text-white' : 'hover:bg-slate-100'}`}>
                <Accessibility size={20} /><span className="text-sm">无障碍出行</span>
              </button>
              <button onClick={() => setActiveView(AppView.SITE_ANALYSIS)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${activeView === AppView.SITE_ANALYSIS ? 'bg-primary text-white' : 'hover:bg-slate-100'}`}>
                <MapPin size={20} /><span className="text-sm">基地坐标系</span>
              </button>
            </nav>
          </div>

          {activeView === AppView.EMERGENCY_RESPONSE && (
            <div className="mb-4">
              <button
                onClick={() => { console.log('点击了紧急事件，incidentsCollapsed:', !incidentsCollapsed); setIncidentsCollapsed(!incidentsCollapsed); }}
                className="w-full flex items-center justify-between px-2 mb-2 cursor-pointer hover:bg-slate-100 rounded py-1"
              >
                <h4 className="text-xs font-bold text-slate-600">紧急事件 ({allIncidents.length})</h4>
                <ChevronRight
                  size={16}
                  className={`text-slate-400 transition-transform ${incidentsCollapsed ? '' : 'rotate-90'}`}
                />
              </button>
              {!incidentsCollapsed && (
                <div className="space-y-2">
                  {(searchQuery ? filteredIncidents : allIncidents).map(incident => (
                    <button key={incident.id} onClick={() => { setSelectedIncident(incident); setIsIncidentDismissed(false); }} className={`w-full p-2 rounded-lg text-left transition-colors ${selectedIncident?.id === incident.id ? 'bg-red-50 border border-red-200' : 'bg-slate-50 hover:bg-slate-100'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-600">{incident.type}</span>
                        <span className="text-[10px] text-slate-400">{incident.time}</span>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1">{incident.location}</p>
                      <p className="text-[9px] text-slate-400">{incident.resident} · {incident.distance}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === AppView.EMERGENCY_RESPONSE && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-600 mb-2 px-2">社区统计</h4>
              <div className="space-y-2">
                <button onClick={() => setSelectedStat(selectedStat === 'responseTime' ? null : 'responseTime')} className={`w-full p-2 rounded-lg text-left transition-all ${selectedStat === 'responseTime' ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 hover:bg-slate-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-6 bg-blue-50 rounded flex items-center justify-center"><Timer size={14} className="text-blue-600" /></div>
                      <span className="text-[10px] font-medium">平均响应时间</span>
                    </div>
                    <span className="text-xs font-bold text-blue-600">{STATS_DATA.responseTime.value}</span>
                  </div>
                </button>

                <button onClick={() => setSelectedStat(selectedStat === 'activeAlerts' ? null : 'activeAlerts')} className={`w-full p-2 rounded-lg text-left transition-all ${selectedStat === 'activeAlerts' ? 'bg-red-50 border border-red-200' : 'bg-slate-50 hover:bg-slate-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-6 bg-red-50 rounded flex items-center justify-center"><AlertTriangle size={14} className="text-red-600" /></div>
                      <span className="text-[10px] font-medium">活动警报</span>
                    </div>
                    <span className="text-xs font-bold text-red-600">{STATS_DATA.activeAlerts.value}</span>
                  </div>
                </button>

                <button onClick={() => setSelectedStat(selectedStat === 'healthIndex' ? null : 'healthIndex')} className={`w-full p-2 rounded-lg text-left transition-all ${selectedStat === 'healthIndex' ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 hover:bg-slate-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-6 bg-emerald-50 rounded flex items-center justify-center"><Heart size={14} className="text-emerald-600" /></div>
                      <span className="text-[10px] font-medium">社区健康指数</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">{STATS_DATA.healthIndex.value}</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeView === AppView.HEALTH_RISK && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-600 mb-2 px-2">活动数据层</h4>
              <div className="grid grid-cols-3 gap-1 mb-3">
                <button onClick={() => setActiveDataLayer('disease')} className={`p-2 rounded-lg text-[10px] font-medium text-center transition-colors ${activeDataLayer === 'disease' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  传染病
                </button>
                <button onClick={() => setActiveDataLayer('heat')} className={`p-2 rounded-lg text-[10px] font-medium text-center transition-colors ${activeDataLayer === 'heat' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  商业活力
                </button>
                <button onClick={() => setActiveDataLayer('air')} className={`p-2 rounded-lg text-[10px] font-medium text-center transition-colors ${activeDataLayer === 'air' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  空气污染物
                </button>
              </div>
              <h4 className="text-xs font-bold text-slate-600 mb-2 px-2">风险区域统计</h4>
              <div className="space-y-3">
                {RISK_AREAS.map(area => (
                  <div key={area.id} onClick={() => setSelectedRiskArea(area)} className={`p-2 rounded-lg cursor-pointer transition-colors ${selectedRiskArea?.id === area.id ? 'bg-primary/10 border border-primary/30' : 'bg-slate-50 hover:bg-slate-100'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{area.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${area.riskLevel === '极高' ? 'bg-red-100 text-red-600' : area.riskLevel === '中等' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>{area.riskLevel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${area.percentage}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-500">{area.percentage}%</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">{area.activeCases} 活跃病例 · {area.population} 人口</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-500">社区健康指数</p>
              <TrendingUp size={12} className="text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-primary">良好</p>
            <p className="text-[9px] text-slate-400">较昨日上升 3.2%</p>
          </div>

          <div className="mt-3 bg-primary/10 rounded-xl p-3">
            <p className="text-xs font-bold text-primary mb-1">健康支持</p>
            <p className="text-[10px] text-slate-500 mb-3">报告新症状或申请检测包。</p>
            <button onClick={() => setActiveView(AppView.HEALTH_SUPPORT)} className="w-full bg-primary text-white text-xs font-bold py-2 rounded-lg">寻求帮助</button>
          </div>
        </aside>
        )}

        <div className="flex-1 relative">
          {/* 主界面/Home View */}
          {activeView === AppView.HOME && (
          <div className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50 overflow-y-auto">
            <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">
              {/* 欢迎标题 */}
              <div className="mb-10">
                <h1 className="text-3xl font-bold text-slate-800">欢迎回来，张先生</h1>
                <p className="text-slate-500 text-sm mt-1">祝您今天健康愉快</p>
              </div>

              {/* 两列布局 */}
              <div className="grid grid-cols-3 gap-8 flex-1">
                {/* 左侧列 */}
                <div className="col-span-2">
                  {/* 个人健康概览 */}
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-slate-700 mb-5">个人健康概览</h2>
                    <div className="grid grid-cols-2 gap-5">
                      <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <Heart size={20} className="text-red-500" />
                          <span className="text-[10px] text-emerald-500">正常</span>
                        </div>
                        <p className="text-2xl font-bold">72<span className="text-sm font-normal text-slate-400">bpm</span></p>
                        <p className="text-xs text-slate-400">心率</p>
                      </div>
                      <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <Footprints size={20} className="text-blue-500" />
                          <span className="text-[10px] text-emerald-500">达标</span>
                        </div>
                        <p className="text-2xl font-bold">8,523<span className="text-sm font-normal text-slate-400">步</span></p>
                        <p className="text-xs text-slate-400">今日步数</p>
                      </div>
                      <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <Moon size={20} className="text-indigo-500" />
                          <span className="text-[10px] text-emerald-500">良好</span>
                        </div>
                        <p className="text-2xl font-bold">7.5<span className="text-sm font-normal text-slate-400">小时</span></p>
                        <p className="text-xs text-slate-400">睡眠质量</p>
                      </div>
                      <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <Droplets size={20} className="text-cyan-500" />
                          <span className="text-[10px] text-emerald-500">充足</span>
                        </div>
                        <p className="text-2xl font-bold">1.8<span className="text-sm font-normal text-slate-400">L</span></p>
                        <p className="text-xs text-slate-400">饮水量</p>
                      </div>
                    </div>
                  </div>

                  {/* 快捷服务入口 */}
                  <div className="mt-auto">
                    <h2 className="text-xl font-bold text-slate-700 mb-5">快捷服务</h2>
                    <div className="grid grid-cols-3 gap-5">
                      <button onClick={() => setActiveView(AppView.EMERGENCY_RESPONSE)} className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition-shadow">
                        <Siren size={40} className="mb-4" />
                        <p className="font-bold text-xl">应急救援</p>
                        <p className="text-sm text-white/80 mt-2">紧急情况一键求助</p>
                      </button>
                      <button onClick={() => setActiveView(AppView.HEALTH_RISK)} className="bg-gradient-to-br from-primary to-emerald-500 rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition-shadow">
                        <Activity size={40} className="mb-4" />
                        <p className="font-bold text-xl">健康风险热力图</p>
                        <p className="text-sm text-white/80 mt-2">查看区域健康风险</p>
                      </button>
                      <button onClick={() => setActiveView(AppView.ACCESSIBILITY)} className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition-shadow">
                        <Accessibility size={40} className="mb-4" />
                        <p className="font-bold text-xl">无障碍出行</p>
                        <p className="text-sm text-white/80 mt-2">无障碍设施导航</p>
                      </button>
                      <button onClick={() => setActiveView(AppView.SITE_ANALYSIS)} className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition-shadow">
                        <MapPin size={40} className="mb-4" />
                        <p className="font-bold text-xl">基地坐标系</p>
                        <p className="text-sm text-white/80 mt-2">数据点采集与导出</p>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 右侧列 */}
                <div className="flex flex-col">
                  {/* 社区公告栏 */}
                  <div className="mb-6 flex-1">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-xl font-bold text-slate-700">社区公告栏</h2>
                      <button onClick={() => setActiveView(AppView.NOTIFICATIONS)} className="text-sm text-primary">查看全部</button>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                      <div className="space-y-4">
                        {notifications.slice(0, 3).map(notif => (
                          <div key={notif.id} className={`p-4 rounded-lg border-l-2 ${notif.type === 'danger' ? 'border-red-500 bg-red-50' : notif.type === 'warning' ? 'border-orange-500 bg-orange-50' : notif.type === 'success' ? 'border-emerald-500 bg-emerald-50' : 'border-primary bg-primary/5'}`}>
                            <p className="text-sm font-bold">{notif.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{notif.content}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{notif.time}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 一键求助按钮 */}
                  <div>
                    <button onClick={() => { const incidentTypes = ['紧急求助', '检测到摔倒', '健康异常', '突发晕倒']; const names = ['张先生', '李女士', '王大爷', '刘阿姨', '陈同学', '赵先生', '孙女士', '周大爷']; const locations = ['居民区', '商业街', '公园', '超市', '小区门口', '公交站']; let newCoords: [number, number]; let attempts = 0; do { newCoords = [117.177 + Math.random() * 0.015, 39.145 + Math.random() * 0.008] as [number, number]; attempts++; } while (allIncidents.some(inc => Math.abs(inc.coordinates[0] - newCoords[0]) < 0.003 && Math.abs(inc.coordinates[1] - newCoords[1]) < 0.003) && attempts < 50); const type = incidentTypes[Math.floor(Math.random() * incidentTypes.length)]; const name = names[Math.floor(Math.random() * names.length)]; const location = locations[Math.floor(Math.random() * locations.length)]; const distance = (Math.random() * 2).toFixed(1) + '公里'; const newIncident = { id: Date.now().toString(), type, location, resident: name, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), status: 'pending', distance, image: '', coordinates: newCoords }; setAllIncidents([newIncident, ...allIncidents]); setSelectedIncident(newIncident); setIsIncidentDismissed(false); setIncidentsCollapsed(false); setActiveView(AppView.EMERGENCY_RESPONSE); }} className="w-full flex items-center justify-center gap-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl p-8 shadow-lg transition-colors">
                      <Zap size={32} />
                      <span className="font-bold text-2xl">一键求助</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView !== AppView.HOME && (
          <AMapView
            riskAreas={RISK_AREAS}
            incidents={allIncidents}
            activeView={activeView}
            activeDataLayer={activeDataLayer}
            selectedRiskArea={selectedRiskArea}
            onSelectRiskArea={setSelectedRiskArea}
            selectedIncident={selectedIncident}
            onSelectIncident={setSelectedIncident}
            isIncidentDismissed={isIncidentDismissed}
            isDispatched={isDispatched}
            zoom={zoom}
            isSiteAnalysisMode={activeView === AppView.SITE_ANALYSIS}
          />
        )}

        {activeView !== AppView.HOME && (
          <button onClick={() => setActiveView(AppView.HOME)} className="absolute top-4 left-4 z-30 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:bg-slate-100 transition-colors">
            <Home size={18} className="text-primary" />
            <span className="text-sm font-medium text-slate-700">返回首页</span>
          </button>
        )}

        {activeView === AppView.EMERGENCY_RESPONSE && !isIncidentDismissed && selectedIncident && !isDispatched && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-4 right-4 z-30 w-80 bg-white rounded-2xl shadow-xl p-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-8 bg-red-50 rounded-lg flex items-center text-red-600"><Siren size={18} /></div>
                  <div>
                    <span className="text-[10px] text-red-500 font-bold">紧急警报</span>
                    <p className="font-bold">{selectedIncident.type}</p>
                  </div>
                </div>
                <div className="text-sm mb-3">
                  <p>位置: {selectedIncident.location}</p>
                  <p>居民: {selectedIncident.resident}</p>
                  <p>距离: {selectedIncident.distance}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setIsIncidentDismissed(true); setSelectedIncident(null); }} className="flex-1 py-2 border rounded-lg text-sm">忽略</button>
                  <button onClick={() => setIsDispatched(true)} className="flex-1 py-2 bg-primary text-white rounded-lg text-sm">派遣急救</button>
                </div>
                <button onClick={() => setShowNotificationModal(true)} className="w-full mt-2 py-2 border border-primary text-primary rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-primary/5">
                  <BellPlus size={14} /> 添加新通知
                </button>
              </div>
            </motion.div>
          )}

          {activeView === AppView.EMERGENCY_RESPONSE && isDispatched && (
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="absolute bottom-6 right-6 z-30">
              <div className="relative w-36 h-36 mx-auto">
                {/* 外圈波纹动画 */}
                <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-30 animate-ping"></div>
                <div className="absolute inset-2 rounded-full bg-emerald-400 opacity-20 animate-ping animation-delay-200"></div>
                {/* 主圆形 */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-[0_8px_30px_rgba(16,185,129,0.5)] flex flex-col items-center justify-center">
                  {/* 内圈光晕 */}
                  <div className="absolute inset-0 rounded-full bg-white/10"></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <Siren size={28} className="text-white animate-bounce mb-1" />
                    <p className="text-xs font-bold text-white/90 tracking-wider">救援中</p>
                    <p className="text-xl font-black text-white mt-1">{Math.floor(countdown / 60)}分 {countdown % 60}秒</p>
                  </div>
                  {/* 底部呼吸灯 */}
                  <div className="absolute bottom-3 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-200"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-400"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === AppView.EMERGENCY_RESPONSE && selectedStat && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-96 bg-white rounded-2xl shadow-2xl p-4">
              <button onClick={() => setSelectedStat(null)} className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100 transition-colors">
                <X size={18} className="text-slate-400" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                {selectedStat === 'responseTime' && <Timer size={18} className="text-blue-600" />}
                {selectedStat === 'activeAlerts' && <AlertTriangle size={18} className="text-red-600" />}
                {selectedStat === 'healthIndex' && <Heart size={18} className="text-emerald-600" />}
                <h3 className="text-sm font-bold">{STATS_DATA[selectedStat].title}</h3>
              </div>

              <p className="text-2xl font-bold mb-2">
                <span className={selectedStat === 'activeAlerts' ? 'text-red-600' : selectedStat === 'healthIndex' ? 'text-emerald-600' : 'text-blue-600'}>
                  {STATS_DATA[selectedStat].value}
                </span>
              </p>

              {renderLineChart(selectedStat)}
            </motion.div>
          )}

          {activeView === AppView.HEALTH_SUPPORT && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-white overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setActiveView(AppView.HEALTH_RISK)} className="flex items-center gap-2 text-slate-600">
                    <ChevronRight size={18} className="rotate-180" />
                    <span className="text-sm">返回</span>
                  </button>
                  <h2 className="text-lg font-bold">健康支持</h2>
                  <button onClick={() => setShowHelpModal(true)} className="p-2 rounded-lg hover:bg-slate-100">
                    <Info size={20} className="text-slate-400" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setHelpTab('form')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${helpTab === 'form' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>申请表单</button>
                  <button onClick={() => setHelpTab('help')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${helpTab === 'help' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>帮助信息</button>
                  <button onClick={() => setHelpTab('faq')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${helpTab === 'faq' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>常见问题</button>
                </div>
              </div>

              <div className="p-4">
                {helpTab === 'form' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <h3 className="text-sm font-bold mb-3">申请检测包</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500">姓名</label>
                          <input type="text" placeholder="请输入姓名" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">联系电话</label>
                          <input type="tel" placeholder="请输入联系电话" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">选择症状（可多选）</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {['发热', '咳嗽', '乏力', '头痛', '咽痛', '腹泻'].map(symptom => (
                              <button key={symptom} className="px-3 py-1 border border-slate-200 rounded-full text-xs">{symptom}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">详细描述</label>
                          <textarea placeholder="请描述您的症状..." className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" rows={3} />
                        </div>
                        <button className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium">提交申请</button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <h3 className="text-sm font-bold mb-3">快速联系</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setShowHelpModal(true)} className="p-3 bg-blue-50 rounded-lg text-center">
                          <Phone size={20} className="mx-auto text-blue-600 mb-1" />
                          <span className="text-xs text-blue-600">联系家庭医生</span>
                        </button>
                        <button onClick={() => setShowHelpModal(true)} className="p-3 bg-green-50 rounded-lg text-center">
                          <Activity size={20} className="mx-auto text-green-600 mb-1" />
                          <span className="text-xs text-green-600">在线问诊</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {helpTab === 'help' && (
                  <div className="space-y-4">
                    <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                      <h3 className="text-sm font-bold text-red-600 mb-3">紧急联系</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">急救电话</span>
                          <a href="tel:120" className="text-lg font-bold text-red-600">120</a>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">报警电话</span>
                          <a href="tel:110" className="text-lg font-bold text-red-600">110</a>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">服务热线</span>
                          <a href="tel:400-888-9999" className="text-lg font-bold text-primary">400-888-9999</a>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <h3 className="text-sm font-bold mb-3">服务信息</h3>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-600"><Clock size={14} className="inline mr-2" />{HELP_INFO.serviceHours}</p>
                        <p className="text-slate-600"><MapPin size={14} className="inline mr-2" />{HELP_INFO.address}</p>
                      </div>
                    </div>
                  </div>
                )}

                {helpTab === 'faq' && (
                  <div className="space-y-3">
                    {FAQ_DATA.map(faq => (
                      <div key={faq.id} className="bg-white rounded-xl border border-slate-200 p-4">
                        <h4 className="text-sm font-bold text-slate-800 mb-2">{faq.question}</h4>
                        <p className="text-xs text-slate-500">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeView === AppView.NOTIFICATIONS && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-white overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => setActiveView(AppView.HEALTH_RISK)} className="flex items-center gap-2 text-slate-600">
                    <ChevronRight size={18} className="rotate-180" />
                    <span className="text-sm">返回</span>
                  </button>
                  <h2 className="text-lg font-bold">社区通知</h2>
                  <button onClick={() => setNotifications(notifications.map(n => ({ ...n, isRead: true })))} className="text-sm text-primary font-medium">
                    全部已读
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-500 mb-2">{notifications.filter(n => !n.isRead).length} 条未读通知</p>
                  </div>
                )}
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => setNotifications(notifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n))}
                    className={`p-4 rounded-xl border-l-4 cursor-pointer transition-all ${notif.isRead ? 'bg-slate-50 border-slate-200 opacity-60' : notif.type === 'danger' ? 'bg-red-50 border-red-500' : notif.type === 'warning' ? 'bg-orange-50 border-orange-500' : notif.type === 'success' ? 'bg-emerald-50 border-emerald-500' : 'bg-primary/5 border-primary'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {!notif.isRead && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                          <p className="text-sm font-bold">{notif.title}</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{notif.content}</p>
                        <p className="text-[9px] text-slate-400 mt-2">{notif.time}</p>
                      </div>
                      {!notif.isRead && <CheckCircle2 size={16} className="text-primary" />}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {showHelpModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center" onClick={() => setShowHelpModal(false)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-80 mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">联系我们</h3>
                  <button onClick={() => setShowHelpModal(false)}><X size={20} className="text-slate-400" /></button>
                </div>
                <div className="space-y-3">
                  <a href="tel:120" className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <Siren size={20} className="text-red-600" />
                    <div>
                      <p className="text-sm font-bold text-red-600">急救电话</p>
                      <p className="text-xs text-slate-500">24小时 available</p>
                    </div>
                  </a>
                  <a href="tel:400-888-9999" className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Phone size={20} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-bold text-blue-600">服务热线</p>
                      <p className="text-xs text-slate-500">{HELP_INFO.serviceHours}</p>
                    </div>
                  </a>
                  <a href="tel:110" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <ShieldCheck size={20} className="text-slate-600" />
                    <div>
                      <p className="text-sm font-bold text-slate-600">报警电话</p>
                      <p className="text-xs text-slate-500">24小时 available</p>
                    </div>
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* 添加新通知弹窗 */}
          {showNotificationModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center" onClick={() => setShowNotificationModal(false)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-96 mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">添加新通知</h3>
                  <button onClick={() => setShowNotificationModal(false)}><X size={20} className="text-slate-400" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">通知标题</label>
                    <input type="text" value={newNotification.title} onChange={e => setNewNotification({ ...newNotification, title: e.target.value })} placeholder="请输入通知标题" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">通知类型</label>
                    <div className="flex gap-2">
                      {(['info', 'warning', 'danger', 'success'] as const).map(type => (
                        <button key={type} onClick={() => setNewNotification({ ...newNotification, type })} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${newNotification.type === type ? (type === 'info' ? 'bg-primary text-white' : type === 'warning' ? 'bg-orange-500 text-white' : type === 'danger' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white') : 'bg-slate-100 text-slate-600'}`}>
                          {type === 'info' ? '通知' : type === 'warning' ? '警告' : type === 'danger' ? '紧急' : '成功'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">通知内容</label>
                    <textarea value={newNotification.content} onChange={e => setNewNotification({ ...newNotification, content: e.target.value })} placeholder="请输入通知内容" rows={4} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                  </div>
                  <button onClick={() => { if (newNotification.title && newNotification.content) { const newNotif = { id: Date.now().toString(), ...newNotification, time: '刚刚发布', isRead: false }; setNotifications([newNotif, ...notifications]); setShowNotificationModal(false); setNewNotification({ title: '', content: '', type: 'info' }); } }} disabled={!newNotification.title || !newNotification.content} className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">发布通知</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* 紧急求助热线弹窗 */}
          {showEmergencyModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center" onClick={() => setShowEmergencyModal(false)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-80 mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">紧急求助热线</h3>
                  <button onClick={() => setShowEmergencyModal(false)}><X size={20} className="text-slate-400" /></button>
                </div>
                <div className="space-y-3">
                  <a href="tel:120" className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100">
                    <Siren size={20} className="text-red-600" />
                    <div>
                      <p className="text-sm font-bold text-red-600">急救电话</p>
                      <p className="text-xs text-slate-500">24小时 available</p>
                    </div>
                  </a>
                  <a href="tel:110" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100">
                    <ShieldCheck size={20} className="text-slate-600" />
                    <div>
                      <p className="text-sm font-bold text-slate-600">报警电话</p>
                      <p className="text-xs text-slate-500">24小时 available</p>
                    </div>
                  </a>
                  <a href="tel:400-888-9999" className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100">
                    <Phone size={20} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-bold text-blue-600">服务热线</p>
                      <p className="text-xs text-slate-500">工作时间: 8:00-20:00</p>
                    </div>
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* 完整报告弹窗 */}
          {showReportModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center" onClick={() => setShowReportModal(false)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-[500px] max-h-[80vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">社区健康完整报告</h3>
                  <button onClick={() => setShowReportModal(false)}><X size={20} className="text-slate-400" /></button>
                </div>
                <div className="space-y-4">
                  {/* 社区概况 */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">社区健康概况</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{RISK_AREAS.length}</p>
                        <p className="text-xs text-slate-500">风险区域</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-500">{allIncidents.length}</p>
                        <p className="text-xs text-slate-500">待处理事件</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-500">良好</p>
                        <p className="text-xs text-slate-500">健康指数</p>
                      </div>
                    </div>
                  </div>

                  {/* 风险区域详情 */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">风险区域详情</h4>
                    <div className="space-y-3">
                      {RISK_AREAS.map(area => (
                        <div key={area.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium">{area.name}</p>
                            <p className="text-[10px] text-slate-400">{area.population} 人口 · {area.activeCases} 活跃病例</p>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded ${area.riskLevel === '极高' ? 'bg-red-100 text-red-600' : area.riskLevel === '中等' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                            {area.riskLevel} ({area.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 响应统计 */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">应急响应统计</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">平均响应时间</p>
                        <p className="text-lg font-bold text-blue-600">{STATS_DATA.responseTime.value}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">活动警报</p>
                        <p className="text-lg font-bold text-red-600">{STATS_DATA.activeAlerts.value}</p>
                      </div>
                    </div>
                  </div>

                  {/* 最近通知 */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">最近通知</h4>
                    <div className="space-y-2">
                      {notifications.slice(0, 3).map(notif => (
                        <div key={notif.id} className="text-xs">
                          <p className="font-medium">{notif.title}</p>
                          <p className="text-slate-400">{notif.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>

        {activeView !== AppView.HOME && (
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col p-4 shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">社区通知</h3>
            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full">新增</span>
          </div>
          <div className="space-y-3">
            {notifications.map((notif: Notification) => (
              <div key={notif.id} className={`p-3 rounded-lg border-l-2 ${notif.type === 'danger' ? 'border-red-500 bg-red-50' : notif.type === 'warning' ? 'border-orange-500 bg-orange-50' : notif.type === 'success' ? 'border-emerald-500 bg-emerald-50' : 'border-primary bg-primary/5'}`}>
                <p className="text-xs font-bold">{notif.title}</p>
                <p className="text-[10px] text-slate-500 mt-1">{notif.content}</p>
                <p className="text-[9px] text-slate-400 mt-1">{notif.time}</p>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100">
            <button onClick={() => setShowEmergencyModal(true)} className="w-full bg-red-50 rounded-xl p-3 mb-3 border border-red-100 hover:bg-red-100 transition-colors text-left">
              <div className="flex items-center gap-2 mb-2">
                <Phone size={14} className="text-red-600" />
                <span className="text-xs font-bold text-red-600">紧急求助热线</span>
              </div>
              <p className="text-sm font-bold text-slate-800">120 / 110</p>
              <p className="text-[9px] text-slate-500">24小时 available</p>
            </button>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => setActiveView(AppView.HEALTH_RISK)} className="bg-slate-50 hover:bg-slate-100 rounded-lg p-2 text-center transition-colors">
                <p className="text-lg font-bold text-primary">{RISK_AREAS.length}</p>
                <p className="text-[9px] text-slate-400">风险区域</p>
              </button>
              <button onClick={() => setActiveView(AppView.EMERGENCY_RESPONSE)} className="bg-slate-50 hover:bg-slate-100 rounded-lg p-2 text-center transition-colors">
                <p className="text-lg font-bold text-red-500">{allIncidents.length}</p>
                <p className="text-[9px] text-slate-400">待处理事件</p>
              </button>
            </div>

            <div className="space-y-2">
              <button onClick={() => setShowReportModal(true)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-600 flex items-center justify-center gap-2">
                <ShieldCheck size={14} /> 查看完整报告
              </button>
              <button onClick={() => setShowNotificationModal(true)} className="w-full py-2 bg-primary/10 hover:bg-primary/20 rounded-lg text-xs font-medium text-primary flex items-center justify-center gap-2">
                <Plus size={14} /> 添加新通知
              </button>
            </div>
          </div>
        </aside>
        )}
      </div>

      {/* 首页搜索结果弹窗 */}
      {showHomeSearchResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowHomeSearchResults(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">搜索结果</h3>
              <button onClick={() => setShowHomeSearchResults(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-4">
              {/* 健康档案 */}
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-700 mb-2">个人健康档案</h4>
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">心率</span>
                    <span className="text-xs font-medium">72 bpm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">今日步数</span>
                    <span className="text-xs font-medium">8,523 步</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">睡眠质量</span>
                    <span className="text-xs font-medium">7.5 小时</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">饮水量</span>
                    <span className="text-xs font-medium">1.8 L</span>
                  </div>
                </div>
              </div>

              {/* 快捷服务 */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-2">快捷服务</h4>
                <div className="space-y-2">
                  <button onClick={() => { setShowHomeSearchResults(false); setActiveView(AppView.EMERGENCY_RESPONSE); }} className="w-full flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100">
                    <Siren size={18} className="text-red-500" />
                    <span className="text-sm">应急救援</span>
                  </button>
                  <button onClick={() => { setShowHomeSearchResults(false); setActiveView(AppView.HEALTH_RISK); }} className="w-full flex items-center gap-3 p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100">
                    <Activity size={18} className="text-emerald-500" />
                    <span className="text-sm">健康风险热力图</span>
                  </button>
                  <button onClick={() => { setShowHomeSearchResults(false); setActiveView(AppView.ACCESSIBILITY); }} className="w-full flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100">
                    <Accessibility size={18} className="text-blue-500" />
                    <span className="text-sm">无障碍出行</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索结果弹窗 */}
      {showSearchResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSearchResults(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">搜索结果 ({filteredIncidents.length})</h3>
              <button onClick={() => setShowSearchResults(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredIncidents.length > 0 ? (
                filteredIncidents.map((incident) => (
                  <button
                    key={incident.id}
                    onClick={() => handleSelectIncident(incident)}
                    className="w-full p-3 text-left border-b border-slate-100 hover:bg-red-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-600">{incident.type}</span>
                      <span className="text-[10px] text-slate-400">{incident.time}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{incident.location}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{incident.resident} · {incident.distance}</p>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <Search size={40} className="mx-auto mb-2 text-slate-300" />
                  <p>未找到匹配的急救点</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
