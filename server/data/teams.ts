import type { Conference, Team } from '../../shared/types.js';

export interface UschoReferenceEntry {
  rank: number;
  npi: number;
  w: number;
  l: number;
  t: number;
  wgtWp: number;
  sos: number;
  qwb: number;
  flag?: '*' | '#';
}

export const D1_MENS_TEAMS: Team[] = [
  // Big Ten (7)
  { id: 'michigan', name: 'Michigan', shortName: 'Michigan', abbr: 'MIC', conference: 'Big Ten', primaryColor: '#00274C' },
  { id: 'michigan-state', name: 'Michigan State', shortName: 'Michigan St.', abbr: 'MSU', conference: 'Big Ten', primaryColor: '#18453B' },
  { id: 'minnesota', name: 'Minnesota', shortName: 'Minnesota', abbr: 'MIN', conference: 'Big Ten', primaryColor: '#7A0019' },
  { id: 'notre-dame', name: 'Notre Dame', shortName: 'Notre Dame', abbr: 'NDM', conference: 'Big Ten', primaryColor: '#0C2340' },
  { id: 'ohio-state', name: 'Ohio State', shortName: 'Ohio State', abbr: 'OSU', conference: 'Big Ten', primaryColor: '#BB0000' },
  { id: 'penn-state', name: 'Penn State', shortName: 'Penn State', abbr: 'PSU', conference: 'Big Ten', primaryColor: '#041E42' },
  { id: 'wisconsin', name: 'Wisconsin', shortName: 'Wisconsin', abbr: 'WIS', conference: 'Big Ten', primaryColor: '#C5050C' },

  // NCHC (10)
  { id: 'arizona-state', name: 'Arizona State', shortName: 'Arizona St.', abbr: 'ASU', conference: 'NCHC', primaryColor: '#8C1D40' },
  { id: 'colorado-college', name: 'Colorado College', shortName: 'Colorado Col.', abbr: 'CC', conference: 'NCHC', primaryColor: '#1E1E1E' },
  { id: 'denver', name: 'Denver', shortName: 'Denver', abbr: 'DEN', conference: 'NCHC', primaryColor: '#8B2332' },
  { id: 'miami', name: 'Miami', shortName: 'Miami', abbr: 'MIA', conference: 'NCHC', primaryColor: '#B61E2E' },
  { id: 'minnesota-duluth', name: 'Minnesota Duluth', shortName: 'Minn. Duluth', abbr: 'MND', conference: 'NCHC', primaryColor: '#7A0019' },
  { id: 'north-dakota', name: 'North Dakota', shortName: 'North Dakota', abbr: 'NDK', conference: 'NCHC', primaryColor: '#009A44' },
  { id: 'omaha', name: 'Omaha', shortName: 'Omaha', abbr: 'UNO', conference: 'NCHC', primaryColor: '#D71920' },
  { id: 'st-cloud-state', name: 'St. Cloud State', shortName: 'St. Cloud St.', abbr: 'STC', conference: 'NCHC', primaryColor: '#CD1041' },
  { id: 'st-thomas', name: 'St. Thomas', shortName: 'St. Thomas', abbr: 'STT', conference: 'NCHC', primaryColor: '#510C76' },
  { id: 'western-michigan', name: 'Western Michigan', shortName: 'Western Mich.', abbr: 'WMU', conference: 'NCHC', primaryColor: '#6C4023' },

  // Hockey East (11)
  { id: 'boston-college', name: 'Boston College', shortName: 'Boston Col.', abbr: 'BC', conference: 'Hockey East', primaryColor: '#98002E' },
  { id: 'boston-university', name: 'Boston University', shortName: 'Boston Univ.', abbr: 'BU', conference: 'Hockey East', primaryColor: '#CC0000' },
  { id: 'uconn', name: 'Connecticut', shortName: 'UConn', abbr: 'CON', conference: 'Hockey East', primaryColor: '#000E2F' },
  { id: 'maine', name: 'Maine', shortName: 'Maine', abbr: 'MNE', conference: 'Hockey East', primaryColor: '#003263' },
  { id: 'massachusetts', name: 'Massachusetts', shortName: 'UMass', abbr: 'UMA', conference: 'Hockey East', primaryColor: '#881C1C' },
  { id: 'umass-lowell', name: 'UMass Lowell', shortName: 'UMass Lowell', abbr: 'UML', conference: 'Hockey East', primaryColor: '#0067B1' },
  { id: 'merrimack', name: 'Merrimack', shortName: 'Merrimack', abbr: 'MER', conference: 'Hockey East', primaryColor: '#003768' },
  { id: 'new-hampshire', name: 'New Hampshire', shortName: 'New Hampshire', abbr: 'UNH', conference: 'Hockey East', primaryColor: '#041E42' },
  { id: 'northeastern', name: 'Northeastern', shortName: 'Northeastern', abbr: 'NOE', conference: 'Hockey East', primaryColor: '#C8102E' },
  { id: 'providence', name: 'Providence', shortName: 'Providence', abbr: 'PRV', conference: 'Hockey East', primaryColor: '#111111' },
  { id: 'vermont', name: 'Vermont', shortName: 'Vermont', abbr: 'VER', conference: 'Hockey East', primaryColor: '#154734' },

  // ECAC (12)
  { id: 'brown', name: 'Brown', shortName: 'Brown', abbr: 'BRN', conference: 'ECAC', primaryColor: '#4E3629' },
  { id: 'clarkson', name: 'Clarkson', shortName: 'Clarkson', abbr: 'CLK', conference: 'ECAC', primaryColor: '#004E42' },
  { id: 'colgate', name: 'Colgate', shortName: 'Colgate', abbr: 'CLG', conference: 'ECAC', primaryColor: '#821019' },
  { id: 'cornell', name: 'Cornell', shortName: 'Cornell', abbr: 'COR', conference: 'ECAC', primaryColor: '#B31B1B' },
  { id: 'dartmouth', name: 'Dartmouth', shortName: 'Dartmouth', abbr: 'DAR', conference: 'ECAC', primaryColor: '#00693E' },
  { id: 'harvard', name: 'Harvard', shortName: 'Harvard', abbr: 'HAR', conference: 'ECAC', primaryColor: '#A51C30' },
  { id: 'princeton', name: 'Princeton', shortName: 'Princeton', abbr: 'PRN', conference: 'ECAC', primaryColor: '#E77500' },
  { id: 'quinnipiac', name: 'Quinnipiac', shortName: 'Quinnipiac', abbr: 'QUI', conference: 'ECAC', primaryColor: '#0C2340' },
  { id: 'rpi', name: 'RPI', shortName: 'RPI', abbr: 'REN', conference: 'ECAC', primaryColor: '#D6001C' },
  { id: 'st-lawrence', name: 'St. Lawrence', shortName: 'St. Lawrence', abbr: 'STL', conference: 'ECAC', primaryColor: '#AF1E2D' },
  { id: 'union', name: 'Union', shortName: 'Union', abbr: 'UNI', conference: 'ECAC', primaryColor: '#822433' },
  { id: 'yale', name: 'Yale', shortName: 'Yale', abbr: 'YAL', conference: 'ECAC', primaryColor: '#00356B' },

  // CCHA (8)
  { id: 'augustana', name: 'Augustana', shortName: 'Augustana', abbr: 'AGU', conference: 'CCHA', primaryColor: '#003087' },
  { id: 'bemidji-state', name: 'Bemidji State', shortName: 'Bemidji St.', abbr: 'BMJ', conference: 'CCHA', primaryColor: '#004B35' },
  { id: 'bowling-green', name: 'Bowling Green', shortName: 'Bowling Green', abbr: 'BGS', conference: 'CCHA', primaryColor: '#FD5000' },
  { id: 'ferris-state', name: 'Ferris State', shortName: 'Ferris St.', abbr: 'FSU', conference: 'CCHA', primaryColor: '#BA0C2F' },
  { id: 'lake-superior', name: 'Lake Superior', shortName: 'Lake Superior', abbr: 'LSS', conference: 'CCHA', primaryColor: '#003F87' },
  { id: 'michigan-tech', name: 'Michigan Tech', shortName: 'Michigan Tech', abbr: 'MTU', conference: 'CCHA', primaryColor: '#111111' },
  { id: 'minnesota-state', name: 'Minnesota State', shortName: 'Minnesota St.', abbr: 'MNS', conference: 'CCHA', primaryColor: '#49306E' },
  { id: 'northern-michigan', name: 'Northern Michigan', shortName: 'Northern Mich.', abbr: 'NMU', conference: 'CCHA', primaryColor: '#004F39' },

  // AHA (9)
  { id: 'air-force', name: 'Air Force', shortName: 'Air Force', abbr: 'AFA', conference: 'AHA', primaryColor: '#003087' },
  { id: 'army', name: 'Army', shortName: 'Army', abbr: 'ARM', conference: 'AHA', primaryColor: '#222222' },
  { id: 'bentley', name: 'Bentley', shortName: 'Bentley', abbr: 'BEN', conference: 'AHA', primaryColor: '#0072CE' },
  { id: 'canisius', name: 'Canisius', shortName: 'Canisius', abbr: 'CNS', conference: 'AHA', primaryColor: '#002F6C' },
  { id: 'holy-cross', name: 'Holy Cross', shortName: 'Holy Cross', abbr: 'HLC', conference: 'AHA', primaryColor: '#602D89' },
  { id: 'niagara', name: 'Niagara', shortName: 'Niagara', abbr: 'NIA', conference: 'AHA', primaryColor: '#582C83' },
  { id: 'rit', name: 'RIT', shortName: 'RIT', abbr: 'RIT', conference: 'AHA', primaryColor: '#F76902' },
  { id: 'robert-morris', name: 'Robert Morris', shortName: 'Robert Morris', abbr: 'RMU', conference: 'AHA', primaryColor: '#14234B' },
  { id: 'sacred-heart', name: 'Sacred Heart', shortName: 'Sacred Heart', abbr: 'SAC', conference: 'AHA', primaryColor: '#CE1141' },

  // Independents (5)
  { id: 'alaska', name: 'Alaska', shortName: 'Alaska', abbr: 'AKF', conference: 'Independent', primaryColor: '#236192' },
  { id: 'alaska-anchorage', name: 'Alaska Anchorage', shortName: 'Alaska Anch.', abbr: 'AKA', conference: 'Independent', primaryColor: '#00583D' },
  { id: 'lindenwood', name: 'Lindenwood', shortName: 'Lindenwood', abbr: 'LIN', conference: 'Independent', primaryColor: '#222222' },
  { id: 'liu', name: 'LIU', shortName: 'LIU', abbr: 'LIU', conference: 'Independent', primaryColor: '#009CDE' },
  { id: 'stonehill', name: 'Stonehill', shortName: 'Stonehill', abbr: 'STN', conference: 'Independent', primaryColor: '#2F2963' },
];

