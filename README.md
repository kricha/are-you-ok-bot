## How to run

- The easiest way - use **docker**. Project provides complete `docker compose` setup:
    - `git clone git@github.com:kricha/are-you-ok-bot.git`
    - `cd are-you-ok-bot`
    - `docker compose build`
    - `echo '{"botToken":"YOUR_BOT_TOKEN"}' > config.json`
    - `docker compose up`
- Or you could install manually `node` and `pm2`, install npm dependencies, create config file(look above) and then run `npx tsc-watch --sourceMap --onFirstSuccess "pm2-runtime start ./ecosystem.config.cjs --only dev"` 