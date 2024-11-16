import { ConstructEvent, EventState, FetchChristmasDinner } from "./timerLib";

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const json = FetchChristmasDinner();
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