export const TEAM_BY_ID: Record<string, Team> = Object.fromEntries(
  D1_MENS_TEAMS.map((t) => [t.id, t]),
);

const ALIAS_MAP: Record<string, string> = {
  'uconn': 'uconn',
  'connecticut': 'uconn',
  'umass': 'massachusetts',
  'massachusetts': 'massachusetts',
  'umass lowell': 'umass-lowell',
  'massachusetts-lowell': 'umass-lowell',
  'long island': 'liu',
  'long island university': 'liu',
  'liu': 'liu',
  'alaska-anchorage': 'alaska-anchorage',
  'alaska anchorage': 'alaska-anchorage',
  'alaska-fairbanks': 'alaska',
  'alaska': 'alaska',
  'lake superior': 'lake-superior',
  'lake superior state': 'lake-superior',
  'rensselaer': 'rpi',
  'rpi': 'rpi',
  'army west point': 'army',
  'army': 'army',
  'nebraska-omaha': 'omaha',
  'omaha': 'omaha',
  'miami (ohio)': 'miami',
  'miami': 'miami',
  'minnesota-duluth': 'minnesota-duluth',
  'minnesota duluth': 'minnesota-duluth',
  'st. cloud state': 'st-cloud-state',
  'st. lawrence': 'st-lawrence',
  'st. thomas': 'st-thomas',
  'boston university': 'boston-university',
  'boston college': 'boston-college',
};

