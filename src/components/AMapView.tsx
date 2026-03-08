import { useEffect, useRef, useState } from 'react';
import { RiskArea, Incident, BuildingModel, FloorModel, FacilityModel } from '../types';

// 基地坐标系标记点类型
export interface SiteMarker {
  id: string;
  type: 'Heat_Anchor' | 'Barrier' | 'Link_Point';
  lng: number;
  lat: number;
  relativeX: number;  // 米
  relativeY: number;  // 米
  name: string;
}

declare global {
  interface Window {
    AMap: any;
  }
}

interface AMapViewProps {
  riskAreas: RiskArea[];
  incidents: Incident[];
  activeView: string;
  activeDataLayer?: 'disease' | 'heat' | 'air';
  selectedRiskArea: RiskArea | null;
  onSelectRiskArea: (area: RiskArea | null) => void;
  selectedIncident: Incident | null;
  onSelectIncident: (incident: Incident | null) => void;
  isIncidentDismissed: boolean;
  isDispatched: boolean;
  zoom?: number;
  // 建筑模型数据 (新增)
  buildingModel?: BuildingModel | null;
  currentFloor?: number;
  onFloorChange?: (floor: number) => void;
  // 站点分析模式
  isSiteAnalysisMode?: boolean;
}

// 地球半径（米）- WGS84
const EARTH_RADIUS = 6371000;

// 经纬度转平面坐标（米）- 考虑地球曲率
function lngLatToMeter(origin: {lng: number, lat: number}, target: {lng: number, lat: number}) {
  const dLat = (target.lat - origin.lat) * Math.PI / 180;
  const dLng = (target.lng - origin.lng) * Math.PI / 180;
  const latRad = origin.lat * Math.PI / 180;

  // X: 东西方向 (经度差)
  const x = dLng * EARTH_RADIUS * Math.cos(latRad);
  // Y: 南北方向 (纬度差)
  const y = dLat * EARTH_RADIUS;

  return { x: Math.round(x), y: Math.round(y) };
}

