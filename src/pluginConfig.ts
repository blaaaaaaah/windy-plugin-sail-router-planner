import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-sail-router-planner',
    version: '0.3.0',
    icon: '⛵',
    title: 'Sail Router Planner',
    description: 'Route planning for sailors.',
    author: 'Thomas Dubois',
    repository: 'https://github.com/blaaaaaaah/windy-plugin-sail-router-planner',
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    routerPath: '/sail-router-planner/:route?',
    listenToSingleclick: true,
    private: false,
};

export default config;
