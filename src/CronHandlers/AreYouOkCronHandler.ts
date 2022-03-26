import cron from 'node-cron';
import {areYouOkHours, getUnique, tzMinutes} from '../utils';
import moment from 'moment';
import {logger} from '../logger';
import {db} from '../db';
import BotManager from '../BotManager';

export const AreYouOkCronHandler = () => {
    cron.schedule('0 * * * *', () => {
        const token = getUnique();
        const processHours = areYouOkHours;

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
                logger.info(`[${token}] Start processing AYOK request for ${ayokHour}:00 in ${timeZonesString} timezones`);
                db.getUsersByTz(timezones)
                    .then((result) => {
                        if (result.length) {
                            const usersInTimeZones = result.map(row => `${row.uid} ${row.username ? `(${row.username})` : ''}`).join(', ');
                            logger.info(`[${token}] Users ${usersInTimeZones} start getting AYOK ${ayokHour}:00 requests`);
                            for (const row of result) {
                                BotManager.sendAreYouOkRequest(row.uid, row.lang, `ayok_${ayokHour}`)
                                    .then(res => {
                                        const message_id = res.message_id;
                                        logger.info(`[${token}] Successful sent request to chat ${res.chat.id} in message ${message_id}`);
                                        const date = moment(res.date * 1000).utcOffset(row.tz).add(30, 'm');
                                        db.addToWaitAnswer(res.chat.id, date.unix(), message_id);
                                    })
                                    .catch(error => BotManager.handleForbiddenRequest(error, row.uid))
                                ;
                            }
                        } else {
                            logger.info(`[${token}] No users for AYOK ${ayokHour}:00 request in timezones ${timeZonesString}`);
                        }
                    })
                ;
            }
        }
    });
};