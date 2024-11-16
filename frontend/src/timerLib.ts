export * from "../../timer-lib/src/timerService";
import christmasDinnerJson from "../../timer-lib/src/timers/christmas-dinner.json";
import { TimerJson } from "../../timer-lib/src/timerService";

export function FetchChristmasDinner() {
    return christmasDinnerJson as TimerJson;
}
