import { motion } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { Service } from '../types';

interface ServiceCardProps {
  service: Service;
  status: 'online' | 'offline' | 'checking';
}

export default function ServiceCard({ service, status }: ServiceCardProps) {
  // Dynamically get the icon component
  const IconComponent = (LucideIcons as any)[service.icon] || LucideIcons.ExternalLink;

  const statusConfig = {
    online: { color: 'bg-emerald-500', label: 'Active', text: 'text-emerald-400', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
    offline: { color: 'bg-red-500', label: 'Offline', text: 'text-red-400', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]' },
    checking: { color: 'bg-slate-500', label: 'Checking', text: 'text-slate-400', glow: '' }
  };

  const config = statusConfig[status];

  return (
    <motion.a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      id={`service-${service.id}`}
      whileHover={{ y: -5, scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-6 flex flex-col group cursor-pointer transition-all min-h-[220px]"
    >
      <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        <IconComponent className="w-6 h-6 text-indigo-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">{service.name}</h3>
      <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-4">
        {service.category ? `${service.category} service` : 'Local network resource'} accessible at your node.
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${config.color} ${config.glow}`}></span>
          <span className={`text-[10px] ${config.text} font-mono tracking-widest uppercase`}>{config.label}</span>
        </div>
        <span className="text-slate-500 font-mono text-[10px]">
          {service.url.split(':').pop()?.replace('/', '') || '80'}
        </span>
      </div>
    </motion.a>
  );
}
