module.exports = {
    apps: [{
        name: 'star-prod',
        script: 'dist/index.js',
        instances: 1,
        autorestart: true,
        watch: true,
        node_args: '--experimental-specifier-resolution=node',
        source_map_support: true,
        ignore_watch: ['node_modules', 'log', '.git', '.idea'],
        env: {
            NODE_ENV: 'production',
            NODE_DEBUG: false,
            TZ: 'Europe/Kiev',
        },
    }, {
        name: 'star-dev',
        script: 'dist/index.js',
        instances: 1,
        autorestart: true,
        watch: true,
        ignore_watch: ['node_modules', 'log', '.git', '.idea', 'src', 'var'],
        node_args: '--experimental-specifier-resolution=node',
        source_map_support: true,
        env: {
            NODE_ENV: 'development',
            NODE_DEBUG: false,
            TZ: 'Europe/Kiev',
            NTBA_FIX_319: 1,
        },
        env_production: {
            NODE_ENV: 'production',
            NODE_DEBUG: false,
            NTBA_FIX_319: 1
        },
    }],
};
