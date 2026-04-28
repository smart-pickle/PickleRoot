import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Edit2, Check, ExternalLink } from 'lucide-react';
import { Service } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  onUpdateServices: (services: Service[]) => void;
  onResetDefaults: () => void;
}

export default function SettingsModal({ isOpen, onClose, services, onUpdateServices, onResetDefaults }: SettingsModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Service>>({
    name: '',
    url: 'http://',
    icon: 'Package',
    category: ''
  });

  const handleSave = () => {
    if (!formData.name || !formData.url) return;

    if (editingId) {
      onUpdateServices(services.map(s => s.id === editingId ? { ...s, ...formData } as Service : s));
      setEditingId(null);
    } else {
      const newService: Service = {
        id: crypto.randomUUID(),
        name: formData.name!,
        url: formData.url!,
        icon: formData.icon || 'Package',
        category: formData.category,
      };
      onUpdateServices([...services, newService]);
    }
    setFormData({ name: '', url: 'http://', icon: 'Package', category: '' });
  };

  const handleDelete = (id: string) => {
    onUpdateServices(services.filter(s => s.id !== id));
  };

  const startEdit = (service: Service) => {
    setEditingId(service.id);
    setFormData(service);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-2xl font-sans font-bold text-white">Infrastructure Control</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Add/Edit Form */}
              <div className="bg-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-mono uppercase tracking-widest text-white/40">{editingId ? 'Edit Service' : 'Add New Service'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 ml-1">Service Name</label>
                    <input 
                      type="text" 
                      placeholder="Plex, Pi-hole, etc."
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 ml-1">URL</label>
                    <input 
                      type="text" 
                      placeholder="http://192.168.1.100:32400"
                      value={formData.url}
                      onChange={e => setFormData({ ...formData, url: e.target.value })}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 ml-1 flex items-center justify-between">
                      <span>Lucide Icon Name</span>
                      <a href="https://lucide.dev/icons" target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline">Browse Icons</a>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Package, Activity, Home..."
                      value={formData.icon}
                      onChange={e => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 ml-1">Category (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="Media, Network, Home Automation"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSave}
                  className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                >
                  {editingId ? <Check size={18} /> : <Plus size={18} />}
                  {editingId ? 'Update Service' : 'Add Service'}
                </button>
                {editingId && (
                  <button 
                    onClick={() => { setEditingId(null); setFormData({ name: '', url: 'http://', icon: 'Package', category: '' }); }}
                    className="w-full bg-white/5 text-white/60 font-semibold py-2 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {/* Service List */}
              <div className="space-y-4">
                <h3 className="text-sm font-mono uppercase tracking-widest text-white/40">Current Services</h3>
                <div className="space-y-2">
                  {services.map(service => (
                    <div key={service.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl group border border-transparent hover:border-white/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/10 rounded-lg">
                          <ExternalLink size={20} className="text-white/60" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{service.name}</p>
                          <p className="text-xs text-white/40 truncate max-w-[200px]">{service.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEdit(service)}
                          className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(service.id)}
                          className="p-2 hover:bg-white/10 rounded-lg text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {services.length === 0 && (
                    <p className="text-center text-white/20 py-8 italic font-sans">No services added yet.</p>
                  )}
                </div>
                
                <div className="pt-8 border-t border-white/5">
                  <button 
                    onClick={onResetDefaults}
                    className="w-full text-xs font-mono uppercase tracking-[0.2em] text-red-500/40 hover:text-red-500 transition-colors py-4"
                  >
                    Reset Dashboard to Defaults
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
