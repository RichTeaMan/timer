# Event timer

An awful visualisation of a set of timers. This project was invented to over-engineer a Christmas dinner,
but would be used to over-engineer any number of other mundane tasks.

An event is a number of timers that define a name, a duration, and a set of dependencies of other timers.
A timer may proceed when its dependencies are completed, and the entire event is completed when all timers
have elaspsed.

## Getting started

The main event tiemr interface is a single page web application. To run:

```bash
cd frontend
npm install
npm start
```

The application will be accessible from `http://localhost:4173`.

To get to the application from any device on the local network, use `npm start -- --host`.

## Project overview

The project has 3 parts,

* `cli`
    * A console application for displaying an event timer.
* `frontend`
    * A React SPA for displaying an event timer.
* `timer-lib`
    * A shared library for running timers.

## Event timer definition

Event timers are defined in JSON. Currently there is no intreface to create one. Examples can be found in
`timer-lib/src/timers/`.

The root object is the event timer and has the name and an array to sub events. These sub events are the timers:

```json
{
    "name": "cook-beef",
    "description": "A top rump joint takes 20 minutes per 500g at 220°C. It should rest for 35 minutes with foil.",
    "duration": "0:40:00",
    "dependencies": [
        "preheat"
    ],
    "startDelay": "00:00:00,"
}
```

Times are specified in `hh:mm:ss` (hours:minutes:seconds) format.

It is important to note that the order of timers are not important, instead the order of timers will be calculated
from the dependencies. A timer cannot start until all dependencies are completed. Cyclic dependencies are not
supported, and an event timer is expected to have at least one task with no dependencies.

Multiple timers may execute independently, if this isn't desired the dependencies should be adjusted so they are
linear.

Start delay is an amount of time to wait to start the task as soon as dependencies have been met. This can be
useful to syncronise tasks to complete at a particular time.

## Adding a new event to frontend

The web app frontend requires references to all timers. This is found in the variable `TIMER_MAP`, defined in
`frontend/src/timerLib.ts`.

