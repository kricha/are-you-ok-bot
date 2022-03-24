import moment from 'moment';
import cron from 'node-cron';
import {db} from './db';
import BotManager from './BotManager';
import {tzMinutes} from './utils';
import {AYOK_DATE_FORMAT, REPORT_HOURS} from './constants';
import i18n from './i18n';
import {logger} from './logger';

process.env.NTBA_FIX_319 = '1';

db.runMigrations();
BotManager.init();

cron.schedule('0 * * * *', () => {
    const processHours = {'12': [], '20': []};

    for (const offset of tzMinutes) {
        const offsetHH = moment().utcOffset(offset).format('HH');
        if (Object.prototype.hasOwnProperty.call(processHours, offsetHH)) {
            processHours[offsetHH].push(offset);
        }
    }

    for (const ayokHour in processHours) {
        const timezones = processHours[ayokHour];
        if (timezones.length) {
            const timeZonesString = timezones.map(tz => `GMT${(parseInt(tz) > 0 ? '+' : '') + (parseInt(tz) / 60).toString()}`).join(', ');
            logger.info(`Start processing AYOK request for ${ayokHour}:00 in ${timeZonesString} timezones`);
            db.getUsersByTz(timezones)
                .then((result) => {
                    if (result.length) {
                        const usersInTimeZones = result.map(row => `${row.uid} ${row.username ? `(${row.username})` : ''}`).join(', ');
                        logger.info(`Users ${usersInTimeZones} start getting AYOK ${ayokHour}:00 requests`);
                        for (const row of result) {
                            BotManager.sendAreYouOkRequest(row.uid, row.lang, `ayok_${ayokHour}`)
                                .then(res => {
                                    const message_id = res.message_id;
                                    logger.info(`Successful sent request to chat ${res.chat.id} in message ${message_id}`);
                                    const date = moment(res.date * 1000).utcOffset(row.tz).add(30, 'm');
                                    db.addToWaitAnswer(res.chat.id, date.unix(), message_id);
                                })
                                .catch(error => BotManager.handleForbiddenRequest(error, row.uid))
                            ;
                        }
                    } else {
                        logger.info(`No users for AYOK ${ayokHour}:00 request in timezones ${timeZonesString}`);
                    }
                })
            ;
        }
    }
});

cron.schedule('0 * * * *', () => {
    testTz();
});

cron.schedule('*/30 * * * *', () => {
    db.getAllWaitingAnswers(moment().unix())
        .then(res => {
            if (res.length) {
                for (const row of res) {
                    db.getAllSubscriberByUid(row.uid)
                        .then(subscribers => {
                            if (subscribers.length) {
                                for (const sub of subscribers) {
                                    const minutesDiff = moment()
                                        .diff(
                                            moment(row.ts * 1000).utcOffset(sub.tz),
                                            'minute'
                                        )
                                    ;
                                    BotManager.bot.sendMessage(sub.uid, i18n.t('sub.not.answering', {
                                            lng: sub.lang,
                                            name: sub.alias,
                                            uid: row.uid,
                                            min: minutesDiff
                                        })
                                        , {
                                            parse_mode: 'MarkdownV2'
                                        }
                                    )
                                        .catch(error => {
                                            if (error.response && error.response.statusCode === 403) {
                                                db.setUserInActive(sub.uid);
                                            }
                                        })
                                    ;
                                }
                            }
                            BotManager.bot.deleteMessage(row.uid, row.message_id);
                            db.deleteFromWaitAnswer(row.uid);
                        })
                    ;
                }
            }
        })
    ;
});

const testTz = () => {
    const processTimezones = [];

    for (const offset of tzMinutes) {
        const offsetHH = moment().utcOffset(offset).format('HH');
        if (offsetHH === REPORT_HOURS) {
            processTimezones.push(offset);
        }
    }
    console.log(processTimezones);
    if (processTimezones.length) {
        db.getUsersByTz(processTimezones)
            .then((result) => {
                if (!result) {
                    return;
                }
                for (const user of result) {
                    db.getUserSubsById(user.uid)
                        .then((row) => {
                            if (!row) {
                                return;
                            }
                            const report = {};
                            const usersToCheck = [];
                            for (const [uid, alias] of Object.entries(JSON.parse(row.users))) {
                                const intUid = parseInt(uid);
                                report[intUid] = {
                                    alias,
                                    status: 'sub.status.unknown',
                                };
                                usersToCheck.push(new Promise((resolve) => {
                                    db.getUserById(intUid)
                                        .then((sub) => {
                                            if (!sub) {
                                                resolve(1);
                                                return;
                                            }
                                            const currentReportKey = moment().utcOffset(sub.tz).format(AYOK_DATE_FORMAT);
                                            const answers = JSON.parse(sub.answers);
                                            if (!report[sub.uid].alias) {
                                                report[sub.uid].alias = sub.username || sub.uid;
                                            }

                                            if (!Object.prototype.hasOwnProperty.call(answers, currentReportKey)) {
                                                report[sub.uid].status = 'sub.status.no_answers';
                                            } else {
                                                const flag1 = !!answers[currentReportKey]['12'];
                                                const flag2 = !!answers[currentReportKey]['20'];
                                                //TODO: change on length less then ask times
                                                report[sub.uid].status = (flag1 && flag2) ? 'sub.status.ok' : 'sub.status.not_all_ok';
                                            }
                                            resolve(1);
                                        });
                                }));
                            }

                            if (!usersToCheck) {
                                return;
                            }
                            Promise.all(usersToCheck)
                                .then(() => {
                                    console.log(report);
                                    BotManager.sendAreYouOkReport(user.uid, user.lang, report);
                                });
                        });
                }
            });
    }
};