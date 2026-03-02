import type { MeasurePlugin } from '../../core/types';
import { canParse, parse } from './parser';
import Viewer from './Viewer';

const dragerXam8000Plugin: MeasurePlugin = {
  id: 'drager-xam8000',
  name: 'X-AM 8000',
  brand: 'Dräger',
  type: 'Gas Detector',
  imagePath: '/images/X-AM_8000.png',
  customChartLines: true,
  canParse,
  parse,
  Viewer,
};

export default dragerXam8000Plugin;
