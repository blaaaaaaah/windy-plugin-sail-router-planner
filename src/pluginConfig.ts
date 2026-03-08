import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-sail-router-planner',
    version: '0.1.0',
    icon: '⛵',
    title: 'Sail Router Planner',
    description: 'Test access to Windy route planning APIs for sailing calculations.',
    author: 'Sailing Plugin Developer',
    repository: 'https://github.com/windycom/windy-plugin-template',
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    routerPath: '/sail-router-planner',
    listenToSingleclick: true,
    private: true,
};

export default config;
