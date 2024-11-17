export * from "../../timer-lib/src/timerService";
import christmasDinnerJson from "../../timer-lib/src/timers/christmas-dinner.json";
import { TimerJson } from "../../timer-lib/src/timerService";

const TIMER_MAP: { [key:string]:TimerJson; } = {
    "christmas-dinner": christmasDinnerJson as TimerJson
}

export function FetchChristmasDinner() {
    return christmasDinnerJson as TimerJson;
}

export function FetchTimer(timerKey: string) {
    if (!(timerKey in TIMER_MAP)) {
        throw new Error(`Timer "${timerKey}" not found.`);
    }
    return TIMER_MAP[timerKey];
}

export function FetchTimerKeys(): string[] {
    const keys = [];
    for(const k in TIMER_MAP) {
        keys.push(k);
    }
    return keys;
}