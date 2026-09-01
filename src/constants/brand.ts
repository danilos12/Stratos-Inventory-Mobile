import { Platform } from 'react-native';

export const BRAND = {
  ink: '#0B1933',
  inkSoft: '#53617B',
  paper: '#FFFFFF',
  canvas: '#F6F8FC',
  white: '#FFFFFF',
  red: '#E31346',
  redDark: '#B90E37',
  redSoft: '#FFF0F4',
  green: '#08A974',
  greenSoft: '#E9FAF4',
  amber: '#C87900',
  amberSoft: '#FFF6E6',
  blue: '#2569D8',
  blueSoft: '#EEF4FF',
  violet: '#5B36E8',
  violetSoft: '#F2EFFF',
  muted: '#8A96AC',
  line: '#DDE3ED',
  lineDark: '#2A2D31',
} as const;

export const TYPE = {
  display: Platform.select({
    ios: 'Avenir Next Condensed',
    android: 'sans-serif-condensed',
    default: 'Bahnschrift, Trebuchet MS, sans-serif',
  }),
  body: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    default: 'Trebuchet MS, sans-serif',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'Consolas, monospace',
  }),
} as const;

export const SHADOW = {
  shadowColor: '#0B1933',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.07,
  shadowRadius: 14,
  elevation: 3,
} as const;

export const PROJECT_STAGES = [
  'SITE_PREP',
  'MATERIALS_RELEASED',
  'ON_SITE_INSTALL',
  'TESTING',
  'CLIENT_SIGNOFF',
  'WARRANTY_ACTIVE',
] as const;

export const STAGE_LABELS: Record<string, string> = {
  SITE_PREP: 'Site prep',
  MATERIALS_RELEASED: 'Materials released',
  ON_SITE_INSTALL: 'On-site install',
  TESTING: 'Testing',
  CLIENT_SIGNOFF: 'Client sign-off',
  WARRANTY_ACTIVE: 'Warranty active',
};

export function stageIndex(stage?: string | null) {
  return Math.max(0, PROJECT_STAGES.indexOf((stage || 'SITE_PREP') as (typeof PROJECT_STAGES)[number]));
}
