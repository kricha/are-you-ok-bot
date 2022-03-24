import pkg from 'log4js';
const { configure, getLogger } = pkg;

export const logger = getLogger();

configure({
    appenders: {
        bot: {
            type: 'dateFile',
            filename: 'log/bot.log',
            pattern: 'yyyy-MM-dd',
            compress: true,
            numBackups: 14,
            layout: {
                type: 'pattern',
                pattern: '%d{yy-MM-dd hh:mm:ss.SSS} [%p] %m',
            },
        },
        out: {
            type: 'stdout',
            layout: {
                type: 'pattern',
                pattern: '%[%d{yy-MM-dd hh:mm:ss.SSS} [%p]%] %m',
            },
        },
        file_log: {
            type: 'logLevelFilter',
            level: 'all',
            appender: 'bot',
        },
        console_log: {
            type: 'logLevelFilter',
            level: 'info',
            appender: 'out',
        },
    },
    categories: {
        default: {appenders: ['file_log', 'console_log'], level: 'all'},
    },
    pm2: true,
})
;







