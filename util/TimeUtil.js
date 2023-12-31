const MILS_SECOND = 1000;
const MILS_MINUTE = 60000;
const MILS_HOUR = MILS_MINUTE * 60;
const MILS_DAY = MILS_HOUR * 24;

const LENGTH_KEY_DAY = 10;
const LENGTH_KEY_MINUTE = 16;

class TimeUtil {
    static now() {
        return Date.now();
    }

    static startup(message) {
        console.log(`[${this.getLocalTime()}] ${message} -- STARTUP`);
    }

    static shutdown(message) {
        console.log(`[${this.getLocalTime()}] ${message} -- SHUTDOWN`);
    }

    static getLocalTime() {
        const date = new Date();
        return `${date.toLocaleDateString()} @ ${date.toLocaleTimeString()}`;
    }

    static diffSeconds(start, end) {
        return Math.floor((end - start) / MILS_SECOND);
    }
    static diffMinutes(start, end) {
        return Math.floor((end - start) / MILS_MINUTE);
    }
    static diffHours(start, end) {
        return Math.floor((end - start) / MILS_HOUR);
    }
    static diffDays(start, end) {
        return Math.floor((end - start) / MILS_DAY);
    }

    static roundToSecond(utime) {
        return TimeUtil.__roundTo(TimeUtil.__toUnix(utime), MILS_SECOND);
    }
    static roundToMinute(utime) {
        return TimeUtil.__roundTo(TimeUtil.__toUnix(utime), MILS_MINUTE);
    }
    static roundToHour(utime) {
        return (
            utime -
            (utime % TimeUtil.__roundTo(TimeUtil.__toUnix(utime), MILS_HOUR))
        );
    }
    static roundToDay(utime) {
        return (
            utime -
            (utime % TimeUtil.__roundTo(TimeUtil.__toUnix(utime), MILS_DAY))
        );
    }

    static incrementSeconds(utime, seconds) {
        return TimeUtil.__increment(utime, seconds || 1, MILS_SECOND);
    }
    static incrementMinutes(utime, minutes) {
        return TimeUtil.__increment(utime, minutes || 1, MILS_MINUTE);
    }
    static incrementHours(utime, hours) {
        return TimeUtil.__increment(utime, hours || 1, MILS_HOUR);
    }
    static incrementDays(utime, days) {
        return TimeUtil.__increment(utime, days || 1, MILS_DAY);
    }

    static decrementSeconds(utime, seconds) {
        return TimeUtil.__increment(utime, -1 * (seconds || 1), MILS_SECOND);
    }
    static decrementMinutes(utime, minutes) {
        return TimeUtil.__increment(utime, -1 * (minutes || 1), MILS_MINUTE);
    }
    static decrementHours(utime, hours) {
        return TimeUtil.__increment(utime, -1 * (hours || 1), MILS_HOUR);
    }
    static decrementDays(utime, days) {
        return TimeUtil.__increment(utime, -1 * (days || 1), MILS_DAY);
    }

    static toSecondKey(utime) {
        let date = TimeUtil.__toDate(utime);
        return `${date.getUTCFullYear()}-${TimeUtil.__leadingZero(
            date.getUTCMonth() + 1,
        )}-${TimeUtil.__leadingZero(
            date.getUTCDate(),
        )} ${TimeUtil.__leadingZero(
            date.getUTCHours(),
        )}:${TimeUtil.__leadingZero(
            date.getUTCMinutes(),
        )}:${TimeUtil.__leadingZero(date.getUTCSeconds())}`;
    }

    static toMinuteKey(utime) {
        let date = TimeUtil.__toDate(utime);
        return `${date.getUTCFullYear()}-${TimeUtil.__leadingZero(
            date.getUTCMonth() + 1,
        )}-${TimeUtil.__leadingZero(
            date.getUTCDate(),
        )} ${TimeUtil.__leadingZero(
            date.getUTCHours(),
        )}:${TimeUtil.__leadingZero(date.getUTCMinutes())}`;
    }

    static toHourKey(utime) {
        let date = TimeUtil.__toDate(utime);
        return `${date.getUTCFullYear()}-${TimeUtil.__leadingZero(
            date.getUTCMonth() + 1,
        )}-${TimeUtil.__leadingZero(
            date.getUTCDate(),
        )} ${TimeUtil.__leadingZero(date.getUTCHours())}:00`;
    }

    static toDayKey(utime) {
        let date = TimeUtil.__toDate(utime);
        return `${date.getUTCFullYear()}-${TimeUtil.__leadingZero(
            date.getUTCMonth() + 1,
        )}-${TimeUtil.__leadingZero(date.getUTCDate())}`;
    }

    static fromKey(key) {
        let fmt = key.replace(" ", "T");
        if (key.length === LENGTH_KEY_DAY) {
            fmt = `${fmt}T00:00:00`;
        } else if (key.length === LENGTH_KEY_MINUTE) {
            fmt = `${fmt}:00`;
        }
        return Date.parse(fmt + ".000Z");
    }

    static dateFromKey(key) {
        let fmt = key.replace(" ", "T");
        if (key.length === LENGTH_KEY_DAY) {
            fmt = `${fmt}T00:00:00`;
        } else if (key.length === LENGTH_KEY_MINUTE) {
            fmt = `${fmt}:00`;
        }
        return new Date(Date.parse(fmt + ".000Z"));
    }

    static __roundTo(utime, factor) {
        return utime - (utime % factor);
    }
    static __leadingZero(number) {
        return number < 10 ? "0" + number : number;
    }
    static __toUnix(date) {
        if (typeof date === "number") {
            return date;
        }
        if (date instanceof Date) {
            return date.getTime();
        }
    }
    static __toDate(utime) {
        if (typeof utime === "number") {
            return new Date(utime);
        }
        if (utime instanceof Date) {
            return utime;
        }
    }

    static __increment(utime, factor, millis) {
        return TimeUtil.roundToSecond(utime + millis * factor);
    }
}

export default TimeUtil;
