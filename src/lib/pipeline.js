export const build = __SITE_BUILD__;
export const environments = [
  { id: 'dev', label: 'dev', url: 'http://t.local:5199', description: 'local Mac' },
  { id: 'staging', label: 'staging', url: 'https://allisinbloom-art-git-staging-elbong-q-gearnys-projects.vercel.app', description: 'private preview' },
  { id: 'production', label: 'production', url: 'https://allisinbloom.art', description: 'live site' }
];
export const checksUrl = 'https://github.com/clozach/allisinbloom.art/actions/workflows/ci.yml';
export const reviewUrl = 'https://github.com/clozach/allisinbloom.art/compare/main...staging';
