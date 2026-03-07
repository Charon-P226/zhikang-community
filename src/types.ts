export enum AppView {
  HOME = 'HOME',
  HEALTH_RISK = 'HEALTH_RISK',
  ACCESSIBILITY = 'ACCESSIBILITY',
  EMERGENCY_RESPONSE = 'EMERGENCY_RESPONSE',
  NOTIFICATIONS = 'NOTIFICATIONS',
  HEALTH_SUPPORT = 'HEALTH_SUPPORT',
}

export interface RiskArea {
  id: string;
  name: string;
  riskLevel: '极高' | '中等' | '低';
  percentage: number;
  activeCases: number;
  trend: 'up' | 'down' | 'stable';
  population: number;
  description: string;
  coordinates: {
    top: string;
    left: string;
  };
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  time: string;
  type: 'danger' | 'info' | 'warning' | 'success';
  isRead: boolean;
}

export interface Incident {
  id: string;
  type: string;
  location: string;
  resident: string;
  time: string;
  status: string;
  distance: string;
  image: string;
  coordinates: [number, number]; // 经纬度坐标
}
