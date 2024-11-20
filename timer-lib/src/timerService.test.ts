import { ConstructEvent, EventState } from "./timerService";

describe("Test timers", () => {
    it("Performance", () => {

        const COUNT = 10_000;
        const json = require("./timers/christmas-dinner.json");

        const startedMs = Date.now();
        for (let i = 0; i < COUNT; i++) {
            const _timer = ConstructEvent(json);
        }
        const endedMs = Date.now();
        const durationMs = endedMs - startedMs;
        const averageDurationMs = durationMs / COUNT;

        expect(averageDurationMs).toBeLessThan(0.5);
    });

    it("Simple 1 properties", () => {

        const json = require("./test-timers/simple-1.json");
        const timer = ConstructEvent(json);

        expect(timer.events.map(ev => ev.name)).toEqual(["step-1", "step-2", "step-3", "step-4"]);
        expect(timer.events.find(ev => ev.name === "step-1")?.dependents.map(ev => ev.name)).toEqual(["step-2", "step-3"]);
        expect(timer.events.find(ev => ev.name === "step-2")?.dependents.map(ev => ev.name)).toEqual(["step-4"]);
        expect(timer.events.find(ev => ev.name === "step-3")?.dependents.map(ev => ev.name)).toEqual(["step-4"]);

        expect(timer.events.find(ev => ev.name === "step-1")?.dependencies.map(ev => ev.name)).toEqual([]);
        expect(timer.events.find(ev => ev.name === "step-2")?.dependencies.map(ev => ev.name)).toEqual(["step-1"]);
        expect(timer.events.find(ev => ev.name === "step-3")?.dependencies.map(ev => ev.name)).toEqual(["step-1"]);
        expect(timer.events.find(ev => ev.name === "step-4")?.dependencies.map(ev => ev.name)).toEqual(["step-2", "step-3"]);

        expect(timer.events.find(ev => ev.name === "step-1")?.description).toEqual("step 1 description");
        expect(timer.events.find(ev => ev.name === "step-2")?.description).toEqual("step 2 description");
        expect(timer.events.find(ev => ev.name === "step-3")?.description).toEqual("step 3 description");
        expect(timer.events.find(ev => ev.name === "step-4")?.description).toEqual("step 4 description");
    });

    it("Simple 1 expected duration", () => {

        const json = require("./test-timers/simple-1.json");
        const timer = ConstructEvent(json);

        //expected duration is hour and 10 minutes
        const expectedDurationSeconds = (60 * 60) + (10 * 60);
        expect(timer.expectedDurationSeconds).toBe(expectedDurationSeconds);
    });

    it("Simple 1 duration", () => {

        const json = require("./test-timers/simple-1.json");
        const timer = ConstructEvent(json);

        while(timer.state !== EventState.COMPLETED) {
            timer.progress();
        }

        expect(timer.currentDurationSeconds).toBe(timer.expectedDurationSeconds);
    });
});
