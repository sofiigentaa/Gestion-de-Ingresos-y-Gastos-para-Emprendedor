import { CategoryOption } from '../types';

export const DEFAULT_CATEGORIES: CategoryOption[] = [
  // --- EGRESOS (Solo los solicitados por el usuario) ---
  {
    id: 'compra_insumos',
    name: 'Compra de Insumos',
    type: 'egreso',
    icon: 'Layers',
    color: '#2563eb', // Blue-600
    subcategories: ['Madera', 'Vinilo', 'Cola', 'Clavos', 'Tornillos'],
  },
  {
    id: 'corte_laser',
    name: 'Corte Láser',
    type: 'egreso',
    icon: 'Zap',
    color: '#ea580c', // Orange-600
    subcategories: ['Corte', 'Grabado'],
  },
  {
    id: 'nafta',
    name: 'Nafta',
    type: 'egreso',
    icon: 'Fuel',
    color: '#dc2626', // Red-600
    subcategories: ['Nafta / Combustible', 'Peajes'],
  },
  {
    id: 'canon_feria',
    name: 'Pago de Canon para Feria',
    type: 'egreso',
    icon: 'Store',
    color: '#9333ea', // Purple-600
    subcategories: ['Canon de puesto feria', 'Alquiler de stand / mesa'],
  },

  // --- INGRESOS (Solo Ventas en Ferias y Personalizados por Encargue) ---
  {
    id: 'venta_feria',
    name: 'Ventas en Feria',
    type: 'ingreso',
    icon: 'Store',
    color: '#16a34a', // Green-600
    subcategories: ['Puesto Feria', 'Feria Artesanal', 'Evento'],
  },
  {
    id: 'pedido_personalizado',
    name: 'Personalizados por Encargue',
    type: 'ingreso',
    icon: 'Sparkles',
    color: '#0284c7', // Sky-600
    subcategories: ['Cartelería', 'Souvenirs', 'Trabajos a Medida', 'Regalos'],
  },
];