export function resolveTeamId(rawName: string): string | null {
  const cleaned = rawName.trim().toLowerCase().replace(/\s+/g, ' ');
  if (ALIAS_MAP[cleaned]) return ALIAS_MAP[cleaned];
  const byName = D1_MENS_TEAMS.find((t) => t.name.toLowerCase() === cleaned);
  if (byName) return byName.id;
  const byId = D1_MENS_TEAMS.find((t) => t.id === cleaned.replace(/\s+/g, '-'));
  if (byId) return byId.id;
  return null;
}

export const CONFERENCES: Conference[] = [
  'Big Ten',
  'NCHC',
  'Hockey East',
  'ECAC',
  'CCHA',
  'AHA',
  'Independent',
];

// Official USCHO D-I Men's NPI snapshot (updated November 20, 2026, 06:05:19 AM)
// Used for mathematical verification and reference display.
export const USCHO_NPI_REFERENCE_2026_11_20: Record<string, UschoReferenceEntry> = {
  'dartmouth': { rank: 1, npi: 63.451, w: 6, l: 0, t: 0, wgtWp: 100.000, sos: 50.266, qwb: 0.752 },
  'michigan': { rank: 2, npi: 61.588, w: 10, l: 1, t: 0, wgtWp: 89.020, sos: 51.063, qwb: 1.035 },
  'wisconsin': { rank: 3, npi: 59.394, w: 8, l: 1, t: 1, wgtWp: 83.673, sos: 51.006, qwb: 0.221 },
  'augustana': { rank: 4, npi: 58.280, w: 9, l: 0, t: 3, wgtWp: 73.684, sos: 52.180, qwb: 0.724 },
  'quinnipiac': { rank: 5, npi: 58.019, w: 8, l: 3, t: 1, wgtWp: 71.186, sos: 52.642, qwb: 0.741 },
  'providence': { rank: 6, npi: 57.661, w: 9, l: 2, t: 0, wgtWp: 78.909, sos: 50.218, qwb: 0.270 },
  'western-michigan': { rank: 7, npi: 57.242, w: 8, l: 2, t: 1, wgtWp: 75.200, sos: 50.689, qwb: 0.425 },
  'minnesota-duluth': { rank: 8, npi: 56.970, w: 9, l: 3, t: 2, wgtWp: 74.493, sos: 50.399, qwb: 0.548 },
  'army': { rank: 9, npi: 56.843, w: 8, l: 2, t: 0, wgtWp: 76.327, sos: 50.024, qwb: 0.244 },
  'michigan-state': { rank: 10, npi: 56.660, w: 6, l: 3, t: 1, wgtWp: 70.204, sos: 51.547, qwb: 0.449 },
  'northeastern': { rank: 11, npi: 56.261, w: 7, l: 2, t: 0, wgtWp: 80.000, sos: 48.349, qwb: 0.000 },
  'denver': { rank: 12, npi: 55.921, w: 9, l: 2, t: 1, wgtWp: 72.333, sos: 50.409, qwb: 0.031 },
  'colorado-college': { rank: 13, npi: 55.529, w: 7, l: 4, t: 1, wgtWp: 68.070, sos: 50.894, qwb: 0.341 },
  'ohio-state': { rank: 14, npi: 55.301, w: 4, l: 6, t: 0, wgtWp: 50.400, sos: 55.317, qwb: 1.213 },
  'north-dakota': { rank: 15, npi: 55.217, w: 7, l: 3, t: 1, wgtWp: 69.231, sos: 50.066, qwb: 0.360 },
  'union': { rank: 16, npi: 55.180, w: 6, l: 5, t: 0, wgtWp: 66.667, sos: 50.668, qwb: 0.512 },
  'boston-university': { rank: 17, npi: 54.321, w: 7, l: 4, t: 1, wgtWp: 57.288, sos: 52.467, qwb: 0.649 },
  'maine': { rank: 18, npi: 54.106, w: 6, l: 5, t: 1, wgtWp: 60.000, sos: 51.494, qwb: 0.486 },
  'harvard': { rank: 19, npi: 53.558, w: 4, l: 3, t: 0, wgtWp: 59.375, sos: 51.204, qwb: 0.311 },
  'vermont': { rank: 20, npi: 53.365, w: 5, l: 4, t: 2, wgtWp: 55.849, sos: 52.091, qwb: 0.334 },
  'michigan-tech': { rank: 21, npi: 52.878, w: 7, l: 3, t: 2, wgtWp: 60.727, sos: 49.861, qwb: 0.301 },
  'new-hampshire': { rank: 22, npi: 52.605, w: 7, l: 5, t: 1, wgtWp: 56.765, sos: 50.895, qwb: 0.242 },
  'merrimack': { rank: 23, npi: 52.550, w: 6, l: 3, t: 2, wgtWp: 53.846, sos: 52.077, qwb: 0.031 },
  'miami': { rank: 24, npi: 52.523, w: 8, l: 4, t: 0, wgtWp: 62.034, sos: 48.928, qwb: 0.319 },
  'bowling-green': { rank: 25, npi: 51.695, w: 6, l: 6, t: 0, wgtWp: 55.082, sos: 50.566, qwb: 0.000 },
  'minnesota': { rank: 26, npi: 51.499, w: 5, l: 4, t: 3, wgtWp: 47.407, sos: 52.018, qwb: 0.634 },
  'omaha': { rank: 27, npi: 51.461, w: 4, l: 5, t: 1, wgtWp: 48.936, sos: 52.008, qwb: 0.221 },
  'clarkson': { rank: 28, npi: 50.973, w: 5, l: 4, t: 1, wgtWp: 51.489, sos: 50.477, qwb: 0.243 },
  'yale': { rank: 29, npi: 50.631, w: 3, l: 2, t: 0, wgtWp: 49.565, sos: 50.734, qwb: 0.189 },
  'niagara': { rank: 30, npi: 50.599, w: 6, l: 5, t: 1, wgtWp: 49.153, sos: 50.885, qwb: 0.147 },
  'notre-dame': { rank: 31, npi: 50.301, w: 5, l: 6, t: 1, wgtWp: 40.690, sos: 53.177, qwb: 0.246 },
  'minnesota-state': { rank: 32, npi: 50.281, w: 4, l: 5, t: 3, wgtWp: 50.645, sos: 50.120, qwb: 0.030 },
  'arizona-state': { rank: 33, npi: 50.164, w: 5, l: 5, t: 0, wgtWp: 52.222, sos: 49.381, qwb: 0.073 },
  'sacred-heart': { rank: 34, npi: 49.725, w: 6, l: 6, t: 0, wgtWp: 48.148, sos: 50.038, qwb: 0.159 },
  'boston-college': { rank: 35, npi: 49.669, w: 4, l: 5, t: 2, wgtWp: 41.429, sos: 51.921, qwb: 0.371 },
  'bentley': { rank: 36, npi: 49.555, w: 6, l: 6, t: 0, wgtWp: 48.214, sos: 49.889, qwb: 0.084 },
  'northern-michigan': { rank: 37, npi: 49.231, w: 5, l: 7, t: 0, wgtWp: 40.755, sos: 51.910, qwb: 0.110 },
  'massachusetts': { rank: 38, npi: 49.051, w: 5, l: 8, t: 1, wgtWp: 36.923, sos: 52.582, qwb: 0.384 },
  'brown': { rank: 39, npi: 48.688, w: 2, l: 3, t: 0, wgtWp: 40.000, sos: 51.585, qwb: 0.000 },
  'holy-cross': { rank: 40, npi: 48.535, w: 5, l: 9, t: 0, wgtWp: 36.286, sos: 52.530, qwb: 0.067 },
  'uconn': { rank: 41, npi: 48.479, w: 4, l: 8, t: 1, wgtWp: 29.118, sos: 54.213, qwb: 0.540 },
  'st-cloud-state': { rank: 42, npi: 48.380, w: 3, l: 7, t: 1, wgtWp: 38.182, sos: 51.636, qwb: 0.108 },
  'lake-superior': { rank: 43, npi: 48.227, w: 3, l: 5, t: 2, wgtWp: 46.154, sos: 48.773, qwb: 0.108 },
  'princeton': { rank: 44, npi: 48.044, w: 2, l: 4, t: 0, wgtWp: 43.871, sos: 49.347, qwb: 0.066 },
  'rpi': { rank: 45, npi: 47.930, w: 4, l: 7, t: 1, wgtWp: 41.786, sos: 49.728, qwb: 0.188 },
  'umass-lowell': { rank: 46, npi: 47.370, w: 4, l: 8, t: 0, wgtWp: 36.774, sos: 50.680, qwb: 0.166 },
  'rit': { rank: 47, npi: 47.265, w: 3, l: 8, t: 1, wgtWp: 36.842, sos: 50.740, qwb: 0.000 },
  'air-force': { rank: 48, npi: 47.165, w: 5, l: 7, t: 0, wgtWp: 37.049, sos: 50.281, qwb: 0.192 },
  'robert-morris': { rank: 49, npi: 46.750, w: 4, l: 7, t: 0, wgtWp: 40.741, sos: 48.753, qwb: 0.000 },
  'alaska': { rank: 50, npi: 46.723, w: 2, l: 8, t: 0, wgtWp: 28.936, sos: 52.773, qwb: 0.068, flag: '#' },
  'st-thomas': { rank: 51, npi: 46.553, w: 4, l: 6, t: 0, wgtWp: 36.000, sos: 49.949, qwb: 0.091 },
  'lindenwood': { rank: 52, npi: 46.530, w: 3, l: 8, t: 1, wgtWp: 32.069, sos: 51.186, qwb: 0.123 },
  'ferris-state': { rank: 53, npi: 45.607, w: 1, l: 7, t: 2, wgtWp: 26.383, sos: 51.661, qwb: 0.266 },
  'cornell': { rank: 54, npi: 45.575, w: 2, l: 4, t: 0, wgtWp: 28.571, sos: 51.243, qwb: 0.000 },
  'canisius': { rank: 55, npi: 45.361, w: 4, l: 6, t: 1, wgtWp: 42.400, sos: 46.348, qwb: 0.000 },
  'colgate': { rank: 56, npi: 44.706, w: 3, l: 9, t: 0, wgtWp: 28.136, sos: 50.103, qwb: 0.095 },
  'penn-state': { rank: 57, npi: 44.297, w: 2, l: 9, t: 1, wgtWp: 23.448, sos: 51.563, qwb: 0.027, flag: '#' },
  'bemidji-state': { rank: 58, npi: 43.786, w: 2, l: 7, t: 2, wgtWp: 20.000, sos: 51.715, qwb: 0.000 },
  'st-lawrence': { rank: 59, npi: 43.724, w: 1, l: 3, t: 1, wgtWp: 26.087, sos: 49.118, qwb: 0.363 },
  'stonehill': { rank: 60, npi: 43.345, w: 4, l: 6, t: 0, wgtWp: 28.000, sos: 48.459, qwb: 0.000 },
  'alaska-anchorage': { rank: 61, npi: 41.896, w: 1, l: 11, t: 0, wgtWp: 11.636, sos: 52.785, qwb: 0.052, flag: '#' },
  'liu': { rank: 62, npi: 41.536, w: 2, l: 9, t: 0, wgtWp: 19.231, sos: 49.502, qwb: 0.000, flag: '#' },
};
