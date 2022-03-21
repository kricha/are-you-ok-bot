import {db} from "./db";
import moment from "moment";
import cron from 'node-cron';
import BotManager from './BotManager';
import {tzMinutes} from "./utils";
import {AYOK_DATE_FORMAT, REPORT_HOURS} from "./constants";

process.env.NTBA_FIX_319 = '1';

db.runMigrations();
BotManager.init();

cron.schedule('0 * * * *', () => {
    const processHours = {'09': [], '15': [], '21': []};

    for (let offset of tzMinutes) {
        const offsetHH = moment().utcOffset(offset).format('HH');
        if (processHours.hasOwnProperty(offsetHH)) {
            processHours[offsetHH].push(offset)
        }
    }

    for (let aokHour in processHours) {
        const timezones = processHours[aokHour];
        if (timezones.length) {
            db.getUsersByTz(timezones)
                .then(result => {
                    if (result) {
                        for (let row of result) {
                            BotManager.sendAreYouOkRequest(row.uid, row.lang, `ayok_${aokHour}`);
                        }
                    }
                })
            ;
        }
    }
});

cron.schedule('0 * * * *', () => {
    testTz();
});

const testTz = () => {
    const processTimezones = [];

    for (let offset of tzMinutes) {
        const offsetHH = moment().utcOffset(offset).format('HH');
        if (offsetHH === REPORT_HOURS) {
            processTimezones.push(offset)
        }
    }

    if (processTimezones.length) {
        db.getUsersByTz(processTimezones)
            .then(result => {
                if (!result) {
                    return;
                }
                for (let user of result) {
                    db.getUserSubsById(user.uid)
                        .then(row => {
                            const report = {};
                            const usersToCheck = [];
                            for (const [uid, alias] of Object.entries(JSON.parse(row.users))) {
                                const intUid = parseInt(uid);
                                report[intUid] = {
                                    alias,
                                    status: 'unknown'
                                };
                                usersToCheck.push(new Promise(resolve => {
                                    db.getUserById(intUid)
                                        .then(sub => {
                                            const currentReportKey = moment().utcOffset(sub.tz).format(AYOK_DATE_FORMAT);
                                            const answers = JSON.parse(sub.answers);
                                            if (!report[sub.uid].alias) {
                                                report[sub.uid].alias = sub.username || sub.uid;
                                            }
                                            if (!answers.hasOwnProperty(currentReportKey)) {
                                                report[sub.uid].status = 'not_ok';
                                            } else {
                                                const a = answers[currentReportKey];
                                                report[sub.uid].status = (a["09"] && a["15"] && a["21"]) ? 'ok' : 'not_ok';
                                            }
                                            resolve(1);
                                        })
                                    ;
                                }));
                            }
                            if (!usersToCheck) {
                                return;
                            }
                            Promise.all(usersToCheck)
                                .then(() => {
                                    BotManager.sendAreYouOkReport(user.uid, user.lang, report);
                                })
                            ;
                        })
                    ;
                }
            })
        ;
    }
};

testTz();