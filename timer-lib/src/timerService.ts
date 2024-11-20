export interface TimerJson {
    name: string,
    events: EventJson[]
}

export interface EventJson {
    name: string,
    description: string,
    duration: string,
    dependencies: string[],
    startDelay: string
}

export enum EventState {
    PENDING,
    WAITING,
    IN_PROGRESS,
    COMPLETED,
    PAUSED,
}

export class TimerInstance {
    name: string = "";
    events: EventInstance[] = [];
    currentDurationSeconds: number = 0;
    expectedDurationSeconds: number = 0;
    state: EventState = EventState.PENDING;

    static fromEvents(name: string, events: EventInstance[]): TimerInstance {
        const timer = new TimerInstance();
        timer.name = name;
        timer.events = events;
        return timer;
    }

    /** Works best for low values of delta. */
    progressDelta(deltaSeconds: number) {

        if (this.state === EventState.COMPLETED) {
            return;
        }
        for (let i = 0; i < deltaSeconds; i++) {
            this.progress();
        }
    }

    progress() {

        if (this.state === EventState.PENDING) {
            const rootEvents = this.events.filter(ev => ev.dependencies.length === 0);
            for (const event of rootEvents) {
                event.state = EventState.IN_PROGRESS;
            }
            this.state = EventState.IN_PROGRESS;
        }

        if (this.state === EventState.IN_PROGRESS) {
            this.currentDurationSeconds++;
            let checkCompleted = false;

            for (const event of this.events) {
                switch (event.state) {
                    case EventState.IN_PROGRESS:
                        event.currentDurationSeconds++;
                        if (event.currentDurationSeconds >= event.durationSeconds) {
                            checkCompleted = true;
                            event.completed(this.currentDurationSeconds);
                            continue;
                        }
                        break;
                    case EventState.PENDING:
                        // check if dependencies are complete
                        let completed = true;
                        for (const d of event.dependencies) {
                            if (d.state !== EventState.COMPLETED) {
                                completed = false;
                                break;
                            }
                        }
                        if (completed) {
                            if (event.startDelaySeconds <= 0) {
                                event.start(this.currentDurationSeconds);
                            }
                            else {
                                event.state = EventState.WAITING;
                            }
                        }
                        break;
                    case EventState.WAITING:
                        event.elapsedStartDelaySeconds++;
                        if (event.elapsedStartDelaySeconds >= event.startDelaySeconds) {
                            event.start(this.currentDurationSeconds);
                        }
                        break;
                    default:
                        break;
                }
            }

            if (checkCompleted) {
                let completed = true;
                for (const d of this.events) {
                    if (d.state !== EventState.COMPLETED) {
                        completed = false;
                        break;
                    }
                }
                if (completed) {
                    this.state = EventState.COMPLETED;
                }
            }
        }
    }

    /**
     * Clones the entire timer, events, and current elapsed time.
     */
    clone() {

        const clonedEvents = [];
        for (const ev of this.events) {
            const cloned = new EventInstance();
            cloned.name = ev.name;
            cloned.description = ev.description;
            cloned.state = ev.state;
            cloned.durationSeconds = ev.durationSeconds;
            cloned.currentDurationSeconds = ev.currentDurationSeconds;
            cloned.startTimeSeconds = ev.startTimeSeconds;
            cloned.completedDurationSeconds = ev.completedDurationSeconds;
            cloned.startDelaySeconds = ev.startDelaySeconds;
            cloned.elapsedStartDelaySeconds = ev.elapsedStartDelaySeconds;
            cloned.expectedStartTimeSeconds = ev.expectedStartTimeSeconds;
            cloned.expectedCompletedTimeSeconds = ev.expectedCompletedTimeSeconds;

            clonedEvents.push(cloned);
        }

        for (const ev of this.events) {
            const clonedEvent = clonedEvents.find(ce => ce.name === ev.name)!;
            for (const d of ev.dependencies) {
                clonedEvent.dependencies.push(clonedEvents.find(ce => ce.name === d.name)!);
            }
            for (const d of ev.dependents) {
                clonedEvent.dependents.push(clonedEvents.find(ce => ce.name === d.name)!);
            }
        }

        const clonedTimer = TimerInstance.fromEvents(this.name, clonedEvents);
        return clonedTimer;
    }

