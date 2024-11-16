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
  Card,
  CardBody,
  CardHeader,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
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
  catch (e) {
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
    <Box textAlign="center">
      <VStack spacing={8}>
        <Heading>{timer?.name}</Heading>
        {timer?.state === timerLib.EventState.COMPLETED ? <Text>Completed in {timer.currentDurationToString()}</Text> : <></>}
        {currentActivities.map(currentActivity => {
          return (<Card key={currentActivity.name} w={"lg"}>
            <CardHeader>
              <Heading>{currentActivity.name}</Heading>
            </CardHeader>
            <CardBody>
              <Text>{currentActivity.description}</Text>
              <Text>{currentActivity.remainingToString()} remaining</Text>
              <Text color={'gray'}>Total duration: {currentActivity.durationToString()}</Text>
            </CardBody>
          </Card>)
        })}

        <Card w={"lg"}>
          <CardHeader>
            <Heading size={"md"}>Completed Tasks</Heading>
          </CardHeader>
          <CardBody>
            <Accordion w={"100%"} bgColor={"white"} allowMultiple={true}>
              {completedActivities.map(completedActivity => {
                return (<AccordionItem key={completedActivity.name} textAlign={"left"}>
                  <AccordionButton>
                    <Box as='span' flex='1' textAlign='left'>
                      <Heading size={"sm"}>{completedActivity.name}</Heading>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel>
                    <Text color={"gray"}>Completed in {completedActivity.completedToString()}</Text>
                    <Text>{completedActivity.description}</Text>
                  </AccordionPanel>
                </AccordionItem>)
              })}
            </Accordion>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
