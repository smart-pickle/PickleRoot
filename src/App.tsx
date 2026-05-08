import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Clock, Calendar as CalendarIcon, Server, ShieldCheck, Cpu, CloudRain, Sun, Cloud, Thermometer, CloudSnow, CloudLightning } from 'lucide-react';
import { Service } from './types';
import ServiceCard from './components/ServiceCard';
import SettingsModal from './components/SettingsModal';

const DEFAULT_SERVICES: Service[] = [
  { id: '1', name: 'Omnitools', url: 'http://192.168.1.159:8080', icon: 'Wrench', category: 'Tools', description: 'Collection of useful utilities for server management and development.' },
  { id: '2', name: 'Yoshi Treasure Vault', url: 'http://192.168.1.159:3000', icon: 'Vault', category: 'Storage', description: 'Secure personal storage for all your digital treasures.' },
  { id: '3', name: 'Plex', url: 'http://192.168.1.159:32400', icon: 'PlayCircle', category: 'Media', description: 'Your personal media server for streaming movies and TV shows.' },
  { id: '4', name: 'Proxmox', url: 'https://192.168.1.159:8006', icon: 'Server', category: 'Infrastructure', description: 'Virtualization platform for managing containers and virtual machines.' },
];

export default function App() {
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [serverName, setServerName] = useState('PickleRoot');
  const [weatherCity, setWeatherCity] = useState('Paris');
  const [theme, setTheme] = useState('indigo');
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [serverIp, setServerIp] = useState('127.0.0.1');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const [stats, setStats] = useState<{
    uptime: number;
    storage: { used: number; size: number; use: number };
    cpu: { load: string };
    mem: { used: string; total: string; percent: string };
  } | null>(null);
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, 'online' | 'offline' | 'checking'>>({});

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Fetch server info first to get the local IP
        let currentIp = '127.0.0.1';
        try {
          const infoRes = await fetch('/api/info');
          const infoData = await infoRes.json();
          if (infoData.localIp) {
            currentIp = infoData.localIp;
            setServerIp(infoData.localIp);
          }
        } catch (e) {
          console.error('Failed to fetch server info:', e);
        }

        const res = await fetch('/api/config');
        const data = await res.json();
        
        if (data) {
          // Handle migration: if data is an array, it's the old format (just services)
          if (Array.isArray(data)) {
            setServices(data);
            setServerName('PickleRoot');
            setWeatherCity('Paris');
          } else {
            // New format (AppConfig)
            setServices(data.services || DEFAULT_SERVICES);
            setServerName(data.serverName || 'PickleRoot');
            setWeatherCity(data.weatherCity || 'Paris');
            setTheme(data.theme || 'indigo');
          }
        } else {
          // If no config, use defaults but replace the hardcoded IP with the actual server IP
          const dynamicDefaults = DEFAULT_SERVICES.map(s => ({
            ...s,
            url: s.url.replace('192.168.1.159', currentIp)
          }));
          setServices(dynamicDefaults);
          setServerName('PickleRoot');
          setWeatherCity('Paris');
        }
        setIsConfigLoaded(true);
      } catch (err) {
        console.error('Failed to load config:', err);
        setIsConfigLoaded(true);
      }
    };
    loadConfig();
  }, []);

  const saveConfig = async () => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services, serverName, weatherCity, theme })
      });
    } catch (err) {
      console.error('Failed to save config to server:', err);
    }
  };

  useEffect(() => {
    if (isConfigLoaded) {
      saveConfig();
    }
  }, [services, serverName, weatherCity, theme, isConfigLoaded]);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Periodic health checks
  useEffect(() => {
    const checkAllServices = async () => {
      const results: Record<string, 'online' | 'offline'> = {};
      
      await Promise.all(services.map(async (service) => {
        try {
          const res = await fetch(`/api/health?url=${encodeURIComponent(service.url)}`);
          const data = await res.json();
          results[service.id] = data.online ? 'online' : 'offline';
        } catch (err) {
          results[service.id] = 'offline';
        }
      }));

      setServiceStatuses(results);
    };

    checkAllServices();
    const interval = setInterval(checkAllServices, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [services]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setStats(data);
          } else {
            const text = await res.text();
            console.error('Expected JSON but got:', text.substring(0, 100));
          }
        } else {
          console.error('Stats API returned status:', res.status);
        }
      } catch (err) {
        console.error('Failed to fetch system stats:', err);
      }
    };
    fetchStats();
    const statsTimer = setInterval(fetchStats, 5000); // Update every 5s
    return () => clearInterval(statsTimer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // First get coordinates for the city
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherCity)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        
        let lat = 48.8566; // Fallback to Paris
        let lon = 2.3522;

        if (geoData.results && geoData.results.length > 0) {
          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
        }

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await res.json();
        setWeather({
          temp: Math.round(data.current_weather.temperature),
          code: data.current_weather.weathercode,
        });
      } catch (err) {
        console.error('Failed to fetch weather:', err);
      }
    };
    if (isConfigLoaded) {
      fetchWeather();
    }
    const weatherTimer = setInterval(fetchWeather, 600000); // Update every 10 mins
    return () => clearInterval(weatherTimer);
  }, [weatherCity, isConfigLoaded]);

  const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateString = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const getWeatherIcon = (code: number) => {
    // WMO Weather interpretation codes (WW)
    // https://open-meteo.com/en/docs
    if (code === 0) return <Sun className="w-4 h-4 text-orange-400" />; // Clear sky
    if (code >= 1 && code <= 3) return <Cloud className="w-4 h-4 text-slate-400" />; // Mainly clear, partly cloudy, overcast
    if (code >= 45 && code <= 48) return <Cloud className="w-4 h-4 text-slate-500 opacity-60" />; // Fog
    if (code >= 51 && code <= 67) return <CloudRain className="w-4 h-4 text-blue-400" />; // Drizzle / Rain
    if (code >= 71 && code <= 77) return <CloudSnow className="w-4 h-4 text-white hover:text-blue-100" />; // Snow
    if (code >= 80 && code <= 82) return <CloudRain className="w-4 h-4 text-blue-500" />; // Rain showers
    if (code >= 95) return <CloudLightning className="w-4 h-4 text-purple-400 animate-pulse" />; // Thunderstorm
    return <Sun className="w-4 h-4 text-orange-400" />;
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}D ${h}H ${m}M`;
  };

  return (
    <div className="min-h-screen relative bg-[#020617] selection:bg-accent/30" data-theme={theme}>
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px]" />
        <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-accent/15 rounded-full blur-[100px]" />
      </div>

      {/* Main Layout */}
      <main className="relative z-10 container mx-auto px-10 py-10 max-w-7xl h-full flex flex-col min-h-screen">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold tracking-tight text-white flex items-center">
              {serverName} <span className="text-accent-hover font-mono text-2xl ml-3 opacity-80 tracking-tighter">node_01</span>
            </h1>
            <p className="text-slate-400 mt-2 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              System Online &bull; {serverIp}
            </p>
          </motion.div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* System Stats Bar */}
            <div className="flex gap-2 sm:gap-4 order-2 sm:order-1 w-full sm:w-auto justify-center sm:justify-start">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex flex-col items-center min-w-[60px] sm:min-w-[70px]">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500 font-bold">CPU</span>
                <span className="text-xs sm:text-sm font-mono text-accent">{stats?.cpu.load || '--'}%</span>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex flex-col items-center min-w-[60px] sm:min-w-[70px]">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500 font-bold">RAM</span>
                <span className="text-xs sm:text-sm font-mono text-emerald-300">{stats?.mem.percent || '--'}%</span>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex flex-col items-center min-w-[60px] sm:min-w-[70px]">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500 font-bold">DISK</span>
                <span className="text-xs sm:text-sm font-mono text-orange-300">{stats ? Math.round(stats.storage.use) : '--'}%</span>
              </div>
            </div>

            {/* Weather, Time & Date Display */}
            <div className="flex items-center gap-6 text-right order-1 sm:order-2">
              {weather && (
                <div className="flex flex-col items-end gap-1 px-4 border-r border-white/10">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 font-mono">
                    <Thermometer size={10} />
                    <span>{weatherCity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getWeatherIcon(weather.code)}
                    <span className="text-xl font-sans font-medium text-white">{weather.temp}°C</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-2xl font-sans font-light text-white leading-none">{timeString}</span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mt-1">{dateString}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ServiceCard 
                    service={service} 
                    status={serviceStatuses[service.id] || 'checking'} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Quick Add Placeholder */}
            {services.length < 8 && (
              <motion.button
                id="add-service-ghost"
                onClick={() => setIsSettingsOpen(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/5 backdrop-blur-xl border-2 border-dashed border-white/10 p-6 rounded-[2rem] flex flex-col items-center justify-center group cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all min-h-[220px]"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Settings className="w-6 h-6 text-slate-400 group-hover:text-accent-hover" />
                </div>
                <span className="mt-4 text-sm font-medium text-slate-400 group-hover:text-accent-hover">Add Service</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Floating Settings Trigger */}
        <motion.button
          id="settings-trigger"
          onClick={() => setIsSettingsOpen(true)}
          whileHover={{ rotate: 90, scale: 1.1 }}
          className="fixed bottom-10 right-10 w-14 h-14 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 rounded-2xl transition-all shadow-2xl z-40"
        >
          <Settings size={24} className="text-white" />
        </motion.button>

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          services={services}
          onUpdateServices={setServices}
          serverName={serverName}
          onUpdateServerName={setServerName}
          weatherCity={weatherCity}
          onUpdateWeatherCity={setWeatherCity}
          theme={theme}
          onUpdateTheme={setTheme}
          onResetDefaults={() => {
            const dynamicDefaults = DEFAULT_SERVICES.map(s => ({
              ...s,
              url: s.url.replace('192.168.1.159', serverIp)
            }));
            setServices(dynamicDefaults);
            setServerName('PickleRoot');
            setWeatherCity('Paris');
            setTheme('indigo');
          }}
        />

        {/* Footer Info */}
        <footer className="mt-24 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-[11px] font-mono tracking-widest uppercase text-center md:text-left">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            <span className="flex items-center gap-2">
              <Clock size={10} className="text-slate-600" />
              UPTIME: {stats ? formatUptime(stats.uptime) : 'LOADING...'}
            </span>
            <span className="flex items-center gap-2">
              <Server size={10} className="text-slate-600" />
              STORAGE: {stats ? `${(stats.storage.used / 1e12).toFixed(1)}TB / ${(stats.storage.size / 1e12).toFixed(1)}TB USED` : 'LOADING...'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            {serverName.toUpperCase()} ENGINE ACTIVE
          </div>
        </footer>
      </main>
    </div>
  );
}
