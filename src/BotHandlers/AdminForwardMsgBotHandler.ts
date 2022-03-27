import conf from '../conf';
import {getUnique, randomIntFromInterval, sleep} from '../utils';
import BotManager from '../BotManager';
import {logger} from '../logger';
import {db} from '../db';

const ownerId = conf.get('ownerId');
if (!ownerId) {
    logger.error('Telegram bot owner [ownerId] not set!');
}

export const AdminForwardMsgBotHandler = () => {
    BotManager.bot.onText(/\/forward @?(?<channelId>[A-z0-9_]{5,}) (?<messageId>\d+)/, (msg, match) => {
        const token = getUnique();
        const channelId = match.groups.channelId;
        const messageId = match.groups.messageId;
        if (channelId && messageId && msg.from.id === ownerId) {
            logger.info(`[${token}] Start forwarding message [${messageId}] from @${channelId} chat`);
            db.getAllActiveUsers()
                .then(async users => {
                    if (!users.length) {
                        return;
                    }
                    const sending = [];
                    for (const idx in users) {
                        const user = users[idx];
                        const uid = user.uid;
                        const msgNum = parseInt(idx) + 1;
                        const username = user.username ? `@${user.username}` : '';
                        BotManager.bot.forwardMessage(uid, `@${channelId}`, messageId)
                            .then(() => {
                                sending.push(1);
                                logger.info(`[${token}] [#${msgNum}] Message sent to ${uid} ${username}`);
                            })
                            .catch(error => {
                                sending.push(0);
                                logger.info(`[${token}] [#${msgNum}] sending error to ${uid} ${username}: `, error.message);
                            })
                        ;
                        await sleep(randomIntFromInterval(0, 1000));
                    }

                    let fin = false;
                    while (!fin) {
                        if (sending.length === users.length) {
                            fin = true;
                            logger.info(`[${token}] Success sent ${sending.filter(el => el > 0).length}/${users.length}`);
                        }
                        await sleep(1000);
                    }
                })
            ;
        }
    });

};