export default function AMapView({
  riskAreas,
  incidents,
  activeView,
  activeDataLayer = 'heat',
  selectedRiskArea,
  onSelectRiskArea,
  selectedIncident,
  onSelectIncident,
  isIncidentDismissed,
  isDispatched,
  zoom = 1,
  buildingModel,
  currentFloor = 1,
  onFloorChange,
  isSiteAnalysisMode = false
}: AMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const drivingInstanceRef = useRef<any>(null);
  const [status, setStatus] = useState<string>('初始化中...');
  const [mapError, setMapError] = useState<string>('');
  const [routeInfo, setRouteInfo] = useState<string>('');

  // 站点分析模式状态
  const [originPoint, setOriginPoint] = useState<{lng: number, lat: number} | null>(null);
  const [markers, setMarkers] = useState<SiteMarker[]>([]);
  const [selectedMarkerType, setSelectedMarkerType] = useState<'Heat_Anchor' | 'Barrier' | 'Link_Point'>('Heat_Anchor');
  const [currentClickPos, setCurrentClickPos] = useState<{x: number, y: number} | null>(null);
  const [siteAnalysisTab, setSiteAnalysisTab] = useState<'collect' | 'design'>('collect');
  const markerRefs = useRef<any[]>([]);

  // 设计参数预判状态
  const [centroid, setCentroid] = useState<{x: number, y: number} | null>(null);
  const [coreRadius, setCoreRadius] = useState<number>(0);
  const [areaSuggestion, setAreaSuggestion] = useState<{type: string, message: string, area: number} | null>(null);
  const [roadMarkers, setRoadMarkers] = useState<Array<{direction: string, position: [number, number], distance: number}>>([]);
  const [optimalEntry, setOptimalEntry] = useState<{position: [number, number], score: number, direction: string} | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // 圆形覆盖层引用
  const centroidCircleRef = useRef<any>(null);
  const entryMarkerRef = useRef<any>(null);

  // 计算热力重心
  const calculateCentroid = () => {
    const heatAnchors = markers.filter(m => m.type === 'Heat_Anchor');
    if (heatAnchors.length === 0) {
      setCentroid(null);
      setCoreRadius(0);
      return;
    }

    const avgX = heatAnchors.reduce((sum, m) => sum + m.relativeX, 0) / heatAnchors.length;
    const avgY = heatAnchors.reduce((sum, m) => sum + m.relativeY, 0) / heatAnchors.length;

    // 计算平均距离作为半径
    const avgDistance = heatAnchors.reduce((sum, m) => {
      return sum + Math.sqrt(Math.pow(m.relativeX - avgX, 2) + Math.pow(m.relativeY - avgY, 2));
    }, 0) / heatAnchors.length;

    setCentroid({ x: Math.round(avgX), y: Math.round(avgY) });
    setCoreRadius(Math.round(avgDistance));

    // 在地图上绘制圆形区域
    if (originPoint && mapInstanceRef.current) {
      const centerLngLat = {
        lng: originPoint.lng + avgX / (EARTH_RADIUS * Math.cos(originPoint.lat * Math.PI / 180) * Math.PI / 180),
        lat: originPoint.lat + avgY / (EARTH_RADIUS * Math.PI / 180)
      };

      // 清除旧的圆形
      if (centroidCircleRef.current) {
        centroidCircleRef.current.setMap(null);
      }

      // 创建新的圆形覆盖层
      const circle = new window.AMap.Circle({
        center: [centerLngLat.lng, centerLngLat.lat],
        radius: avgDistance,
        fillColor: 'rgba(139, 92, 246, 0.3)',
        strokeColor: '#8b5cf6',
        strokeWeight: 2,
        strokeOpacity: 0.8,
        fillOpacity: 0.3
      });

      circle.setMap(mapInstanceRef.current);
      centroidCircleRef.current = circle;
    }
  };

  // 计算面积配比建议
  const calculateAreaSuggestion = () => {
    const heatCount = markers.filter(m => m.type === 'Heat_Anchor').length;
    const linkCount = markers.filter(m => m.type === 'Link_Point').length;

    if (heatCount > 10 && linkCount < 5) {
      setAreaSuggestion({
        type: 'warning',
        message: '建议增加社区社交面积至 4000㎡',
        area: 4000
      });
    } else if (heatCount > 5 && linkCount < 3) {
      setAreaSuggestion({
        type: 'warning',
        message: '建议增加社区社交面积至 2500㎡',
        area: 2500
      });
    } else if (heatCount > 3 && linkCount > 5) {
      setAreaSuggestion({
        type: 'good',
        message: '面积配比合理',
        area: 0
      });
    } else {
      setAreaSuggestion({
        type: 'info',
        message: '建议进一步分析数据后再做判断',
        area: 0
      });
    }
  };

  // 添加主干道标记
  const addRoadMarker = (direction: string) => {
    if (!originPoint) return;

    // 计算各方向的大致位置（向外偏移约200米）
    const offsets: {[key: string]: {x: number, y: number}} = {
      '北': {x: 0, y: 200},
      '东北': {x: 150, y: 150},
      '东': {x: 200, y: 0},
      '东南': {x: 150, y: -150},
      '南': {x: 0, y: -200},
      '西南': {x: -150, y: -150},
      '西': {x: -200, y: 0},
      '西北': {x: -150, y: 150}
    };

    const offset = offsets[direction];
    if (!offset) return;

    const newLngLat = {
      lng: originPoint.lng + offset.x / (EARTH_RADIUS * Math.cos(originPoint.lat * Math.PI / 180) * Math.PI / 180),
      lat: originPoint.lat + offset.y / (EARTH_RADIUS / 180 * Math.PI)
    };

    const newRoadMarker = {
      direction,
      position: [newLngLat.lng, newLngLat.lat] as [number, number],
      distance: Math.sqrt(offset.x * offset.x + offset.y * offset.y)
    };

    // 检查是否已存在相同方向
    const exists = roadMarkers.find(r => r.direction === direction);
    if (exists) {
      setRoadMarkers(roadMarkers.map(r => r.direction === direction ? newRoadMarker : r));
    } else {
      setRoadMarkers([...roadMarkers, newRoadMarker]);
    }
  };

  // 计算入口可达性
  const calculateAccessibility = async () => {
    if (!originPoint || roadMarkers.length === 0) return;

    setIsCalculating(true);

    // 简化算法：基于距离和方向评分
    // 实际项目中可以使用 AMap.Driving 进行真实路径规划
    const scores = roadMarkers.map(road => {
      // 距离评分（越近越好）
      const distanceScore = Math.max(0, 100 - road.distance / 5);

      // 方向评分（北向和东向更佳）
      const directionBonus: {[key: string]: number} = {
        '北': 15,
        '东北': 10,
        '东': 15,
        '东南': 5,
        '南': 0,
        '西南': 0,
        '西': 5,
        '西北': 10
      };

      const score = distanceScore + (directionBonus[road.direction] || 0);
      return { ...road, score };
    });

    // 找出最佳入口
    const best = scores.reduce((prev, curr) => curr.score > prev.score ? curr : prev);

    setOptimalEntry({
      position: best.position,
      score: Math.round(best.score),
      direction: best.direction
    });

    // 在地图上标记最佳入口
    if (mapInstanceRef.current) {
      // 清除旧的入口标记
      if (entryMarkerRef.current) {
        entryMarkerRef.current.setMap(null);
      }

      const entryContent = document.createElement('div');
      entryContent.innerHTML = `<div style="width:32px;height:32px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;color:white;">入</div>`;

      const entryMarker = new window.AMap.Marker({
        position: best.position,
        content: entryContent,
        anchor: 'center',
        offset: new window.AMap.Pixel(0, 0),
        title: `最佳入口: ${best.direction}向 (评分: ${Math.round(best.score)})`
      });

      entryMarker.setMap(mapInstanceRef.current);
      entryMarkerRef.current = entryMarker;
    }

    setIsCalculating(false);
  };

  // 清除设计分析结果
  const clearAnalysis = () => {
    setCentroid(null);
    setCoreRadius(0);
    setAreaSuggestion(null);
    setRoadMarkers([]);
    setOptimalEntry(null);

    if (centroidCircleRef.current) {
      centroidCircleRef.current.setMap(null);
      centroidCircleRef.current = null;
    }
    if (entryMarkerRef.current) {
      entryMarkerRef.current.setMap(null);
      entryMarkerRef.current = null;
    }
  };

  // 使用 ref 保存最新状态，解决闭包问题
  const originPointRef = useRef(originPoint);
  const markersRef = useRef(markers);
  const selectedMarkerTypeRef = useRef(selectedMarkerType);
  const isSiteAnalysisModeRef = useRef(isSiteAnalysisMode);

  // 同步 ref 与状态
  useEffect(() => { originPointRef.current = originPoint; }, [originPoint]);
  useEffect(() => { markersRef.current = markers; }, [markers]);
  useEffect(() => { selectedMarkerTypeRef.current = selectedMarkerType; }, [selectedMarkerType]);
  useEffect(() => { isSiteAnalysisModeRef.current = isSiteAnalysisMode; }, [isSiteAnalysisMode]);

  const CENTER: [number, number] = [117.185, 39.149];

  const riskAreaCoords: { [key: string]: [number, number] } = {
    '1': [117.188, 39.152],
    '2': [117.1853, 39.1488],
    '3': [117.182, 39.146],
  };

  // 社区医院位置
  const hospitalCoord: [number, number] = [117.176836, 39.147133];

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      if (!window.AMap) {
        setStatus('高德地图加载失败');
        return;
      }

      try {
        setStatus('正在创建地图...');

        const map = new window.AMap.Map(mapRef.current, {
          center: CENTER,
          zoom: 16,
          mapStyle: 'amap://styles/normal',
          viewMode: '2D',
          resizeEnable: true,
        });

        map.on('complete', () => {
          setStatus('地图加载成功');
        });

        mapInstanceRef.current = map;
        updateMarkers();

        // 站点分析模式 - 左键点击设置原点或计算相对坐标
        map.on('click', (e: any) => {
          if (!isSiteAnalysisModeRef.current) {
            onSelectRiskArea(null);
            onSelectIncident(null);
            return;
          }

          const { lng, lat } = e.lnglat;

          if (!originPointRef.current) {
            // 没有原点时，点击设置原点
            setOriginPoint({ lng, lat });
            setCurrentClickPos(null);
          } else {
            // 有原点时，计算相对坐标
            const meter = lngLatToMeter(originPointRef.current, { lng, lat });
            setCurrentClickPos(meter);
          }
        });

        // 站点分析模式 - 右键点击添加标记
        map.on('rightclick', (e: any) => {
          if (!isSiteAnalysisModeRef.current) return;

          // 没有原点时，右键点击设置原点
          if (!originPointRef.current) {
            const { lng, lat } = e.lnglat;
            setOriginPoint({ lng, lat });
            return;
          }

          const { lng, lat } = e.lnglat;
          const meter = lngLatToMeter(originPointRef.current, { lng, lat });

          const newMarker: SiteMarker = {
            id: `marker_${Date.now()}`,
            type: selectedMarkerTypeRef.current,
            lng,
            lat,
            relativeX: meter.x,
            relativeY: meter.y,
            name: `${selectedMarkerTypeRef.current}_${markersRef.current.filter((m: SiteMarker) => m.type === selectedMarkerTypeRef.current).length + 1}`
          };

          setMarkers(prev => [...prev, newMarker]);
        });

        // 阻止默认右键菜单
        map.on('contextmenu', (e: any) => {
          if (isSiteAnalysisModeRef.current) {
            e.domEvent.preventDefault();
          }
        });

      } catch (err: any) {
        setStatus('地图创建失败');
        setMapError(err.message || String(err));
      }
    };

    const checkAndInit = () => {
      if (window.AMap) {
        setTimeout(() => {
          initMap();
        }, 300);
      } else {
        let attempts = 0;
        const timer = setInterval(() => {
          attempts++;
          if (window.AMap) {
            clearInterval(timer);
            checkAndInit();
          } else if (attempts > 50) {
            clearInterval(timer);
            setStatus('高德地图加载超时');
          }
        }, 200);
      }
    };

    checkAndInit();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
      }
    };
  }, []);

  // 站点分析模式 - 监听数据变化渲染标记点
  useEffect(() => {
    if (!mapInstanceRef.current || !isSiteAnalysisMode) return;

    const map = mapInstanceRef.current;
    if (!map.renderSiteMarkers) return;

    // 清除旧的标记
    markerRefs.current.forEach((m: any) => m && m.setMap && m.setMap(null));
    markerRefs.current = [];

    // 渲染原点标记
    if (originPoint) {
      const originContent = document.createElement('div');
      originContent.innerHTML = '<div style="width:24px;height:24px;background:#8b5cf6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 20h16L12 2z"/></svg></div>';

      const originMarker = new window.AMap.Marker({
        position: [originPoint.lng, originPoint.lat],
        content: originContent,
        anchor: 'center',
        offset: new window.AMap.Pixel(0, 0),
        title: '基地原点',
      });
      originMarker.setMap(map);
      markerRefs.current.push(originMarker);
    }

    // 渲染标记点
    markers.forEach((marker: SiteMarker) => {
      const color = marker.type === 'Heat_Anchor' ? '#ef4444' :
                   marker.type === 'Barrier' ? '#f97316' : '#3b82f6';

      const markerContent = document.createElement('div');
      markerContent.innerHTML = `<div style="width:20px;height:20px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"></div>`;

      const amarker = new window.AMap.Marker({
        position: [marker.lng, marker.lat],
        content: markerContent,
        anchor: 'center',
        offset: new window.AMap.Pixel(0, 0),
        title: `${marker.type}: (${marker.relativeX}, ${marker.relativeY})m`,
      });
      amarker.setMap(map);
      markerRefs.current.push(amarker);
    });
  }, [originPoint, markers, isSiteAnalysisMode]);

  // 导出 JSON 功能（含设计建议坐标）
  const exportSiteData = () => {
    // 原始标记点数据
    const markersData = markers.map(m => ({
      Type: m.type,
      Relative_X: m.relativeX,
      Relative_Y: m.relativeY
    }));

    // 构建完整导出数据
    const exportData: Record<string, any> = {
      origin: originPoint ? {
        lng: originPoint.lng,
        lat: originPoint.lat
      } : null,
      markers: markersData
    };

    // 添加热力重心（设计中心）
    if (centroid) {
      exportData.designCentroid = {
        x: centroid.x,
        y: centroid.y,
        radius: coreRadius,
        description: '公共活力核心 - 建议建筑主功能区位置'
      };
    }

    // 添加最佳入口
    if (optimalEntry && originPoint) {
      // 计算相对于原点的坐标
      const entryOffset = {
        x: Math.round((optimalEntry.position[0] - originPoint.lng) * 111000 * Math.cos(originPoint.lat * Math.PI / 180)),
        y: Math.round((optimalEntry.position[1] - originPoint.lat) * 111000)
      };
      exportData.optimalEntry = {
        direction: optimalEntry.direction,
        relativeX: entryOffset.x,
        relativeY: entryOffset.y,
        lng: optimalEntry.position[0],
        lat: optimalEntry.position[1],
        accessibilityScore: optimalEntry.score,
        description: '最佳无障碍主入口位置'
      };
    }

    // 添加面积建议
    if (areaSuggestion) {
      exportData.areaSuggestion = {
        message: areaSuggestion.message,
        suggestedArea: areaSuggestion.area,
        heatAnchorCount: markers.filter(m => m.type === 'Heat_Anchor').length,
        linkPointCount: markers.filter(m => m.type === 'Link_Point').length
      };
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'site_analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 删除标记点
  const deleteMarker = (id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
  };

  // 清除原点
  const clearOrigin = () => {
    setOriginPoint(null);
    setCurrentClickPos(null);
    setMarkers([]);
  };

  const searchRoute = (incidentCoord: [number, number]) => {
    if (!mapInstanceRef.current) {
      setRouteInfo('地图未初始化');
      return;
    }

    // 如果 Driving 插件未加载，先异步加载
    if (!window.AMap.Driving) {
      setRouteInfo('正在加载插件...');
      window.AMap.plugin(['AMap.Driving'], () => {
        setTimeout(() => performSearch(incidentCoord), 100);
      });
      return;
    }

    performSearch(incidentCoord);
  };

  const performSearch = (incidentCoord: [number, number]) => {
    if (!mapInstanceRef.current) return;

    setRouteInfo('正在规划路径...');

    // 清除之前的路线
    if (drivingInstanceRef.current) {
      drivingInstanceRef.current.clear();
    }

    // 创建 Driving 实例，绑定地图
    const driving = new window.AMap.Driving({
      map: mapInstanceRef.current,
      policy: window.AMap.DrivingPolicy.LEAST_TIME,
      hideMarkers: true,
      showTraffic: true,
      isOutline: true,
      outlineColor: '#1890ff',
      autoFitView: true,
    });

    driving.search(
      hospitalCoord,
      incidentCoord,
      (status: string, result: any) => {
        console.log('Driving result:', status, result);

        if (status === 'complete' && result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          const distance = (route.distance / 1000).toFixed(1);
          const time = Math.round(route.time / 60);

          setRouteInfo('已规划: ' + distance + '公里, 约' + time + '分钟');
        } else {
          setRouteInfo('规划失败: ' + (result?.info || status));
        }
      }
    );

    drivingInstanceRef.current = driving;
  };

  // 绘制高德地图 Driving 路线
  const drawDrivingRoute = (route: any) => {
    if (!mapInstanceRef.current || !route) return;

    // 清除之前的路线
    if (drivingInstanceRef.current) {
      drivingInstanceRef.current.clear();
    }

    // 获取路线坐标
    const pathCoordinates: [number, number][] = [];

    route.steps?.forEach((step: any) => {
      if (step.polyline) {
        const points = step.polyline.split(';');
        points.forEach((point: string) => {
          const [lng, lat] = point.split(',').map(Number);
          if (!isNaN(lng) && !isNaN(lat)) {
            pathCoordinates.push([lng, lat]);
          }
        });
      }
    });

    if (pathCoordinates.length > 0) {
      const polyline = new window.AMap.Polyline({
        path: pathCoordinates,
        strokeColor: '#1890ff',
        strokeWeight: 5,
        strokeOpacity: 0.8,
      });
      polyline.setMap(mapInstanceRef.current);

      drivingInstanceRef.current = { clear: () => polyline.setMap(null) };
      mapInstanceRef.current.setFitView();
    }

    addEmergencyMarkers(mapInstanceRef.current);
  };

  // 绘制路线
  const drawRoute = (steps: any[]) => {
    if (!mapInstanceRef.current || !steps || steps.length === 0) return;

    // 清除之前的路线
    if (drivingInstanceRef.current) {
      drivingInstanceRef.current.clear();
    }

    // 创建折线显示路线
    const pathCoordinates: [number, number][] = [];

    steps.forEach((step: any) => {
      if (step.polyline) {
        const points = step.polyline.split(';');
        points.forEach((point: string) => {
          const [lng, lat] = point.split(',').map(Number);
          if (!isNaN(lng) && !isNaN(lat)) {
            pathCoordinates.push([lng, lat]);
          }
        });
      }
    });

    if (pathCoordinates.length > 0) {
      const polyline = new window.AMap.Polyline({
        path: pathCoordinates,
        strokeColor: '#1890ff',
        strokeWeight: 5,
        strokeOpacity: 0.8,
      });
      polyline.setMap(mapInstanceRef.current);

      // 保存路线引用以便清除
      drivingInstanceRef.current = { clear: () => polyline.setMap(null) };

      // 自动调整视野
      mapInstanceRef.current.setFitView();
    }

    addEmergencyMarkers(mapInstanceRef.current);
  };

  // 绘制 OSRM 路线 (GeoJSON 格式)
  const drawOSRMRoute = (geometry: any) => {
    if (!mapInstanceRef.current || !geometry || !geometry.coordinates) return;

    // 清除之前的路线
    if (drivingInstanceRef.current) {
      drivingInstanceRef.current.clear();
    }

    // OSRM 返回的是 [lng, lat] 格式
    const pathCoordinates: [number, number][] = geometry.coordinates.map((coord: number[]) =>
      [coord[0], coord[1]] as [number, number]
    );

    if (pathCoordinates.length > 0) {
      const polyline = new window.AMap.Polyline({
        path: pathCoordinates,
        strokeColor: '#1890ff',
        strokeWeight: 5,
        strokeOpacity: 0.8,
      });
      polyline.setMap(mapInstanceRef.current);

      // 保存路线引用以便清除
      drivingInstanceRef.current = { clear: () => polyline.setMap(null) };

      // 自动调整视野
      mapInstanceRef.current.setFitView();
    }

    addEmergencyMarkers(mapInstanceRef.current);
  };

  const clearRoute = () => {
    if (drivingInstanceRef.current) {
      drivingInstanceRef.current.clear();
      drivingInstanceRef.current = null;
    }
    setRouteInfo('');
    updateMarkers();
  };

  // 添加应急响应视图的标记点 - 显示多个急救点和医院
  const addEmergencyMarkers = (map: any) => {
    if (!map) return;

    // 医院标记（始终显示）
    const hospitalContent = document.createElement('div');
    hospitalContent.innerHTML = '<div style="width:40px;height:40px;background:#10b981;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg></div>';

    const hospitalMarker = new window.AMap.Marker({
      position: hospitalCoord,
      content: hospitalContent,
      anchor: 'center',
      offset: new window.AMap.Pixel(0, 0),
      title: '社区医院',
    });
    hospitalMarker.setMap(map);

    // 显示所有急救点（使用incidents数组）
    incidents.forEach((incident) => {
      const isSelected = selectedIncident?.id === incident.id;
      const isCurrentlyDispatched = isDispatched && isSelected;

      const incidentContent = document.createElement('div');
      if (isCurrentlyDispatched) {
        // 派遣中 - 绿色
        incidentContent.innerHTML = '<div style="width:44px;height:44px;background:#10b981;border:3px solid white;border-radius:50%;box-shadow:0 0 20px rgba(16,185,129,0.5);display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>';
      } else if (isSelected) {
        // 已选中但未派遣 - 闪烁红色
        incidentContent.innerHTML = '<div style="width:48px;height:48px;background:#dc2626;border:4px solid white;border-radius:50%;box-shadow:0 0 25px rgba(220,38,38,0.6);display:flex;align-items:center;justify-content:center;cursor:pointer;"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 22h20L12 2z"/></svg></div>';
      } else {
        // 未选中 - 红色
        incidentContent.innerHTML = '<div style="width:40px;height:40px;background:#dc2626;border:3px solid white;border-radius:50%;box-shadow:0 0 15px rgba(220,38,38,0.4);display:flex;align-items:center;justify-content:center;cursor:pointer;"><span style="color:white;font-weight:bold;font-size:12px;">!</span></div>';
      }

      const incidentMarker = new window.AMap.Marker({
        position: incident.coordinates,
        content: incidentContent,
        anchor: 'center',
        offset: new window.AMap.Pixel(0, 0),
        title: incident.location,
      });

      incidentMarker.on('click', () => {
        onSelectIncident(incident);
      });

      incidentMarker.setMap(map);
    });
  };

  const updateMarkers = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    map.clearMap();

    // 1. 应急响应视图
    if (activeView === 'EMERGENCY_RESPONSE') {
      addEmergencyMarkers(map);
    }

    // 2. 健康风险热力图视图
    if (activeView === 'HEALTH_RISK') {
      // 根据活动数据层显示不同内容
      if (activeDataLayer === 'heat') {
        // 商业活力 - 使用不同大小的气泡圆圈表示
        const commercialAreas = [
          { name: '天津都行商城', center: [117.1853, 39.1488], level: 'high', size: 350, color: '#dc2626' },
          { name: '估衣街', center: [117.182, 39.151], level: 'medium', size: 250, color: '#f97316' },
          { name: '北大关', center: [117.178, 39.147], level: 'low', size: 150, color: '#10b981' },
        ];

        commercialAreas.forEach((area) => {
          // 绘制多个重叠的圆形形成气泡效果
          for (let i = 0; i < 3; i++) {
            const offsetX = (Math.random() - 0.5) * 0.004;
            const offsetY = (Math.random() - 0.5) * 0.003;
            const bubbleCoord: [number, number] = [area.center[0] + offsetX, area.center[1] + offsetY];
            const radius = area.size * (0.8 + Math.random() * 0.4);

            const circle = new window.AMap.Circle({
              center: bubbleCoord,
              radius: radius,
              fillOpacity: 0.25,
              strokeOpacity: 0.5,
              strokeColor: area.color,
              strokeWeight: 2,
              fillColor: area.color,
            });
            circle.setMap(map);
          }

          // 中心标记
          const markerContent = document.createElement('div');
          markerContent.innerHTML = '<div style="width:20px;height:20px;background:' + area.color + ';border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>';
          const marker = new window.AMap.Marker({
            position: area.center,
            content: markerContent,
            anchor: 'center',
            offset: new window.AMap.Pixel(0, 0),
          });
          marker.setMap(map);
        });
      } else if (activeDataLayer === 'disease') {
        // 传染病 - 用大量小圆点表示，密度根据风险等级
        const diseaseAreas = [
          { name: '天津都行商城', center: [117.1853, 39.1488], level: 'high', count: 45 },
          { name: '估衣街', center: [117.182, 39.151], level: 'medium', count: 25 },
          { name: '北大关', center: [117.178, 39.147], level: 'low', count: 10 },
        ];

        diseaseAreas.forEach((area) => {
          const dotColor = area.level === 'high' ? '#dc2626' : area.level === 'medium' ? '#f97316' : '#10b981';
          // 根据count生成对应数量的小圆点
          for (let i = 0; i < area.count; i++) {
            // 在中心点附近随机分布
            const offsetX = (Math.random() - 0.5) * 0.012;
            const offsetY = (Math.random() - 0.5) * 0.008;
            const dotCoord: [number, number] = [area.center[0] + offsetX, area.center[1] + offsetY];

            const dotContent = document.createElement('div');
            dotContent.innerHTML = '<div style="width:10px;height:10px;background:' + dotColor + ';border-radius:50%;opacity:0.8;"></div>';

            const dotMarker = new window.AMap.Marker({
              position: dotCoord,
              content: dotContent,
              anchor: 'center',
              offset: new window.AMap.Pixel(0, 0),
            });
            dotMarker.setMap(map);
          }
        });
      } else if (activeDataLayer === 'air') {
        // 空气污染物 - 使用圆形团块显示（类似苹果天气AQI）
        const aqiAreas = [
          { name: '重度污染', center: [117.190, 39.152], level: 'heavy', aqi: 245, color: '#dc2626' },
          { name: '中度污染', center: [117.186, 39.150], level: 'medium', aqi: 128, color: '#f97316' },
          { name: '良', center: [117.182, 39.147], level: 'good', aqi: 65, color: '#10b981' },
        ];

        aqiAreas.forEach((area) => {
          // 创建多个重叠的圆形形成一团效果
          const circles = 5;
          for (let i = 0; i < circles; i++) {
            const offsetX = (Math.random() - 0.5) * 0.006;
            const offsetY = (Math.random() - 0.5) * 0.004;
            const centerCoord: [number, number] = [area.center[0] + offsetX, area.center[1] + offsetY];
            const radius = 150 + Math.random() * 150; // 150-300米

            const circle = new window.AMap.Circle({
              center: centerCoord,
              radius: radius,
              fillOpacity: 0.4,
              strokeOpacity: 0,
              fillColor: area.color,
            });
            circle.setMap(map);
          }

          // 在中心添加AQI数值标签
          const labelContent = document.createElement('div');
          labelContent.innerHTML = '<div style="background:' + area.color + ';color:white;padding:8px 12px;border-radius:20px;font-size:14px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.3);">' + area.aqi + '</div>';
          const labelMarker = new window.AMap.Marker({
            position: area.center,
            content: labelContent,
            anchor: 'center',
            offset: new window.AMap.Pixel(0, 0),
          });
          labelMarker.setMap(map);
        });
      }
    }

    // 3. 无障碍出行视图
    if (activeView === 'ACCESSIBILITY') {
      const facilities = [
        { coord: [117.187, 39.150] as [number, number], name: '电梯' },
        { coord: [117.184, 39.148] as [number, number], name: '坡道' },
        { coord: [117.181, 39.146] as [number, number], name: '无障碍WC' },
      ];

      facilities.forEach((facility) => {
        const markerContent = document.createElement('div');
        markerContent.innerHTML = '<div style="width:32px;height:32px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/></svg></div>';

        const marker = new window.AMap.Marker({
          position: facility.coord,
          content: markerContent,
          anchor: 'center',
          offset: new window.AMap.Pixel(0, 0),
          title: facility.name,
        });
        marker.setMap(map);
      });
    }
  };

  // 渲染建筑模型 (新增)
  const renderBuildingModel = (map: any, building: BuildingModel, floorNumber: number) => {
    if (!map || !building) return;

    // 找到对应楼层
    const floor = building.floors.find(f => f.floorNumber === floorNumber);
    if (!floor) return;

    // 1. 绘制建筑轮廓（转为地理坐标）
    if (floor.outline && floor.outline.length > 0) {
      const outlineCoords = floor.outline.map(pt => {
        const lng = building.originCoord[0] + pt.x * building.meterToLng;
        const lat = building.originCoord[1] + pt.y * building.meterToLat;
        return [lng, lat];
      });

      const polygon = new window.AMap.Polygon({
        path: outlineCoords,
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
        strokeColor: '#2563eb',
        strokeWeight: 2,
        strokeOpacity: 0.8,
      });
      polygon.setMap(map);
    }

    // 2. 绘制房间
    floor.rooms.forEach(room => {
      if (room.outline && room.outline.length > 0) {
        const roomCoords = room.outline.map(pt => {
          const lng = building.originCoord[0] + pt.x * building.meterToLng;
          const lat = building.originCoord[1] + pt.y * building.meterToLat;
          return [lng, lat];
        });

        const roomColor = room.type === 'residential' ? '#10b981' :
                         room.type === 'commercial' ? '#f59e0b' :
                         room.type === 'public' ? '#3b82f6' : '#6b7280';

        const polygon = new window.AMap.Polygon({
          path: roomCoords,
          fillColor: roomColor,
          fillOpacity: 0.3,
          strokeColor: roomColor,
          strokeWeight: 1,
          strokeOpacity: 0.6,
          title: room.name,
        });
        polygon.setMap(map);

        // 房间点击事件
        polygon.on('click', () => {
          console.log('点击房间:', room.name);
        });
      }
    });

    // 3. 绘制设施点
    floor.facilities.forEach(facility => {
      const lng = building.originCoord[0] + facility.position.x * building.meterToLng;
      const lat = building.originCoord[1] + facility.position.y * building.meterToLat;

      const facilityIcon = getFacilityIcon(facility.type);
      const markerContent = document.createElement('div');
      markerContent.innerHTML = `<div style="width:28px;height:28px;background:${facilityIcon.color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;">${facilityIcon.svg}</div>`;

      const marker = new window.AMap.Marker({
        position: [lng, lat],
        content: markerContent,
        anchor: 'center',
        offset: new window.AMap.Pixel(0, 0),
        title: facility.name,
      });
      marker.setMap(map);
    });

    // 自动调整视野
    map.setFitView();
  };

  // 获取设施点图标
  const getFacilityIcon = (type: string) => {
    const icons: Record<string, { color: string; svg: string }> = {
      elevator: { color: '#8b5cf6', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 6h-2v2h-2v-2H9v-2h2V7h2v2h2v2z"/></svg>' },
      stairs: { color: '#f97316', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z"/></svg>' },
      entrance: { color: '#10b981', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>' },
      exit: { color: '#ef4444', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>' },
      wc: { color: '#06b6d4', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2v-2zm1-10c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg>' },
      room: { color: '#64748b', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 5.69l5 4.5V18h-2v-6H9v6H7v-7.81l5-4.5M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>' },
      corridor: { color: '#94a3b8', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M4 15h16v-2H4v2zm0 4h16v-2H4v2zm0-8h16V9H4v2zm0-6v2h16V5H4z"/></svg>' },
    };
    return icons[type] || icons.room;
  };

  // 监听建筑模型变化
  useEffect(() => {
    if (!mapInstanceRef.current || !buildingModel) return;
    renderBuildingModel(mapInstanceRef.current, buildingModel, currentFloor);
  }, [buildingModel, currentFloor]);

  // 监听派遣状态变化 - 派遣后显示路径
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (isDispatched && selectedIncident) {
      setTimeout(() => {
        searchRoute(selectedIncident.coordinates);
      }, 500);
    } else if (!isDispatched) {
      clearRoute();
    }
  }, [isDispatched, selectedIncident]);

  // 监听视图切换和数据层切换
  useEffect(() => {
    updateMarkers();
  }, [activeView, activeDataLayer, riskAreas, selectedIncident, incidents]);

  return (
    <div className="w-full h-full relative flex">
      {/* 地图区域 */}
      <div className="flex-1 relative">
        <div className="absolute top-2 left-2 z-50 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {status}
          {routeInfo && <span className="ml-2 text-green-300">| {routeInfo}</span>}
          {mapError && <span className="ml-2 text-red-300">| {mapError}</span>}
        </div>

        <div
          ref={mapRef}
          className="w-full h-full"
          style={{ minHeight: '500px' }}
        />
      </div>

      {/* 健康风险热力图图例 */}
        {activeView === 'HEALTH_RISK' && (
          <div className="absolute bottom-4 right-4 z-50 bg-white/30 backdrop-blur-md rounded-lg shadow-lg p-3">
          {activeDataLayer === 'heat' && (
            <div className="text-xs">
              <p className="font-bold text-slate-800 mb-2">商业活力</p>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-4 h-4 rounded-full bg-red-500"></span>
                <span className="text-slate-600">高 (繁荣)</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                <span className="text-slate-600">中 (一般)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-slate-600">低 (冷清)</span>
              </div>
            </div>
          )}
          {activeDataLayer === 'disease' && (
            <div className="text-xs">
              <p className="font-bold text-slate-800 mb-2">传染病分布</p>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-slate-600">病例 (点越多越密集)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <span className="text-slate-600">中等病例数</span>
              </div>
            </div>
          )}
          {activeDataLayer === 'air' && (
            <div className="text-xs">
              <p className="font-bold text-slate-800 mb-2">空气质量指数 (AQI)</p>
              {/* 渐变条 */}
              <div className="w-full h-3 rounded-full mb-2" style={{ background: 'linear-gradient(to right, #10b981 0%, #facc15 33%, #f97316 66%, #ef4444 100%)' }}></div>
              {/* 数值标注 */}
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0</span>
                <span>50</span>
                <span>100</span>
                <span>150</span>
                <span>200</span>
              </div>
              {/* 等级说明 */}
              <div className="flex justify-between mt-1 text-[9px]">
                <span className="text-green-600">优</span>
                <span className="text-yellow-500">良</span>
                <span className="text-orange-500">轻度</span>
                <span className="text-red-500">中度</span>
                <span className="text-red-600">重度</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 站点分析模式侧边栏 */}
      {isSiteAnalysisMode && (
        <div className="w-80 bg-slate-800/95 backdrop-blur-md p-4 text-white flex flex-col gap-4 overflow-y-auto">
          <div className="text-lg font-bold border-b border-slate-600 pb-2">
            基地坐标系
          </div>

          {/* Tab 切换 */}
          <div className="flex bg-slate-700/50 rounded-lg p-1">
            <button
              onClick={() => setSiteAnalysisTab('collect')}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                siteAnalysisTab === 'collect'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-600'
              }`}
            >
              数据采集
            </button>
            <button
              onClick={() => setSiteAnalysisTab('design')}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                siteAnalysisTab === 'design'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-300 hover:bg-slate-600'
              }`}
            >
              设计建议
            </button>
          </div>

          {/* Tab 内容 */}
          {siteAnalysisTab === 'collect' ? (
            <>
          {/* 基地原点信息 */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-sm text-slate-300 mb-1">基地原点 (Origin)</div>
            {originPoint ? (
              <div className="text-xs font-mono">
                <div>经度: {originPoint.lng.toFixed(6)}</div>
                <div>纬度: {originPoint.lat.toFixed(6)}</div>
              </div>
            ) : (
              <div className="text-xs text-yellow-400">
                右键点击地图设置原点
              </div>
            )}
          </div>

          {/* 当前点击位置 */}
          {currentClickPos && originPoint && (
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-sm text-slate-300 mb-1">相对坐标</div>
              <div className="text-xs font-mono">
                <div>X: {currentClickPos.x} m</div>
                <div>Y: {currentClickPos.y} m</div>
              </div>
            </div>
          )}

          {/* 标记类型选择 */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-sm text-slate-300 mb-2">标记类型</div>
            <div className="flex flex-col gap-2">
              {[
                {
                  type: 'Heat_Anchor' as const,
                  color: 'bg-red-500',
                  label: '热点 (Heat)',
                  tooltip: '非正式社交核心。代表居民自发聚集、高频活动的场所，决定了规划的"公共空间能级"。',
                  impact: '建议：在此处扩充公共空间，植入适老化服务设施。'
                },
                {
                  type: 'Barrier' as const,
                  color: 'bg-yellow-500',
                  label: '障碍 (Barrier)',
                  tooltip: '健康环境断点。代表通行阻碍、适老化缺失或安全隐患，是"微更新手术"的重点位点。',
                  impact: '建议：此处需进行地面平整、加装坡道或人车分流改造。'
                },
                {
                  type: 'Link_Point' as const,
                  color: 'bg-blue-500',
                  label: '连接点 (Link)',
                  tooltip: '社区资源锚点。代表医疗、养老、交通等既有公服设施，决定了规划的"资源协同路径"。',
                  impact: '建议：在此处建立无障碍接驳或引导系统。'
                }
              ].map(({ type, color, label, tooltip, impact }) => (
                <div key={type} className="relative group">
                  <button
                    key={type}
                    onClick={() => setSelectedMarkerType(type)}
                    className={`w-full px-3 py-2 rounded text-sm text-left flex items-center gap-2 transition-all ${
                      selectedMarkerType === type
                        ? 'bg-blue-600 ring-2 ring-blue-400'
                        : 'bg-slate-600 hover:bg-slate-500'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${color}`}></span>
                    {label}
                  </button>
                  {/* 悬浮提示 */}
                  <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-900/95 text-xs text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                    <div className="font-medium text-purple-300 mb-1">{label.replace(/\(.*\)/, '').trim()}</div>
                    <div className="text-slate-300">{tooltip}</div>
                    {selectedMarkerType === type && (
                      <div className="mt-2 pt-2 border-t border-slate-600 text-green-300">
                        {impact}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              右键点击地图添加标记
            </div>
          </div>

          {/* 标记点列表 */}
          <div className="bg-slate-700/50 rounded-lg p-3 flex-1 overflow-y-auto max-h-60">
            <div className="text-sm text-slate-300 mb-2">
              标记点 ({markers.length})
            </div>
            {markers.length === 0 ? (
              <div className="text-xs text-slate-400">暂无标记点</div>
            ) : (
              <div className="flex flex-col gap-1">
                {markers.map(marker => (
                  <div
                    key={marker.id}
                    className="flex items-center justify-between bg-slate-600/50 rounded px-2 py-1 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        marker.type === 'Heat_Anchor' ? 'bg-red-500' :
                        marker.type === 'Barrier' ? 'bg-orange-500' : 'bg-blue-500'
                      }`}></span>
                      <span className="font-mono">
                        ({marker.relativeX}, {marker.relativeY})
                      </span>
                    </div>
                    <button
                      onClick={() => deleteMarker(marker.id)}
                      className="text-red-400 hover:text-red-300 px-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col gap-2">
            <button
              onClick={exportSiteData}
              disabled={markers.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
            >
              导出 site_analysis.json
            </button>
            <button
              onClick={clearOrigin}
              className="px-4 py-2 bg-red-600/70 hover:bg-red-500/70 rounded text-sm font-medium transition-colors"
            >
              清除所有数据
            </button>
          </div>
            </>
          ) : (
            <>
          {/* 设计建议面板 */}
          <div className="bg-purple-900/50 rounded-lg p-3 border border-purple-500/30">
            <div className="text-sm font-bold text-purple-300 mb-2">设计参数预判</div>
            {/* 逻辑释义 */}
            <div className="text-xs text-slate-400 mb-3 italic border-l-2 border-purple-500 pl-2">
              本算法通过连接点拉引流线，通过热点定位空间重心，通过障碍点修正路径权重，从而推导出最符合循证原则的社区规划草图。
            </div>

            {/* 1. 热力重心计算 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-300">热力重心</span>
                <button
                  onClick={calculateCentroid}
                  disabled={markers.filter(m => m.type === 'Heat_Anchor').length === 0}
                  className="px-2 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-xs"
                >
                  计算中心
                </button>
              </div>
              {centroid && (
                <div className="bg-slate-600/50 rounded p-2 text-xs">
                  <div className="text-purple-300 font-bold">公共活力核心</div>
                  <div className="font-mono mt-1">
                    中心: ({centroid.x}, {centroid.y}) m
                  </div>
                  <div className="text-slate-400">
                    半径: {coreRadius} m
                  </div>
                </div>
              )}
              {markers.filter(m => m.type === 'Heat_Anchor').length === 0 && (
                <div className="text-xs text-slate-400">
                  请先添加热力锚点
                </div>
              )}
            </div>

            {/* 2. 面积配比建议 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-300">面积配比</span>
                <button
                  onClick={calculateAreaSuggestion}
                  disabled={markers.length === 0}
                  className="px-2 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-xs"
                >
                  生成建议
                </button>
              </div>
              {areaSuggestion && (
                <div className={`rounded p-2 text-xs ${
                  areaSuggestion.type === 'warning' ? 'bg-orange-500/20 border border-orange-500/50' :
                  areaSuggestion.type === 'good' ? 'bg-green-500/20 border border-green-500/50' :
                  'bg-blue-500/20 border border-blue-500/50'
                }`}>
                  <div className={
                    areaSuggestion.type === 'warning' ? 'text-orange-300' :
                    areaSuggestion.type === 'good' ? 'text-green-300' :
                    'text-blue-300'
                  }>
                    {areaSuggestion.message}
                  </div>
                  {areaSuggestion.area > 0 && (
                    <div className="text-slate-400 mt-1">
                      建议面积: {areaSuggestion.area} ㎡
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. 入口压力测试 */}
            <div className="mb-4">
              <div className="text-xs text-slate-300 mb-2">入口压力测试</div>

              {/* 主干道方向选择 */}
              <div className="grid grid-cols-4 gap-1 mb-2">
                {['北', '东北', '东', '东南', '南', '西南', '西', '西北'].map(dir => (
                  <button
                    key={dir}
                    onClick={() => addRoadMarker(dir)}
                    disabled={!originPoint}
                    className={`px-2 py-1 text-xs rounded ${
                      roadMarkers.find(r => r.direction === dir)
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>

              {/* 已选道路列表 */}
              {roadMarkers.length > 0 && (
                <div className="bg-slate-600/50 rounded p-2 mb-2">
                  <div className="text-xs text-slate-400 mb-1">已选主干道:</div>
                  {roadMarkers.map((road, idx) => (
                    <div key={idx} className="text-xs flex justify-between">
                      <span>{road.direction}向</span>
                      <span className="text-slate-400">{road.distance}m</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={calculateAccessibility}
                disabled={roadMarkers.length === 0 || isCalculating}
                className="w-full px-2 py-1 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-xs"
              >
                {isCalculating ? '计算中...' : '计算最佳入口'}
              </button>

              {optimalEntry && (
                <div className="bg-green-500/20 border border-green-500/50 rounded p-2 mt-2">
                  <div className="text-xs text-green-300 font-bold">最佳入口位置</div>
                  <div className="text-xs">
                    方向: {optimalEntry.direction}向
                  </div>
                  <div className="text-xs text-slate-400">
                    可达性评分: {optimalEntry.score}
                  </div>
                </div>
              )}
            </div>

            {/* 清除分析结果 */}
            <button
              onClick={clearAnalysis}
              className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded text-xs"
            >
              清除分析结果
            </button>
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
