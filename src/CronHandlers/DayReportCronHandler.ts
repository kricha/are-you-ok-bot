import cron from 'node-cron';
import {areYouOkHours, tzMinutes} from '../utils';
import moment from 'moment';
import {AYOK_DATE_FORMAT, REPORT_HOURS} from '../constants';
import {db} from '../db';
import BotManager from '../BotManager';

export const DayReportCronHandler = () => {
    cron.schedule('0 * * * *', () => {
        const processTimezones = [];
        for (const offset of tzMinutes) {
            const offsetHH = moment().utcOffset(offset).format('HH');
            if (offsetHH === REPORT_HOURS) {
                processTimezones.push(offset);
            }
        }
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
                                                    report[sub.uid].status = (Object.keys(areYouOkHours).length <= Object.keys(answers[currentReportKey]).length)
                                                        ? 'sub.status.ok'
                                                        : 'sub.status.not_all_ok'
                                                    ;
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
                                        BotManager.sendAreYouOkReport(97507112, user.lang, report);
                                    });
                            });
                    }
                });
        }
    }).start();
};