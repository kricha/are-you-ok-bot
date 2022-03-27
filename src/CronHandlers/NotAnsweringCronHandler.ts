import cron from 'node-cron';
import {db} from '../db';
import moment from 'moment';
import BotManager from '../BotManager';
import i18n from '../i18n';
import {AYOK_DATE_FORMAT} from '../constants';
import {logger} from '../logger';
import {getUnique, randomIntFromInterval} from '../utils';

export const NotAnsweringCronHandler = () => {
    cron.schedule('*/5 * * * *', () => {
        const token = getUnique();
        const now = moment();
        logger.info(`[${token}] Run NotAnsweringCronHandler for ${now.unix()}`);
        db.getAllWaitingAnswers(moment().unix())
            .then(res => {
                const waitingAnswerCount = res.length;
                if (waitingAnswerCount) {
                    logger.info(`[${token}] Waiting ${waitingAnswerCount} answers`);
                    for (const row of res) {
                        const userTsForMoment = row.ts * 1000;
                        const minutesDiff = moment()
                            .diff(
                                moment(userTsForMoment),
                                'minute'
                            )
                        ;
                        if (minutesDiff < randomIntFromInterval(14, 31)) {
                            continue;
                        }
                        db.getAllSubscribersByUid(row.uid)
                            .then(subscribers => {
                                if (subscribers.length) {
                                    logger.info(`[${token}] Start sending sub.not.answering for ${row.uid} subscribers`);
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
                                            .then(() => {
                                                logger.info(`[${token}] Sent sub.not.answering from ${row.uid} to ${sub.uid}`);
                                            })
                                            .catch(error => {
                                                if (error.response && error.response.statusCode === 403) {
                                                    db.setUserInActive(sub.uid);
                                                }
                                            })
                                        ;
                                    }
                                    const answersKey = moment(userTsForMoment).utcOffset(row.tz).format(AYOK_DATE_FORMAT);
                                    const answers = JSON.parse(row.answers)[answersKey] || {};
                                    const ayokHour = Object.keys(answers).includes('09') ? '20' : '09';//TODO: automate
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
                                        })
                                        .then(()=>{
                                            logger.info(`[${token}] Sent not.responding.message to ${row.uid}`);
                                        })
                                    ;
                                    BotManager.bot.editMessageReplyMarkup({inline_keyboard: []}, {
                                        chat_id: row.uid,
                                        message_id: row.message_id
                                    });
                                }
                                db.setWaitQueueProcessed(row.uid);
                            })
                        ;
                    }
                }
            })
        ;
    }).start();
};
