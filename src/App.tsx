import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { 
  Map as MapIcon, 
  TrendingUp, 
  AlertTriangle, 
  Navigation, 
  Search, 
  Bell, 
  Settings, 
  ChevronRight, 
  Accessibility, 
  Siren, 
  Info, 
  CheckCircle2, 
  X, 
  MoreVertical,
  User,
  Activity,
  MapPin,
  Clock,
  ShieldCheck,
  Plus,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppView, RiskArea, Notification, Incident } from './types';
import AMapView from './components/AMapView';

// Mock Data
const RISK_AREAS: RiskArea[] = [
  { 
    id: '1', 
    name: '北广场片区', 
    riskLevel: '极高', 
    percentage: 84,
    activeCases: 156,
    trend: 'up',
    population: 1200,
    description: '该区域为高密度住宅区，近期检测到多起聚集性感染。建议加强消杀并限制非必要出入。',
    coordinates: { top: '30%', left: '38%' }
  },
  { 
    id: '2', 
    name: '社区中心', 
    riskLevel: '中等', 
    percentage: 52,
    activeCases: 42,
    trend: 'stable',
    population: 800,
    description: '公共服务中心，人流量较大。目前风险受控，但需维持严格的体温监测。',
    coordinates: { top: '55%', left: '45%' }
  },
  { 
    id: '3', 
    name: '中心交通枢纽', 
    riskLevel: '中等', 
    percentage: 48,
    activeCases: 35,
    trend: 'down',
    population: 2500,
    description: '交通枢纽区域，流动人口多。得益于高效的通风系统和频繁消毒，风险呈下降趋势。',
    coordinates: { top: '40%', left: '65%' }
  },
];

const NOTIFICATIONS_MOCK: Notification[] = [
  { id: '1', title: '强制佩戴口罩区域', content: '由于流感样症状激增，第4区和中央广场立即生效。', time: '12分钟前', type: 'danger', isRead: false },
  { id: '2', title: '移动检测诊所', content: '位于东侧图书馆。开放至下午6:00。居民无需预约。', time: '1小时前', type: 'info', isRead: false },
  { id: '3', title: '避让警告', content: '地铁站空气传感器检测到高病毒载量。通风维护正在进行中。', time: '3小时前', type: 'warning', isRead: false },
  { id: '4', title: '区域清理完毕', content: '西侧健身房已完成深度消毒。风险等级降至“安全”。', time: '5小时前', type: 'success', isRead: false },
];

const INCIDENTS: Incident[] = [
  {
    id: '1',
    type: '检测到摔倒',
    location: '爱华里小区 4号楼',
    resident: '王建国',
    time: '02:14',
    status: 'pending',
    distance: '0.8公里',
    image: 'https://picsum.photos/seed/building/400/300',
    coordinates: [117.198, 39.151] as [number, number]
  },
  {
    id: '2',
    type: '紧急求助',
    location: '万隆大胡同商业中心',
    resident: '李明华',
    time: '02:18',
    status: 'pending',
    distance: '1.2公里',
    image: 'https://picsum.photos/seed/building2/400/300',
    coordinates: [117.194, 39.152] as [number, number]
  },
  {
    id: '3',
    type: '健康异常',
    location: '大胡同天奕商城',
    resident: '张伟',
    time: '02:25',
    status: 'pending',
    distance: '1.5公里',
    image: 'https://picsum.photos/seed/building3/400/300',
    coordinates: [117.196, 39.150] as [number, number]
  }
];
const WEEKLY_STATS = [
  { name: 'Mon', responseTime: 4.5, alerts: 10, health: 85 },
  { name: 'Tue', responseTime: 4.2, alerts: 12, health: 87 },
  { name: 'Wed', responseTime: 4.8, alerts: 15, health: 84 },
  { name: 'Thu', responseTime: 4.1, alerts: 8, health: 89 },
  { name: 'Fri', responseTime: 4.3, alerts: 11, health: 88 },
  { name: 'Sat', responseTime: 3.9, alerts: 7, health: 91 },
  { name: 'Sun', responseTime: 4.2, alerts: 12, health: 88 },
];

