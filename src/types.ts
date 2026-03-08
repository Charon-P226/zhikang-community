export enum AppView {
  HOME = 'HOME',
  HEALTH_RISK = 'HEALTH_RISK',
  ACCESSIBILITY = 'ACCESSIBILITY',
  EMERGENCY_RESPONSE = 'EMERGENCY_RESPONSE',
  NOTIFICATIONS = 'NOTIFICATIONS',
  HEALTH_SUPPORT = 'HEALTH_SUPPORT',
  SITE_ANALYSIS = 'SITE_ANALYSIS',
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

// ========== 建筑模型数据接口 (对接 Rhino/CAD) ==========

// 设施点类型
export type FacilityType = 'elevator' | 'stairs' | 'entrance' | 'exit' | 'wc' | 'room' | 'corridor';

// 房间类型
export type RoomType = 'residential' | 'commercial' | 'public' | 'utility';

// 建筑模型 (从 Rhino/CAD 导出)
export interface BuildingModel {
  id: string;
  name: string;
  description?: string;
  // 建筑四角地理坐标（用于定位）
  boundaryCoords: [number, number][];
  // 建筑左下角作为坐标系原点
  originCoord: [number, number];
  // 建筑朝向（北偏东角度，度）
  rotation: number;
  // 1米对应的经纬度比例
  meterToLng: number;
  meterToLat: number;
  // 楼层数据
  floors: FloorModel[];
}

// 楼层数据
export interface FloorModel {
  floorNumber: number;
  name: string;
  // 楼层高度 (米)
  height: number;
  // 建筑轮廓（多边形顶点，相对于建筑左下角，单位：米）
  outline: { x: number; y: number }[];
  // 房间/区域
  rooms: RoomModel[];
  // 设施点
  facilities: FacilityModel[];
}

// 房间/区域
export interface RoomModel {
  id: string;
  name: string;
  type: RoomType;
  // 房间轮廓
  outline: { x: number; y: number }[];
  // 房间中心点（用于定位）
  center: { x: number; y: number };
}

// 设施点 (从 CAD 属性提取)
export interface FacilityModel {
  id: string;
  name: string;
  type: FacilityType;
  // 设施坐标（相对于建筑左下角，单位：米）
  position: { x: number; y: number };
  // 设施属性（从 CAD 扩展属性读取）
  attributes?: Record<string, string>;
}

// 坐标转换工具
export interface CoordinateTransform {
  // 室内坐标转地理坐标
  indoorToOutdoor(x: number, y: number): [number, number];
  // 地理坐标转室内坐标
  outdoorToIndoor(lng: number, lat: number): { x: number; y: number };
}