    calculateExpectedTimes() {

        if (this.events.find(ev => ev.state === EventState.PAUSED)) {
            // cannot calculate expected times when paused
            return;
        }

        const clonedTimer = this.clone();
        clonedTimer.progress();

        while (clonedTimer.state !== EventState.COMPLETED) {

            // Convoluted code below finds when the next step is completed or finished waiting and adds that time
            // amount directly. This dramatically improves performance.
            const inProgress = clonedTimer.events
                .filter(ev => ev.state === EventState.IN_PROGRESS);
            let inProgressStep = Number.MAX_SAFE_INTEGER;
            if (inProgress.length > 0) {
                const nextStep = inProgress
                    .sort((a, b) => (a.durationSeconds - a.currentDurationSeconds!) - (b.durationSeconds - b.currentDurationSeconds!))[0];
                inProgressStep = nextStep.durationSeconds - nextStep.currentDurationSeconds!;
            }

            const waiting = clonedTimer.events
                .filter(ev => ev.state === EventState.WAITING);
            let waitingStep = Number.MAX_SAFE_INTEGER;
            if (waiting.length > 0) {
                const nextStep = waiting
                    .sort((a, b) => (a.startDelaySeconds - a.elapsedStartDelaySeconds) - (b.startDelaySeconds - b.elapsedStartDelaySeconds))[0];
                waitingStep = nextStep.startDelaySeconds - nextStep.elapsedStartDelaySeconds;
            }
            const step = Math.min(inProgressStep, waitingStep) - 1;
            if (step === Number.MAX_SAFE_INTEGER - 1) {
                console.log("In progress");
                console.log(inProgress);
                console.log("Waiting");
                console.log(waiting);
                throw new Error("MAX INT STEP!");
            }

            for (const ev of inProgress) {
                ev.currentDurationSeconds += step;
            }
            for (const ev of waiting) {
                ev.elapsedStartDelaySeconds += step;
            }
            clonedTimer.currentDurationSeconds += step;
            clonedTimer.progress();

            if (clonedTimer.currentDurationSeconds >= 5_000_000) {
                throw new Error("TOO LONG!");
            }
        }

        this.expectedDurationSeconds = clonedTimer.currentDurationSeconds;
        for (const clonedEv of clonedTimer.events) {
            const ev = this.events.find(ev => ev.name === clonedEv.name)!;
            ev.expectedStartTimeSeconds = clonedEv.startTimeSeconds!;
            ev.expectedCompletedTimeSeconds = clonedEv.completedDurationSeconds!;
        }
    }

    reset() {
        this.state = EventState.PENDING;
        this.currentDurationSeconds = 0;
        for (const e of this.events) {
            e.reset();
        }
    }

    currentDurationToString(): string {
        if (!this.currentDurationSeconds) {
            return '';
        }
        return formatSeconds(this.currentDurationSeconds);
    }

    expectedDurationToString(): string {
        if (!this.expectedDurationSeconds) {
            return '';
        }
        return formatSeconds(this.expectedDurationSeconds);
    }
}

export class EventInstance {
    name: string = "";
    description: string = "";
    state: EventState = EventState.PENDING;

    /** The number of seconds this event will last. */
    durationSeconds: number = 0;

    /** The current number of seconds this event has been running for. */
    currentDurationSeconds: number = 0;
    startTimeSeconds?: number = 0;
    completedDurationSeconds?: number;
    dependencies: EventInstance[] = [];
    dependents: EventInstance[] = [];
    startDelaySeconds: number = 0;
    elapsedStartDelaySeconds: number = 0;

