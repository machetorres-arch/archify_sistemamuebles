import { useAdminStore } from '../store/adminStore';

export function getFriendlyColorName(colorVal?: string, customTextures?: any[]): string {
  if (!colorVal) return 'Blanco Estándar';
  
  // 1. Buscar primero en texturas del Backoffice / CustomTextures
  const adminTextures = useAdminStore.getState?.()?.textures || [];
  const allCustom = [...(customTextures || []), ...adminTextures];

  const foundInCustom = allCustom.find(
    (t: any) => t && (t.url === colorVal || t.id === colorVal || t.previewUrl === colorVal)
  );
  if (foundInCustom?.name) {
    const brandPrefix = foundInCustom.brand && !foundInCustom.name.toLowerCase().includes(foundInCustom.brand.toLowerCase())
      ? `${foundInCustom.brand} `
      : '';
    return `${brandPrefix}${foundInCustom.name}`;
  }

  // Base64 or long data URIs
  if (colorVal.startsWith('data:')) {
    return 'Textura Personalizada (Cargada)';
  }

  const hexMap: Record<string, string> = {
    '#FFFFFF': 'Blanco Frost',
    '#171717': 'Negro Profundo',
    '#F8F9FA': 'Bianco Polo',
    '#202020': 'Nero',
    '#D4A373': 'Roble Natural',
    '#A3B18A': 'Verde Salvia',
    '#588157': 'Verde Bosque',
    '#3A5A40': 'Verde Olivo',
    '#E0E1DD': 'Gris Humo',
    '#778DA9': 'Azul Nórdico',
    '#415A77': 'Azul Petróleo',
    '#1B263B': 'Azul Noche',
    '#2B2D42': 'Grafito Mate',
    '#8D99AE': 'Gris Plata',
    '#EDF2F4': 'Blanco Nieve',
    '#DDA15E': 'Madera Teca',
    '#BC6C25': 'Nogal Ceniza',
  };

  const upper = colorVal.toUpperCase();
  if (hexMap[upper]) return hexMap[upper];
  if (colorVal.startsWith('#')) return `Color ${colorVal}`;

  const parts = colorVal.split('/');
  const last = parts[parts.length - 1].replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  return last || 'Acabado Estándar';
}
