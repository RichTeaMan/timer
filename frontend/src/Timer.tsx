import * as React from "react"
import {
  ChakraProvider,
  Box,
  Text,
  Link,
  VStack,
  Code,
  Grid,
  theme,
  Heading,
} from "@chakra-ui/react"
import { ColorModeSwitcher } from "./ColorModeSwitcher"
import { Logo } from "./Logo"
import * as timerLib from "./timerLib";
import { useEffect, useState } from "react";

export const Timer = () => {

  const INTERVAL_LENGTH = 10;
  
  const [timer, setTimer] = useState<timerLib.TimerInstance>();
  const [milliseconds, setMilliseconds] = useState(0);
  const [currentActivities, setCurrentActivities] = useState<timerLib.EventInstance[]>([]);
  const [completedActivities, setCompletedActivites] = useState<timerLib.EventInstance[]>([]);
  const [timerDurationSeconds, setTimerDurationSeconds] = useState<number>(0);

  try {
    if (!timer) {
      const json = timerLib.FetchChristmasDinner();
      setTimer(timerLib.ConstructEvent(json));
    }
  }
  catch(e) {
    console.error(e);
  }
  useEffect(() => {
    if (timer) {
      const intervalTimer = setInterval(async () => { await timerTick(); setMilliseconds(milliseconds + INTERVAL_LENGTH); }, INTERVAL_LENGTH);
      return () => clearInterval(intervalTimer);
    }
  });


  async function timerTick() {
    if (!timer) {
      return;
    }

    if (timer.state !== timerLib.EventState.COMPLETED) {

      timer.progress();
      const completed = timer.events.filter(ev => ev.state === timerLib.EventState.COMPLETED);
      const inProgress = timer.events.filter(ev => ev.state === timerLib.EventState.IN_PROGRESS);
      setCompletedActivites(completed);
      setCurrentActivities(inProgress);
    }
    else {
      setCurrentActivities([]);
    }
    setTimerDurationSeconds(timer.currentDurationSeconds);
  }

  return (
    <Box textAlign="center" fontSize="xl">
      <VStack spacing={8}>
        <Heading>Dinner Timer!</Heading>
        <Text>{timerDurationSeconds} seconds</Text>
        {currentActivities.map(currentActivity => {
          return(<Box>
            <Heading>{currentActivity.name}</Heading>
            <Text>{currentActivity.currentDurationSeconds} seconds</Text>
            <Text>{currentActivity.description}</Text>
          </Box>)
        })}
        <Heading size={"md"}>Completed</Heading>
        {completedActivities.map(completedActivity => {
          return(<Box>
            <Heading size={"sm"}>{completedActivity.name}</Heading>
          </Box>)
        })}
      </VStack>
    </Box>
  );
}
