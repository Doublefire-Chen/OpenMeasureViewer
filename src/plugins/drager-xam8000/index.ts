import type { MeasurePlugin } from '../../core/types';
import { canParse, parse } from './parser';
import Viewer from './Viewer';
import deviceImage from './X-AM_8000.png';

const dragerXam8000Plugin: MeasurePlugin = {
  id: 'drager-xam8000',
  name: 'X-AM 8000',
  brand: 'Dräger',
  type: 'Gas Detector',
  imagePath: deviceImage,
  customChartLines: true,
  canParse,
  parse,
  Viewer,
};

export default dragerXam8000Plugin;
