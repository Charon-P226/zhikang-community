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
  activeDataLayer?: 'disease' | 'heat' | 'air';
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
  activeDataLayer = 'heat',
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

  const CENTER: [number, number] = [117.185, 39.149];

  const riskAreaCoords: { [key: string]: [number, number] } = {
    '1': [117.188, 39.152],
    '2': [117.1853, 39.1488],
    '3': [117.182, 39.146],
  };

  // 社区医院位置 - 天津都行商城附近
  const hospitalCoord: [number, number] = [117.1853, 39.1488];

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
    </div>
  );
}
