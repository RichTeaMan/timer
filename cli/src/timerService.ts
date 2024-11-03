interface TimerJson {
    name: string,
    events: EventJson[]
}

interface EventJson {
    name: string,
    description: string,
    duration: string,
    dependencies: string[],
    startDelay: string
}

enum EventState {
    PENDING,
    IN_PROGRESS,
    COMPLETED
}


class TimerInstance {
    name: string;
    events: EventInstance[];
    currentDurationSeconds: number = 0;
    state: EventState = EventState.PENDING;

    constructor(name: string, events: EventInstance[]) {
        this.name = name;
        this.events = events;
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
            const inProgressEvents = this.events.filter(ev => ev.state === EventState.IN_PROGRESS);

            for (const event of inProgressEvents) {
                event.currentDurationSeconds++;
                if (event.currentDurationSeconds >= event.durationSeconds) {
                    checkCompleted = true;
                    event.completed(this.currentDurationSeconds);
                }
            }
            for (const ev of this.events.filter(ev => ev.state === EventState.PENDING)) {
                if (ev.dependencies.filter(d => d.state === EventState.COMPLETED).length === ev.dependencies.length) {
                    if (ev.startDelaySeconds <= 0) {
                        ev.state = EventState.IN_PROGRESS;
                    }
                    else {
                        // postive delay, find longest running dep and add wait time
                        const taskFinishedTime = ev.dependencies.map(d => d.completedDurationSeconds!).sort((a, b) => b - a)[0];
                        if (this.currentDurationSeconds >= taskFinishedTime + ev.startDelaySeconds) {
                            ev.state = EventState.IN_PROGRESS;
                        }
                    }
                }
            }
            if (checkCompleted) {
                const completed = this.events.filter(ev => ev.state === EventState.COMPLETED);
                if (completed.length === this.events.length) {
                    this.state = EventState.COMPLETED;
                }
            }
        }
    }
}

class EventInstance {
    name: string;
    description: string;
    state: EventState = EventState.PENDING;
    durationSeconds: number;
    currentDurationSeconds: number = 0;
    completedDurationSeconds?: number;
    dependencies: EventInstance[] = [];
    dependents: EventInstance[] = [];
    startDelaySeconds: number;

    constructor(eventJson: EventJson) {
        this.name = eventJson.name;
        if (!this.name) {
            throw new Error("Events must have a name.");
        }
        this.description = eventJson.description ?? "";
        this.durationSeconds = parseDuration(eventJson.duration);
        this.startDelaySeconds = parseDuration(eventJson.startDelay);
    }

    addDependency(event: EventInstance) {
        this.dependencies.push(event);
    }

    addDependent(event: EventInstance) {
        this.dependents.push(event);
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

export function ConstructEvent(timerJson: TimerJson): TimerInstance {

    const eventInstances: Map<string, EventInstance> = new Map();
    for (const eventJson of timerJson.events) {
        const eventInstance = new EventInstance(eventJson);

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
    console.log(eventInstances.values());
    const rootEvents = eventInstances.values().filter(ev => ev.dependencies.length === 0).toArray();

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
    return new TimerInstance(timerJson.name, eventInstances.values().toArray());
};

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const json = require("/home/tom/projects/timer/cli/src/timers/christmas-dinner.json");
    const timer = ConstructEvent(json);
    console.log(`Timer: ${timer.name}`);
    for (const event of timer.events) {
        console.log(event.toString());
    }

    console.log("Running task...");

    while (timer.state !== EventState.COMPLETED) {

        //await delay(1000);
        await delay(10);
        console.clear();
        timer.progress();
        const completed = timer.events.filter(ev => ev.state === EventState.COMPLETED);
        const inProgress = timer.events.filter(ev => ev.state === EventState.IN_PROGRESS);
        //console.log("--------");
        console.log(`${timer.name} - ${timer.currentDurationSeconds} seconds`);
        console.log("Completed:");
        if (completed.length === 0) {
            console.log("    None");
        }
        else {
            for (const ev of completed) {
                console.log(`    ${ev.name}`);
            }
        }

        console.log();
        console.log(`In progress (${inProgress.length}):`)
        console.log();
        for (const ev of inProgress) {
            console.log(ev.toString());
            console.log("###");
            console.log();
        }


    }
    console.log(`${timer.name} completed in ${timer.currentDurationSeconds} seconds.`)
}

main().catch(e => { console.error(e) });