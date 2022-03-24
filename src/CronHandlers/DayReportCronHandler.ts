import cron from 'node-cron';
import {tzMinutes} from '../utils';
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
    });
};