    expectedStartTimeSeconds: number = 0;
    expectedCompletedTimeSeconds: number = 0;

    static fromEventJson(eventJson: EventJson): EventInstance {
        const event = new EventInstance();
        event.name = eventJson.name;
        if (!this.name) {
            throw new Error("Events must have a name.");
        }
        event.description = eventJson.description ?? "";
        event.durationSeconds = parseDuration(eventJson.duration);
        event.startDelaySeconds = parseDuration(eventJson.startDelay);
        return event;
    }

    addDependency(event: EventInstance) {
        this.dependencies.push(event);
    }

    addDependent(event: EventInstance) {
        this.dependents.push(event);
    }

    extendBySeconds(seconds: number) {
        if (seconds <= 0) {
            return;
        }

        this.durationSeconds += seconds;
        if (this.state === EventState.COMPLETED) {
            this.state = EventState.IN_PROGRESS;
        }
    }

    reduceBySeconds(seconds: number) {
        if (seconds <= 0) {
            return;
        }

        this.durationSeconds -= seconds;
        if (this.durationSeconds <= this.currentDurationSeconds) {
            this.durationSeconds = this.currentDurationSeconds;
            this.completed(this.currentDurationSeconds);
        }
    }

    /**
     * Gets the remaining seconds in this event.
     * 
     * This function is not aware of upstream tasks and should not be used to
     * calculate the time taken to get to this task.
     */
    remainingSeconds(): number {
        return this.durationSeconds - this.currentDurationSeconds;
    }

    remainingToString(): string {
        if (this.state === EventState.COMPLETED) {
            return "Completed";

        }
        if (this.state === EventState.PENDING) {
            return "Not yet started";
        }

        const seconds = this.remainingSeconds();
        return formatSeconds(seconds);
    }

    durationToString(): string {
        return formatSeconds(this.durationSeconds);
    }

    completedToString(): string {
        if (!this.completedDurationSeconds) {
            return '';
        }
        return formatSeconds(this.completedDurationSeconds);
    }

    /**
     * Pauses or resumes task. Does nothing if the task is pending or completed.
     */
    togglePause() {
        if (this.state === EventState.PAUSED) {
            this.state = EventState.IN_PROGRESS;
        }
        else if (this.state === EventState.IN_PROGRESS) {
            this.state = EventState.PAUSED;
        }
    }

    reset() {
        this.state = EventState.PENDING;
        this.startTimeSeconds = undefined;
        this.completedDurationSeconds = undefined;
        this.currentDurationSeconds = 0;
        this.elapsedStartDelaySeconds = 0;
    }

    start(timerDurationSeconds: number) {
        this.state = EventState.IN_PROGRESS;
        this.startTimeSeconds = timerDurationSeconds;
    }

    completed(timerDurationSeconds: number) {
        this.state = EventState.COMPLETED;
        this.completedDurationSeconds = timerDurationSeconds;
    }

    toString() {
        const res =
            `${this.name}
    ${this.description}
    Dependencies:
    ${this.dependencies.map(d => `    ${d.name}`).join("\n")}
    Dependents:
    ${this.dependents.map(d => `    ${d.name}`).join("\n")}
    Current progress: ${this.currentDurationSeconds} seconds
    Duration: ${this.durationSeconds} seconds
    Start delay: ${this.startDelaySeconds} seconds
`;
        return res;
    }
}

function formatSeconds(seconds: number): string {
    if (seconds > 60 * 60) {
        const hours = Math.floor(seconds / (60 * 60));
        const minutes = Math.floor((seconds % (60 * 60)) / 60);
        const hourPlural = hours !== 1 ? 's' : '';
        const minutesPlural = minutes !== 1 ? 's' : '';
        return `${hours} hour${hourPlural}${minutes !== 0 ? `, ${minutes} minute${minutesPlural}` : ``}`;
    }
    if (seconds > 60) {
        const minutes = Math.floor(seconds / 60);
        const secondsPart = Math.floor(seconds % 60);
        const minutesPlural = minutes !== 1 ? 's' : '';
        const secondPlural = secondsPart !== 1 ? 's' : '';
        return `${minutes} minute${minutesPlural}${secondsPart !== 0 ? `, ${secondsPart} second${secondPlural}` : ``}`;
    }
    const secondPlural = seconds === 1 ? 's' : '';
    return `${seconds} second${secondPlural}`;
}

