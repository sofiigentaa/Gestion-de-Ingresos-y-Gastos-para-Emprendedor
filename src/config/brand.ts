import germaniaLogo from '../assets/images/germania_logo_1787747352294.jpg';
import demoLogo from '../assets/images/demo-logo.svg';

// Marca del negocio. Por defecto, GER-MANIA. Para una demo o video se puede
// usar una marca ficticia con VITE_BRAND=demo (no se muestra el cliente real).
const isDemo = (import.meta.env.VITE_BRAND || '').toLowerCase() === 'demo';

export const BRAND = isDemo
  ? { name: 'Taller del Sur', tagline: 'Muebles y Decoración', logo: demoLogo }
  : { name: 'GER-MANIA', tagline: 'Trabajos en Madera', logo: germaniaLogo };
