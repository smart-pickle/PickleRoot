import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Edit2, Check, ExternalLink, GripVertical } from 'lucide-react';
import { Service } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  onUpdateServices: (services: Service[]) => void;
  serverName: string;
  onUpdateServerName: (name: string) => void;
  weatherCity: string;
  onUpdateWeatherCity: (city: string) => void;
  onResetDefaults: () => void;
}

interface SortableItemProps {
  key?: string | number;
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
}

function SortableServiceItem({ service, onEdit, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none', // Critical for mobile drag & drop
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 bg-white/5 rounded-xl group border border-transparent hover:border-white/10 transition-all mb-2"
    >
      <div className="flex items-center gap-4">
        <button
          {...attributes}
          {...listeners}
          className="p-3 -m-2 hover:bg-white/10 rounded cursor-grab active:cursor-grabbing text-white/20 hover:text-white/60 transition-colors touch-none"
        >
          <GripVertical size={20} />
        </button>
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
          onClick={() => onEdit(service)}
          className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
        >
          <Edit2 size={18} />
        </button>
        <button
          onClick={() => onDelete(service.id)}
          className="p-2 hover:bg-white/10 rounded-lg text-red-400 hover:text-red-300"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  services, 
  onUpdateServices, 
  serverName, 
  onUpdateServerName, 
  weatherCity,
  onUpdateWeatherCity,
  onResetDefaults 
}: SettingsModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<Partial<Service>>({
    name: '',
    url: 'http://',
    icon: 'Package',
    category: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = services.findIndex((s) => s.id === active.id);
      const newIndex = services.findIndex((s) => s.id === over.id);

      onUpdateServices(arrayMove(services, oldIndex, newIndex));
    }
  };

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
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
            <div ref={contentRef} className="flex-1 overflow-y-auto p-6 space-y-8">
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={services.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {services.map((service) => (
                        <SortableServiceItem
                          key={service.id}
                          service={service}
                          onEdit={startEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                  {services.length === 0 && (
                    <p className="text-center text-white/20 py-8 italic font-sans">No services added yet.</p>
                  )}
                </div>

                {/* General Settings */}
                <div className="bg-white/5 rounded-2xl p-6 space-y-4 border border-white/5">
                  <h3 className="text-sm font-mono uppercase tracking-widest text-white/40">General Settings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-white/50 ml-1">Server Name</label>
                      <input 
                        type="text" 
                        placeholder="PickleRoot"
                        value={serverName}
                        onChange={e => onUpdateServerName(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-white/30 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-white/50 ml-1">Weather City</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Paris"
                        value={weatherCity}
                        onChange={e => onUpdateWeatherCity(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-white/30 transition-colors"
                      />
                    </div>
                  </div>
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
