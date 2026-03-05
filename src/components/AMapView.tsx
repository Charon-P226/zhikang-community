import { useEffect, useRef, useState } from 'react';
import { RiskArea, Incident } from '../types';

declare global {
  interface Window {
    AMap: any;
  }
}

interface AMapViewProps {
  riskAreas: RiskArea[];
  incidents: Incident[];
  activeView: string;
  selectedRiskArea: RiskArea | null;
  onSelectRiskArea: (area: RiskArea | null) => void;
  selectedIncident: Incident | null;
  onSelectIncident: (incident: Incident | null) => void;
  isIncidentDismissed: boolean;
  isDispatched: boolean;
  zoom?: number;
}

export default function AMapView({
  riskAreas,
  incidents,
  activeView,
  selectedRiskArea,
  onSelectRiskArea,
  selectedIncident,
  onSelectIncident,
  isIncidentDismissed,
  isDispatched,
  zoom = 1
}: AMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const drivingInstanceRef = useRef<any>(null);
  const [status, setStatus] = useState<string>('初始化中...');
  const [mapError, setMapError] = useState<string>('');
  const [routeInfo, setRouteInfo] = useState<string>('');

  const CENTER: [number, number] = [117.203, 39.154];

  const riskAreaCoords: { [key: string]: [number, number] } = {
    '1': [117.205, 39.158],
    '2': [117.200, 39.152],
    '3': [117.195, 39.148],
  };

  // 社区医院位置 - 万隆大胡同商业中心附近（固定显示）
  const hospitalCoord: [number, number] = [117.194, 39.152];

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

        map.on('click', () => {
          onSelectRiskArea(null);
          onSelectIncident(null);
        });

        mapInstanceRef.current = map;
        updateMarkers();

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

  const searchRoute = (incidentCoord: [number, number]) => {
    if (!mapInstanceRef.current || !window.AMap.Driving) {
      setRouteInfo('Driving插件未加载');
      return;
    }

    if (drivingInstanceRef.current) {
      drivingInstanceRef.current.clear();
    }

    setRouteInfo('正在规划路径...');

    drivingInstanceRef.current = new window.AMap.Driving({
      map: mapInstanceRef.current,
      policy: window.AMap.DrivingPolicy.LEAST_TIME,
      hideMarkers: true,
      showTraffic: true,
      isOutline: true,
      outlineColor: '#1890ff',
      autoFitView: true,
    });

    addEmergencyMarkers(mapInstanceRef.current);

    drivingInstanceRef.current.search(
      hospitalCoord,
      incidentCoord,
      (status: string, result: any) => {
        if (status === 'complete' && result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          const distance = (route.distance / 1000).toFixed(1);
          const time = Math.round(route.time / 60);
          setRouteInfo('已规划: ' + distance + '公里, 约' + time + '分钟');
        } else {
          setRouteInfo('规划失败');
        }
      }
    );
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
      offset: new window.AMap.Pixel(-20, -20),
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
        offset: new window.AMap.Pixel(-22, -22),
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
      // 显示社区医院
      const hospitalContent = document.createElement('div');
      hospitalContent.innerHTML = '<div style="width:40px;height:40px;background:#10b981;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg></div>';

      const hospitalMarker = new window.AMap.Marker({
        position: hospitalCoord,
        content: hospitalContent,
        offset: new window.AMap.Pixel(-20, -20),
        title: '社区医院',
      });
      hospitalMarker.setMap(map);

      riskAreas.forEach((area) => {
        const coord = riskAreaCoords[area.id];
        if (!coord) return;

        const color = area.riskLevel === '极高' ? '#dc2626' :
                      area.riskLevel === '中等' ? '#f97316' : '#10b981';

        const markerContent = document.createElement('div');
        markerContent.innerHTML = '<div style="width:36px;height:36px;background:' + color + ';border:3px solid white;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 22h20L12 2z"/></svg></div>';

        const marker = new window.AMap.Marker({
          position: coord,
          content: markerContent,
          offset: new window.AMap.Pixel(-18, -18),
        });

        marker.on('click', () => {
          onSelectRiskArea(area);
        });

        marker.setMap(map);

        const circle = new window.AMap.Circle({
          center: coord,
          radius: area.percentage * 3,
          fillOpacity: 0.3,
          strokeOpacity: 0,
          fillColor: color,
        });
        circle.setMap(map);
      });
    }

    // 3. 无障碍出行视图
    if (activeView === 'ACCESSIBILITY') {
      // 显示社区医院
      const hospitalContent = document.createElement('div');
      hospitalContent.innerHTML = '<div style="width:40px;height:40px;background:#10b981;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg></div>';

      const hospitalMarker = new window.AMap.Marker({
        position: hospitalCoord,
        content: hospitalContent,
        offset: new window.AMap.Pixel(-20, -20),
        title: '社区医院',
      });
      hospitalMarker.setMap(map);

      const facilities = [
        { coord: [117.203, 39.155] as [number, number], name: '电梯' },
        { coord: [117.198, 39.153] as [number, number], name: '坡道' },
        { coord: [117.195, 39.149] as [number, number], name: '无障碍WC' },
      ];

      facilities.forEach((facility) => {
        const markerContent = document.createElement('div');
        markerContent.innerHTML = '<div style="width:32px;height:32px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/></svg></div>';

        const marker = new window.AMap.Marker({
          position: facility.coord,
          content: markerContent,
          offset: new window.AMap.Pixel(-16, -16),
          title: facility.name,
        });
        marker.setMap(map);
      });
    }
  };

  // 监听派遣状态变化 - 派遣后显示路径
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (isDispatched && selectedIncident) {
      setTimeout(() => {
        searchRoute(selectedIncident.coordinates);
      }, 500);
    } else {
      clearRoute();
    }
  }, [isDispatched, selectedIncident]);

  // 监听视图切换
  useEffect(() => {
    updateMarkers();
  }, [activeView, riskAreas, selectedIncident, incidents]);

  return (
    <div className="w-full h-full relative">
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
  );
}
