import cron from 'node-cron';
import {db} from '../db';
import moment from 'moment';
import BotManager from '../BotManager';
import i18n from '../i18n';
import {AYOK_DATE_FORMAT, NOT_ASWER_MINS_ALERT} from '../constants';

export const NotAnsweringCronHandler = () => {
    cron.schedule('*/10 * * * *', () => {
        db.getAllWaitingAnswers(moment().unix())
            .then(res => {
                if (res.length) {
                    for (const row of res) {
                        const userTsForMoment = row.ts * 1000;
                        const minutesDiff = moment()
                            .diff(
                                moment(userTsForMoment),
                                'minute'
                            )
                        ;
                        if (minutesDiff < NOT_ASWER_MINS_ALERT) {
                            return;
                        }
                        db.getAllSubscribersByUid(row.uid)
                            .then(subscribers => {
                                if (subscribers.length) {
                                    for (const sub of subscribers) {
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
                                    const answersKey = moment(userTsForMoment).utcOffset(row.tz).format(AYOK_DATE_FORMAT);
                                    const answers = JSON.parse(row.answers)[answersKey] || {};
                                    const ayokHour = Object.keys(answers).includes('09') ? '20' : '09';
                                    BotManager.bot.sendMessage(
                                        row.uid,
                                        i18n.t('not.responding.message', {lng: row.lang, minutes: minutesDiff}),
                                        {
                                            reply_to_message_id: row.message_id,
                                            reply_markup: {
                                                inline_keyboard: [
                                                    [
                                                        {
                                                            text: i18n.t('im.ok', {lng: row.lang}),
                                                            callback_data: `ayok_${ayokHour}_${row.ts}`,
                                                        }
                                                    ]
                                                ],
                                            }
                                        }
                                    );
                                    db.setWaitQueueProcessed(row.uid);
                                    BotManager.bot.editMessageReplyMarkup({inline_keyboard: []}, {
                                        chat_id: row.uid,
                                        message_id: row.message_id
                                    });
                                }
                            })
                        ;
                    }
                }
            })
        ;
    }).start();
};