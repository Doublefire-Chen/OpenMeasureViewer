import type { MeasurePlugin } from '../../core/types';
import { canParse, parse } from './parser';
import Viewer from './Viewer';
import deviceImage from './YET-610L.png';

const yet610lPlugin: MeasurePlugin = {
  id: 'yet-610l',
  name: 'YET-610L',
  brand: 'Dikewei',
  type: 'Thermometer',
  imagePath: deviceImage,
  canParse,
  parse,
  Viewer,
};

export default yet610lPlugin;