function parseDuration(duration?: string): number {

    if (!duration) {
        return 0;
    }

    let cleanedDuration = duration;
    const isMinus = duration.startsWith("-");
    if (isMinus) {
        cleanedDuration = duration.substring(1, duration.length);
    }

    const multi = [
        1, // seconds
        60, // minutes,
        60 * 60, // hour
        24 * 60 * 60 // days
    ];

    const timeParts = cleanedDuration.split(':').reverse();
    if (timeParts.length > multi.length) {
        throw new Error(`Unknown duration format, ${duration}`)
    }
    let seconds = 0;
    for (let i = 0; i < timeParts.length; i++) {

        const numberPart = parseInt(timeParts[i], 10);
        if (isNaN(numberPart)) {
            throw new Error(`Cannot parse ${timeParts[i]}.`);
        }
        if (numberPart < 0) {
            throw new Error(`Internal duration segments cannot be negative (${timeParts[i]}).`);
        }

        seconds += numberPart * multi[i];
    }

    if (isMinus) {
        seconds *= -1;
    }
    return seconds;
}

export function ConstructEventFromName(name: string): TimerInstance {
    const json = require(`/home/tom/projects/timer/cli/src/timers/${name}.json`);
    return ConstructEvent(json);
}

export function ConstructEvent(timerJson: TimerJson): TimerInstance {

    const eventInstances: Map<string, EventInstance> = new Map();
    for (const eventJson of timerJson.events) {
        const eventInstance = EventInstance.fromEventJson(eventJson);

        if (eventInstances.has(eventInstance.name)) {
            throw new Error(`Event names must be unique, ${eventInstance.name} is duplicated.`);
        }
        eventInstances.set(eventInstance.name, eventInstance);
    }

    // fill dependencies
    for (const eventJson of timerJson.events) {
        if (!eventJson.dependencies || eventJson.dependencies.length === 0) {
            continue;
        }
        const eventInstance = eventInstances.get(eventJson.name);

        for (const dep of eventJson.dependencies) {
            const depEventInstance = eventInstances.get(dep);
            if (!depEventInstance) {
                throw new Error(`Dependency '${dep}' for event '${eventInstance!.name}' could not be found.`);
            }
            eventInstance?.addDependency(depEventInstance);
            depEventInstance?.addDependent(eventInstance!);
        }
    }

    // construct tree
    const rootEvents = toArray(eventInstances.values()).filter(ev => ev.dependencies.length === 0);

    if (rootEvents.length === 0) {
        throw new Error("No events with no dependencies");
    }

    // check for cyclic deps. there has to be a better way to do this, but my graph theory isn't what it should be
    const recurseCheckChildren = (event: EventInstance, checkName: string) => {
        for (const dep of event.dependencies) {
            if (dep.name === checkName || !recurseCheckChildren(dep, checkName)) {
                return false;
            }
        }
        return true;
    }

    for (const event of eventInstances.values()) {
        if (!recurseCheckChildren(event, event.name)) {
            throw new Error(`${event.name} has a cyclic dependency`);
        }
    }
    let instance = TimerInstance.fromEvents(timerJson.name, toArray(eventInstances.values()));
    instance.calculateExpectedTimes();
    return instance;
};

function toArray<T>(values: MapIterator<T>) {
    // javascript is a joke of a language
    if (typeof values.toArray === "function") {
        return values.toArray();
    }
    const arr = [];
    let result = values.next();
    while (!result.done) {
        arr.push(result.value);
        result = values.next();
    }
    return arr;
}
