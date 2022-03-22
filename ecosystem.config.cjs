module.exports = {
    apps: [{
        name: 'prod',
        script: 'dist/index.js',
        instances: 1,
        autorestart: true,
        watch: true,
        node_args: '--experimental-specifier-resolution=node --max-old-space-size=256',
        source_map_support: true,
        ignore_watch: ['node_modules', 'log', '.git', '.idea', 'var'],
        env: {
            NODE_ENV: 'production',
            NODE_DEBUG: false,
            TZ: 'Europe/Kiev',
            NTBA_FIX_319: 1,
        },
    }, {
        name: 'dev',
        script: 'dist/index.js',
        instances: 1,
        autorestart: true,
        watch: true,
        ignore_watch: ['node_modules', 'log', '.git', '.idea', 'src', 'var'],
        node_args: '--experimental-specifier-resolution=node  --max-old-space-size=256',
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
