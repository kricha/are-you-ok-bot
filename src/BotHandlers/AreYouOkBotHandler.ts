import {db} from '../db';
import moment from 'moment';
import {AYOK_DATE_FORMAT, NOT_ASWER_MINS_ALERT} from '../constants';
import i18n from '../i18n';
import BotManagerInterface from '../Interfaces/BotManagerInterface';
import {logger} from '../logger';
import {getUnique} from '../utils';

export default function AreYouOkBotHandler(BotManager: BotManagerInterface) {
    BotManager.bot.on('callback_query', query => {
        const uid = query.from.id;
        const langArray = query.data.split('_');
        if (langArray.length >= 2 && langArray[0] === 'ayok') {
            const token = getUnique();
            logger.info(`[${token}] Got new AYOK request from ${uid}`);
            db.getUserById(uid)
                .then(res => {
                    const ayokHour = langArray[1];
                    const now = moment();
                    const messageDT = moment(query.message.date * 1000);
                    const answerDiffDays = messageDT.diff(now, 'days');
                    const dateKey = messageDT.format(AYOK_DATE_FORMAT);
                    const messageTimeFromCb = langArray[2] ? moment(parseInt(langArray[2]) * 1000) : false;
                    logger.info(`[${token}] ${uid} answered after ${now.diff(messageDT, 'minutes')} minutes`);
                    db.getWaitAnswerByUid(uid)
                        .then(waitAnswer => {
                            let msgIdToEdit = query.message.message_id;
                            if (waitAnswer && waitAnswer.message_id !== msgIdToEdit) {
                                msgIdToEdit = waitAnswer.message_id;
                                BotManager.bot.deleteMessage(uid, query.message.message_id.toString())
                                    .then(()=>{
                                        logger.info(`[${token}] Deleted current request for ${uid}`);
                                    })
                                ;
                            }
                            BotManager.bot.editMessageText(i18n.t('good.thanks', {lng: res.lang}), {
                                chat_id: uid,
                                message_id: msgIdToEdit
                            });
                            db.deleteFromWaitAnswer(uid);
                        })
                    ;
                    if (answerDiffDays < 1) {
                        /** SENDING NOTIFICATION ABOUT OK ANSWER START **/
                        if (moment.isMoment(messageTimeFromCb)) {
                            const minutesFromAlert = now.diff(messageTimeFromCb, 'minutes');
                            if (minutesFromAlert >= NOT_ASWER_MINS_ALERT) {
                                logger.info(`[${token}] ${uid} answering answers too late, after ${minutesFromAlert} from original ask`);
                                db.getAllSubscribersByUid(res.uid)
                                    .then(subscribers => {
                                        if (!subscribers.length) {
                                            return;
                                        }
                                        logger.info(`[${token}] Start notifying subscribers of ${uid} about ok state`);
                                        for (const sub of subscribers) {
                                            BotManager.bot.sendMessage(
                                                sub.uid,
                                                i18n.t('already.answered', {
                                                    lng: sub.lang,
                                                    uid: sub.uid,
                                                    alias: sub.alias,
                                                }),
                                                {parse_mode: 'HTML'}
                                            )
                                                .then(() => {
                                                    logger.info(`[${token}] Sent info to ${sub.uid} that ${uid} is ok`);
                                                })
                                                .catch(error => {
                                                    logger.warn(`[${token}] Error sending info to ${sub.uid} that ${uid} is ok`, error.message);
                                                })
                                            ;
                                        }
                                    })
                                ;
                            }
                        }
                        db.updateAreYouOkField(uid, `'$.${dateKey}.${ayokHour}'`);
                    }
                })
            ;
        }
    });
}