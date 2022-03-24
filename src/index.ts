import {db} from './db';
import BotManager from './BotManager';
import {AreYouOkCronHandler} from './CronHandlers/AreYouOkCronHandler';
import {NotAnsweringCronHandler} from './CronHandlers/NotAnsweringCronHandler';
import {DayReportCronHandler} from './CronHandlers/DayReportCronHandler';

db.runMigrations();
BotManager.init();

AreYouOkCronHandler();
NotAnsweringCronHandler();
DayReportCronHandler();