const MONTHLY_STATS = Array.from({ length: 30 }, (_, i) => ({
  name: `${i + 1}`,
  responseTime: 4 + Math.random() * 1,
  alerts: Math.floor(5 + Math.random() * 15),
  health: 80 + Math.floor(Math.random() * 15),
}));

export default function App() {
  const [activeView, setActiveView] = useState<AppView>(AppView.HEALTH_RISK);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStat, setSelectedStat] = useState<'responseTime' | 'alerts' | 'health' | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [isDispatched, setIsDispatched] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS_MOCK);
  const [selectedRiskArea, setSelectedRiskArea] = useState<RiskArea | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isIncidentDismissed, setIsIncidentDismissed] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [countdown, setCountdown] = useState(105); // 救援倒计时（秒）

  // 救援倒计时逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isDispatched && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // 倒计时结束，重置救援状态
            setIsDispatched(false);
            setCountdown(105); // 重置倒计时
            return 105;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isDispatched, countdown]);

  // 忽略后30秒出现新的救援点
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isIncidentDismissed) {
      timer = setTimeout(() => {
        setIsIncidentDismissed(false);
      }, 30000); // 30秒后出现新救援
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isIncidentDismissed]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleLocate = () => {
    setZoom(1.5);
    // In a real app, we'd center on user coordinates
  };

  const chartData = useMemo(() => {
    return timeRange === 'week' ? WEEKLY_STATS : MONTHLY_STATS;
  }, [timeRange]);

  const statConfig = {
    responseTime: { title: '平均响应时间', color: '#0066ff', unit: '分钟', key: 'responseTime' },
    alerts: { title: '活动警报', color: '#ef4444', unit: '次', key: 'alerts' },
    health: { title: '社区健康指数', color: '#10b981', unit: '分', key: 'health' },
  };

  const SYMPTOMS = [
    { name: '发烧', description: '体温超过 37.5°C，伴有畏寒或出汗。', severity: 'high' },
    { name: '干咳', description: '持续性的干咳，无痰或少痰。', severity: 'medium' },
    { name: '乏力', description: '感到异常疲倦，即使休息后也难以缓解。', severity: 'medium' },
    { name: '呼吸困难', description: '感到胸闷、气促，活动后加重。', severity: 'critical' },
    { name: '肌肉酸痛', description: '全身或局部肌肉疼痛，类似流感症状。', severity: 'low' },
  ];

  const SELF_TEST_STEPS = [
    { title: '体温测量', content: '使用电子体温计测量腋下或耳道温度，记录数值。' },
    { title: '血氧监测', content: '如有家用血氧仪，请测量静息状态下的血氧饱和度。' },
    { title: '症状自查', content: '对照上述症状列表，记录出现的症状及其持续时间。' },
    { title: '风险评估', content: '根据症状严重程度和持续时间，初步评估健康风险。' },
  ];

  return (
    <div className="flex flex-col h-screen bg-background-light text-slate-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-1.5 rounded-lg text-white">
            <Activity size={24} />
          </div>
          <h2 className="text-xl font-bold tracking-tight">智康社区</h2>
        </div>

        <div className="flex flex-1 justify-center max-w-xl px-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full bg-slate-100 border-none rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary text-sm outline-none" 
              placeholder="搜索特定区域、街道或设施..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveView(AppView.NOTIFICATIONS)}
            className={`p-2 rounded-lg relative transition-colors ${activeView === AppView.NOTIFICATIONS ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Bell size={20} />
            <span className={`absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 ${activeView === AppView.NOTIFICATIONS ? 'border-primary' : 'border-white'}`}></span>
          </button>
          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Settings size={20} />
          </button>
          <div className="h-8 w-px bg-slate-200 mx-1"></div>
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold">陈莎拉 博士</p>
              <p className="text-[10px] text-slate-500">公共卫生官员</p>
            </div>
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/30">
              <img 
                className="object-cover size-full" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJL0ExCzMgrxridGN0YflpZyh18S-JFnOtJe1e2gZrjo-wC2o5MshlHVHeFRZ0vB5y6ujLypxlgzbKaRHGqCCrGg69xpUHiztjNb0a9fhON_nfJ5QXFV6fKu8g38ZItCZ0DUMHaDZlE0bbend15gjYeBnpfGmhV2Vi2AxZzsYmob3bA7HZ8w39DF1ldsSqjZqEYqz732v8Y2r6lwy9K-IcFyP1vqn-XdkcBXwajz-M4oXc1VpqftQXTdL5PWd6vAGzWsY52lz-h5U" 
                alt="Profile"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col p-4 gap-6 overflow-y-auto">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">
              {activeView === AppView.HEALTH_RISK ? '主仪表板' : activeView === AppView.ACCESSIBILITY ? '监测' : '应急监测'}
            </h3>
            <nav className="space-y-1">
              <SidebarItem 
                icon={<Siren size={20} />} 
                label="应急响应" 
                active={activeView === AppView.EMERGENCY_RESPONSE} 
                onClick={() => setActiveView(AppView.EMERGENCY_RESPONSE)}
              />
              <SidebarItem 
                icon={<MapIcon size={20} />} 
                label="健康风险热力图" 
                active={activeView === AppView.HEALTH_RISK} 
                onClick={() => setActiveView(AppView.HEALTH_RISK)}
              />
              <SidebarItem 
                icon={<Accessibility size={20} />} 
                label="无障碍出行" 
                active={activeView === AppView.ACCESSIBILITY} 
                onClick={() => setActiveView(AppView.ACCESSIBILITY)}
              />
            </nav>
          </div>

          <AnimatePresence mode="wait">
            {activeView === AppView.HEALTH_RISK && (
              <motion.div
                key="health-sidebar"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">风险趋势</h3>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-end justify-between mb-2">
                      <div>
                        <p className="text-2xl font-bold">+12.4%</p>
                        <p className="text-[10px] text-slate-500">流感发病率 (14天)</p>
                      </div>
                      <div className="flex items-center text-red-500 text-xs font-bold">
                        <TrendingUp size={14} className="mr-1" />
                        <span>高风险</span>
                      </div>
                    </div>
                    <div className="h-20 w-full mt-4">
                      <svg className="w-full h-full" viewBox="0 0 100 40">
                        <path d="M0 35 Q 20 35, 40 25 T 80 10 T 100 5" fill="none" stroke="#0066ff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                        <path d="M0 35 Q 20 35, 40 25 T 80 10 T 100 5 V 40 H 0 Z" fill="url(#grad)" opacity="0.1" />
                        <defs>
                          <linearGradient id="grad" x1="0%" x2="0%" y1="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#0066ff', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#0066ff', stopOpacity: 0 }} />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium">
                      <span>Mon</span><span>Wed</span><span>Fri</span><span>Sun</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">高风险片区</h3>
                  <div className="space-y-2">
                    {RISK_AREAS.map(area => (
                      <div key={area.id} className={`flex items-center gap-3 p-2 rounded-lg border ${area.riskLevel === '极高' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
                        <div className={`size-8 rounded-lg flex items-center justify-center text-white ${area.riskLevel === '极高' ? 'bg-red-500' : 'bg-orange-500'}`}>
                          {area.riskLevel === '极高' ? <AlertTriangle size={18} /> : <Info size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{area.name}</p>
                          <p className={`text-[10px] ${area.riskLevel === '极高' ? 'text-red-600' : 'text-orange-600'}`}>{area.riskLevel}风险 - {area.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === AppView.ACCESSIBILITY && (
              <motion.div
                key="accessibility-sidebar"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">路线状态</h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                      <p className="text-xs text-slate-500 font-medium mb-1">电梯状态</p>
                      <div className="flex items-end justify-between">
                        <span className="text-lg font-bold tracking-tight">畅通</span>
                        <CheckCircle2 className="text-emerald-500" size={20} />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                      <p className="text-xs text-slate-500 font-medium mb-1">坡道状态</p>
                      <div className="flex items-end justify-between">
                        <span className="text-lg font-bold tracking-tight">畅通</span>
                        <ShieldCheck className="text-blue-500" size={20} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100">
                  <div className="bg-primary/10 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-widest">快捷点</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 hover:border-primary transition-colors flex justify-center">
                        <span className="text-primary text-sm font-bold">WC</span>
                      </button>
                      <button className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 hover:border-primary transition-colors flex justify-center">
                        <span className="text-primary text-sm font-bold">🍴</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === AppView.EMERGENCY_RESPONSE && (
              <motion.div
                key="emergency-sidebar"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">社区统计</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => setSelectedStat('responseTime')}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left hover:border-primary transition-colors group"
                    >
                      <p className="text-[10px] text-slate-500 font-bold uppercase group-hover:text-primary">平均响应时间</p>
                      <div className="flex items-end justify-between mt-1">
                        <p className="text-2xl font-bold">4.2m</p>
                        <span className="text-[10px] text-emerald-500 font-bold">-0.5% ↘</span>
                      </div>
                    </button>
                    <button 
                      onClick={() => setSelectedStat('alerts')}
                      className="p-3 bg-red-50 rounded-xl border border-red-100 text-left hover:border-red-500 transition-colors group"
                    >
                      <p className="text-[10px] text-red-500 font-bold uppercase group-hover:text-red-600">活动警报</p>
                      <div className="flex items-end justify-between mt-1">
                        <p className="text-2xl font-bold text-red-600">12</p>
                        <span className="text-[10px] text-red-500 font-bold">+2 ↗</span>
                      </div>
                    </button>
                    <button 
                      onClick={() => setSelectedStat('health')}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left hover:border-emerald-500 transition-colors group"
                    >
                      <p className="text-[10px] text-slate-500 font-bold uppercase group-hover:text-emerald-500">社区健康指数</p>
                      <div className="flex items-end justify-between mt-1">
                        <p className="text-2xl font-bold">88<span className="text-sm text-slate-400">/100</span></p>
                        <span className="text-[10px] text-emerald-500 font-bold">+1% ↗</span>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-auto border-t border-slate-200 pt-4">
            <div className="bg-primary/10 rounded-xl p-3">
              <p className="text-xs font-bold text-primary mb-1">健康支持</p>
              <p className="text-[10px] text-slate-500 leading-relaxed mb-3">报告新症状或申请检测包。</p>
              <button 
                onClick={() => setActiveView(AppView.HEALTH_SUPPORT)}
                className="w-full bg-primary text-white text-xs font-bold py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                寻求帮助
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <AMapView
            riskAreas={RISK_AREAS}
            incidents={INCIDENTS}
            activeView={activeView}
            selectedRiskArea={selectedRiskArea}
            onSelectRiskArea={setSelectedRiskArea}
            selectedIncident={selectedIncident}
            onSelectIncident={setSelectedIncident}
            isIncidentDismissed={isIncidentDismissed}
            isDispatched={isDispatched}
            zoom={zoom}
          />

          {/* Map Controls */}
          <div className="absolute top-6 right-6 flex flex-col gap-3 z-10">
            <div className="bg-white/90 backdrop-blur p-2 rounded-xl shadow-lg border border-slate-200 flex flex-col gap-1">
              <button 
                onClick={handleZoomIn}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                title="放大"
              >
                <Plus size={20} />
              </button>
              <div className="h-px bg-slate-200 mx-1"></div>
              <button 
                onClick={handleZoomOut}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                title="缩小"
              >
                <Minus size={20} />
              </button>
            </div>
            <button 
              onClick={handleLocate}
              className="bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              title="定位我的位置"
            >
              <MapPin size={20} />
            </button>
            <button 
              onClick={() => setZoom(1)}
              className="bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              title="重置视图"
            >
              <MapIcon size={20} />
            </button>
          </div>

          {/* Overlays based on active view */}
          <AnimatePresence>
            {activeView === AppView.HEALTH_RISK && (
              <motion.div 
                key="health-risk-legend"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-6 left-6 z-10 w-64 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-slate-200"
              >
                <h4 className="text-xs font-bold mb-3">风险强度图例</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-3 rounded-full bg-gradient-to-r from-yellow-200 via-orange-500 to-red-600"></div>
                    <div className="flex-1 flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                      <span>低</span><span>极高</span>
                    </div>
                  </div>
                  <LegendItem color="bg-red-600" label="高活跃爆发期" />
                  <LegendItem color="bg-orange-500" label="新兴风险区域" />
                  <LegendItem color="bg-green-500" label="认证安全区" />
                </div>
              </motion.div>
            )}

            {activeView === AppView.HEALTH_RISK && (
              <motion.div 
                key="health-risk-path-planning"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute bottom-6 right-6 z-10 w-80 bg-white p-4 rounded-xl shadow-2xl border border-slate-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                      <Navigation size={20} />
                    </div>
                    <h4 className="text-sm font-bold">安全路径规划</h4>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <div className="flex items-start gap-3">
                      <Info className="text-slate-400 mt-0.5" size={14} />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500">建议</p>
                        <p className="text-[11px] leading-relaxed">
                          避开 <span className="text-red-600 font-bold underline decoration-dotted">市场街</span>，因其人流量大且检测到流感集群。建议使用 <span className="text-green-600 font-bold underline decoration-dotted">自由路径</span> 进行低风险通勤。
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">安全区导航</span>
                      <span className="text-[10px] text-primary font-bold">全程 4.2 公里</span>
                    </div>
                    <button className="flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg transition-colors group">
                      <div className="size-8 rounded-full bg-white border border-primary/30 flex items-center justify-center">
                        <Navigation className="text-primary" size={14} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-bold">开始安全导航</p>
                        <p className="text-[10px] text-slate-500">规划避开红色区域的路线</p>
                      </div>
                      <ChevronRight className="text-slate-400 group-hover:text-primary transition-colors" size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === AppView.ACCESSIBILITY && (
              <motion.div 
                key="accessibility-voice-guide"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute top-6 left-6 w-80 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-slate-200 z-10"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold">语音引导</h4>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">直播</span>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="relative pl-4 border-l-2 border-primary">
                    <p className="text-[11px] font-bold">"Approaching East Gate Ramp. Keep straight for 20 meters."</p>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-black tracking-widest">2s ago</p>
                  </div>
                  <div className="relative pl-4 border-l-2 border-slate-300">
                    <p className="text-[11px] text-slate-500 italic">"Obstacle detected in West Path. Rerouting."</p>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-black tracking-widest">5m ago</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">语音设置</h5>
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] font-bold">触感反馈</span>
                    <div className="size-6 flex items-center justify-center bg-green-500 text-white rounded-full scale-75">
                      <CheckCircle2 size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === AppView.ACCESSIBILITY && (
              <motion.div 
                key="accessibility-help-desk"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-6 left-6 right-6 lg:left-1/2 lg:-translate-x-1/2 lg:w-3/4 max-w-4xl z-20"
              >
                <div className="overflow-hidden rounded-2xl bg-white shadow-2xl border-l-8 border-primary flex flex-col md:flex-row">
                  <div className="flex-1 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Info className="text-primary" size={16} />
                        <p className="text-xs font-bold text-primary uppercase tracking-widest">帮助台</p>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">在当前位置需要帮助吗？</h3>
                    </div>
                    <button className="px-8 py-3 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all flex items-center gap-2">
                      <User size={20} /> 请求协助
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 提示：点击地图上的红色标记 */}
            {activeView === AppView.EMERGENCY_RESPONSE && !selectedIncident && !isIncidentDismissed && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 right-6 z-30 w-[320px] bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-slate-200 p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">等待响应</p>
                    <p className="text-xs text-slate-500">点击地图上的红色标记查看紧急事件</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === AppView.EMERGENCY_RESPONSE && selectedIncident && !isIncidentDismissed && (
              <AnimatePresence mode="wait">
                {!isDispatched ? (
                  <motion.div
                    key="emergency-response-incident-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, x: 50, y: 50 }}
                    className="absolute bottom-6 right-6 z-30 w-[420px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden"
                  >
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="size-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 relative">
                            <Siren size={28} className="animate-pulse" />
                            <div className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full border-2 border-white animate-ping"></div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="size-2 bg-red-500 rounded-full animate-pulse"></span>
                              <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">紧急警报</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedIncident.type}</h3>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">发生时间</p>
                          <p className="text-lg font-mono font-black text-slate-900">{selectedIncident.time}</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">位置</p>
                              <p className="text-sm font-bold text-slate-900 leading-tight">{selectedIncident.location}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">居民</p>
                              <div className="flex items-center gap-2">
                                <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">JD</div>
                                <p className="text-sm font-bold text-slate-900">{selectedIncident.resident}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">响应级别</span>
                              <span className="text-xs font-black text-slate-900">EMS Level 1</span>
                            </div>
                            <div className="w-px h-8 bg-slate-200"></div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">距离</span>
                              <span className="text-xs font-black text-slate-900">{selectedIncident.distance}</span>
                            </div>
                          </div>
                          <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="size-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                                <img src={`https://picsum.photos/seed/avatar${i}/100/100`} alt="Avatar" referrerPolicy="no-referrer" />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setIsIncidentDismissed(true);
                              setSelectedIncident(null);
                            }}
                            className="flex-1 py-4 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                          >
                            忽略
                          </button>
                          <button
                            onClick={() => setIsDispatched(true)}
                            className="flex-[2] py-4 bg-primary text-white rounded-2xl text-sm font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all"
                          >
                            <Siren size={20} />
                            派遣急救
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="emergency-response-dispatched-badge"
                    initial={{ opacity: 0, scale: 0.5, x: 50, y: 50 }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute bottom-6 right-6 z-30 size-32 bg-emerald-500 rounded-full shadow-[0_10px_30px_rgba(16,185,129,0.4)] flex flex-col items-center justify-center text-white border-4 border-white cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setIsDispatched(false)}
                  >
                    <div className="relative">
                      <Siren size={28} className="animate-bounce" />
                      <div className="absolute -top-1 -right-1 size-3 bg-red-500 rounded-full border border-white animate-ping"></div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest mt-1">救援中</span>
                    <div className="flex flex-col items-center -mt-0.5">
                      <span className="text-[11px] font-black">{Math.floor(countdown / 60)}分 {countdown % 60}秒</span>
                      <span className="text-[8px] font-bold opacity-80 uppercase tracking-tighter">预计到达</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <div className="size-1 bg-white rounded-full animate-pulse"></div>
                      <div className="size-1 bg-white rounded-full animate-pulse [animation-delay:0.2s]"></div>
                      <div className="size-1 bg-white rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
                key="notifications-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-white overflow-y-auto p-8"
              >
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900">社区详细通知</h1>
                      <p className="text-slate-500 mt-1">查看社区最新的健康公告、安全警报和公共服务信息。</p>
                    </div>
                    <button 
                      onClick={() => setActiveView(AppView.HEALTH_RISK)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X size={24} className="text-slate-400" />
                    </button>
                  </div>

                  <div className="grid gap-6">
                    {notifications.map((notif) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all ${
                          notif.isRead ? 'bg-slate-50/50 opacity-75' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${
                              notif.isRead ? 'bg-slate-200 text-slate-400' : (
                                notif.type === 'danger' ? 'bg-red-100 text-red-600' : 
                                notif.type === 'warning' ? 'bg-orange-100 text-orange-600' : 
                                notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary'
                              )
                            }`}>
                              {notif.type === 'danger' ? <AlertTriangle size={20} /> : 
                               notif.type === 'warning' ? <Info size={20} /> : 
                               notif.type === 'success' ? <CheckCircle2 size={20} /> : <Bell size={20} />}
                            </div>
                            <div>
                              <h3 className={`text-lg font-bold transition-all ${notif.isRead ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{notif.title}</h3>
                              <span className="text-xs text-slate-400 font-medium">{notif.time}</span>
                            </div>
                          </div>
                          <button className="text-slate-300 hover:text-slate-500">
                            <MoreVertical size={20} />
                          </button>
                        </div>
                        <p className={`leading-relaxed mb-4 transition-all ${notif.isRead ? 'text-slate-300' : 'text-slate-600'}`}>
                          {notif.content} 这里是详细的通知内容描述。为了保障社区居民的健康安全，我们建议大家密切关注相关区域的动态，并遵守公共卫生准则。如果您有任何疑问或需要帮助，请随时联系社区健康支持中心。
                        </p>
                        <div className="flex items-center gap-4">
                          <button className={`text-xs font-bold hover:underline ${notif.isRead ? 'text-slate-300' : 'text-primary'}`}>查看详情</button>
                          <button 
                            onClick={() => {
                              setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: !n.isRead } : n));
                            }}
                            className={`text-xs font-bold transition-colors ${notif.isRead ? 'text-slate-300 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            {notif.isRead ? '标记为未读' : '标记为已读'}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Risk Area Detail Overlay */}
            <AnimatePresence key="risk-area-overlay-presence">
              {selectedRiskArea && (
                <motion.div
                  key="risk-area-overlay-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-8"
                  onClick={() => setSelectedRiskArea(null)}
                >
                  <motion.div
                    key="risk-area-overlay-card"
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className={`size-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                          selectedRiskArea.riskLevel === '极高' ? 'bg-red-600 shadow-red-200' : 
                          selectedRiskArea.riskLevel === '中等' ? 'bg-orange-500 shadow-orange-200' : 'bg-emerald-500 shadow-emerald-200'
                        }`}>
                          <AlertTriangle size={24} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedRiskArea.name}</h2>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                              selectedRiskArea.riskLevel === '极高' ? 'bg-red-100 text-red-600' : 
                              selectedRiskArea.riskLevel === '中等' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                              {selectedRiskArea.riskLevel}风险
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">区域代码: AREA-{selectedRiskArea.id}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedRiskArea(null)}
                        className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="p-8">
                      <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">活跃病例</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-black text-slate-900">{selectedRiskArea.activeCases}</p>
                            <span className={`text-[10px] font-bold ${
                              selectedRiskArea.trend === 'up' ? 'text-red-500' : 
                              selectedRiskArea.trend === 'down' ? 'text-emerald-500' : 'text-slate-400'
                            }`}>
                              {selectedRiskArea.trend === 'up' ? '↑' : selectedRiskArea.trend === 'down' ? '↓' : '→'}
                            </span>
                          </div>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">风险指数</p>
                          <p className="text-2xl font-black text-slate-900">{selectedRiskArea.percentage}%</p>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">覆盖人口</p>
                          <p className="text-2xl font-black text-slate-900">{selectedRiskArea.population}</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">风险分析与建议</h3>
                          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                            "{selectedRiskArea.description}"
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <button className="py-4 bg-primary text-white rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
                            查看详细趋势图
                          </button>
                          <button className="py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all">
                            下载区域报告
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-slate-500">数据实时同步中</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">最后更新: {new Date().toLocaleTimeString()}</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stat Detail Overlay */}
            <AnimatePresence key="stat-detail-overlay-presence">
              {selectedStat && (
                <motion.div
                  key="stat-detail-overlay-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 bg-white/80 backdrop-blur-md flex items-center justify-center p-8"
                >
                  <motion.div
                    key="stat-detail-overlay-card"
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
                  >
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">{statConfig[selectedStat].title}统计</h2>
                        <div className="flex gap-2 mt-4">
                          <button 
                            onClick={() => setTimeRange('week')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${timeRange === 'week' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          >
                            本周
                          </button>
                          <button 
                            onClick={() => setTimeRange('month')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${timeRange === 'month' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          >
                            本月
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedStat(null)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                      >
                        <X size={24} className="text-slate-400" />
                      </button>
                    </div>

                    <div className="p-8 h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {selectedStat === 'responseTime' ? (
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={statConfig[selectedStat].color} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={statConfig[selectedStat].color} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} unit={statConfig[selectedStat].unit} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey={statConfig[selectedStat].key} stroke={statConfig[selectedStat].color} strokeWidth={3} fillOpacity={1} fill="url(#colorRes)" />
                          </AreaChart>
                        ) : selectedStat === 'alerts' ? (
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} unit={statConfig[selectedStat].unit} />
                            <Tooltip 
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey={statConfig[selectedStat].key} fill={statConfig[selectedStat].color} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : (
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} unit={statConfig[selectedStat].unit} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line type="monotone" dataKey={statConfig[selectedStat].key} stroke={statConfig[selectedStat].color} strokeWidth={3} dot={{ r: 4, fill: statConfig[selectedStat].color, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>

                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <div className="flex gap-8">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">最高值</p>
                          <p className="text-xl font-bold text-slate-900">
                            {Math.max(...chartData.map(d => d[statConfig[selectedStat].key as keyof typeof d] as number)).toFixed(1)}
                            <span className="text-xs ml-1">{statConfig[selectedStat].unit}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">平均值</p>
                          <p className="text-xl font-bold text-slate-900">
                            {(chartData.reduce((acc, d) => acc + (d[statConfig[selectedStat].key as keyof typeof d] as number), 0) / chartData.length).toFixed(1)}
                            <span className="text-xs ml-1">{statConfig[selectedStat].unit}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">数据最后更新于: {new Date().toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {activeView === AppView.HEALTH_SUPPORT && (
              <motion.div
                key="health-support-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-white overflow-y-auto p-8"
              >
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900">健康支持与自测</h1>
                      <p className="text-slate-500 mt-1">了解最新症状并进行自我健康评估。</p>
                    </div>
                    <button 
                      onClick={() => setActiveView(AppView.HEALTH_RISK)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X size={24} className="text-slate-400" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Latest Symptoms */}
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Activity className="text-primary" size={20} />
                        <h2 className="text-xl font-bold text-slate-900">最新关注症状</h2>
                      </div>
                      <div className="space-y-3">
                        {SYMPTOMS.map((symptom, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-bold text-slate-900">{symptom.name}</h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                symptom.severity === 'critical' ? 'bg-red-500 text-white' :
                                symptom.severity === 'high' ? 'bg-red-100 text-red-600' :
                                symptom.severity === 'medium' ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {symptom.severity === 'critical' ? '紧急' : 
                                 symptom.severity === 'high' ? '高风险' : 
                                 symptom.severity === 'medium' ? '中等' : '轻微'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{symptom.description}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Self-Test Assessment */}
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck className="text-emerald-500" size={20} />
                        <h2 className="text-xl font-bold text-slate-900">自我检测评估方法</h2>
                      </div>
                      <div className="space-y-4">
                        {SELF_TEST_STEPS.map((step, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="size-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                              {idx + 1}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 mb-1">{step.title}</h3>
                              <p className="text-xs text-slate-500 leading-relaxed">{step.content}</p>
                            </div>
                          </div>
                        ))}
                        
                        <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <h4 className="font-bold text-emerald-900 mb-2">评估结论建议</h4>
                          <p className="text-xs text-emerald-700 leading-relaxed mb-4">
                            如果您出现“紧急”或“高风险”症状，请立即联系社区急救中心或前往最近的医院。轻微症状建议居家观察并保持联系。
                          </p>
                          <div className="flex gap-2">
                            <button className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700">在线咨询医生</button>
                            <button className="flex-1 py-2 bg-white text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-50">申请检测包</button>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right Panel */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col p-4 gap-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold">社区通知</h3>
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">新增</span>
          </div>
          <div className="space-y-4">
            {notifications.map(notif => (
              <div key={notif.id} className={`relative pl-4 border-l-2 transition-all ${
                notif.isRead ? 'border-slate-200 opacity-60' : (
                  notif.type === 'danger' ? 'border-red-500' : 
                  notif.type === 'warning' ? 'border-orange-500' : 
                  notif.type === 'success' ? 'border-emerald-500' : 'border-primary'
                )
              }`}>
                <p className={`text-xs font-bold mb-1 ${notif.isRead ? 'text-slate-400' : ''}`}>{notif.title}</p>
                <p className={`text-[10px] leading-relaxed ${notif.isRead ? 'text-slate-300' : 'text-slate-500'}`}>{notif.content}</p>
                <p className="text-[9px] text-slate-400 mt-2 italic">{notif.time}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 px-1">社区健康评分</h4>
            <div className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center text-center border border-slate-100">
              <div className="relative size-32 mb-4">
                <svg className="size-full" viewBox="0 0 36 36">
                  <path className="stroke-slate-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" />
                  <path className="stroke-orange-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray="64, 100" strokeLinecap="round" strokeWidth="3" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">64</span>
                  <span className="text-[9px] font-bold text-slate-400">尚可</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">社区健康稳定性较昨日下降 <span className="text-red-500 font-bold">4分</span>。</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        active 
          ? 'bg-primary text-white font-medium shadow-lg shadow-primary/20' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`size-2 rounded-full ${color}`}></div>
      <span className="text-[10px] text-slate-600">{label}</span>
    </div>
  );
}
