import { ConstructEvent } from "./timerService";

describe("Test timers", () => {
	it("Performance", () => {

		const COUNT = 10_000;
		const json = require("./timers/christmas-dinner.json");

		const startedMs = Date.now();
		for (let i = 0; i < COUNT; i++) {
			const timer = ConstructEvent(json);
		}
		const endedMs = Date.now();
		const durationMs = endedMs - startedMs;
		const averageDurationMs = durationMs / COUNT;

		expect(averageDurationMs).toBeLessThan(2.0);

	});
});
