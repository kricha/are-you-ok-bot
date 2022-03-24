import cron from 'node-cron';
import {db} from '../db';
import moment from 'moment';
import BotManager from '../BotManager';
import i18n from '../i18n';

export const NotAnsweringCronHandler = () => {
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
};