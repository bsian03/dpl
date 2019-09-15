const pm2 = require('pm2');
const pmx = require('pmx');
const util = require('util');
const Queue = require('./message-queue');

const config = pmx.initModule();

/**
 * PM2 Logs listener
 * @class PM2Listener
 * @typedef {PM2Listener} PM2 logs listener
 */
class PM2Listener {
    constructor() {
        // Core
        this.name = 'dpl';
        // Options
        this.exception = typeof config.exception === 'boolean' ? config.exception : false;
        this.error = typeof config.error === 'boolean' ? config.error : true;
        this.log = typeof config.log === 'boolean' ? config.log : true;
        this.kill = typeof config.kill === 'boolean' ? config.kill : false;
        this.restart = typeof config.restart === 'boolean' ? config.restart : false;
        this.delete = typeof config.delete === 'boolean' ? config.delete : false;
        this.stop = typeof config.stop === 'boolean' ? config.stop : false;
        this['restart overlimit'] = typeof config.restartLimit === 'boolean' ? config.restartLimit : false;
        this.exit = typeof config.exit === 'boolean' ? config.exit : false;
        this.start = typeof config.start === 'boolean' ? config.start : false;
        this.online = typeof config.online === 'boolean' ? config.online : false;
    }

    /**
     * Start PM2 logging
     */
    run() {
        if (!config.webhook) {
            console.error('A Webhook URL was not supplied. Please set a webhook URL by running `pm2 set dpl:webhook <url>\nFor information regarding creating webhooks, see https://support.discordapp.com/hc/en-us/articles/228383668-Intro-to-Webhooks');
            pm2.stop(this.name);
            return;
        }
        pm2.launchBus((err, bus) => {
            if (err) { console.error(`Failed to launch PM2 logging: ${err.message}`); pm2.stop(this.name); }
            Queue.run();
            if (this.exception) {
                bus.on('process:exception', (data) => {
                    if (this.isSelf(data)) return;
                    this.formatToQueue(data);
                });
            }
            if (this.error) {
                bus.on('log:error', (data) => {
                    if (this.isSelf(data)) return;
                    this.formatToQueue(data);
                });
            }
            if (this.log) {
                bus.on('log:out', (data) => {
                    if (this.isSelf(data)) return;
                    this.formatToQueue(data);
                });
            }
            if (this.kill) {
                bus.on('pm2:kill', (data) => {
                    if (this.isSelf(data)) return;
                    this.addToQueue(data.msg);
                    console.log(data); // what's in it
                });
            }
            bus.on('process:event', (data) => {
                if (this.isSelf(data)) return;
                if (!this[data.event]) return;
                const message = `Event occured on ${data.process.name} [${data.process.env.ID}]: ${data.event}`;
                this.addToQueue(message);
            });
        });
    }

    isSelf(data) {
        return data.process && data.process.name === this.name;
    }

    /**
     * Formats data from PM2 and puts it in queue
     * @param {Object} data Data from PM2
     * @param {String} data.data Data message from PM2
     */
    formatToQueue(data) {
        let message = data.data;
        if (typeof message !== 'string') message = util.inspect(message);
        message = `\`\`\`js\n${message}\n\`\`\``;
        this.addToQueue(message);
    }

    // eslint-disable-next-line class-methods-use-this
    addToQueue(formatted) {
        Queue.addToQueue(formatted);
    }
}

module.exports = new PM2Listener();
