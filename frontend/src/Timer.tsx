import {
  Box,
  Text,
  VStack,
  Heading,
  Card,
  CardBody,
  CardHeader,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  HStack,
  Button,
  Stack,
  StackDivider,
} from "@chakra-ui/react";
import * as timerLib from "./timerLib";
import { useEffect, useState } from "react";

export const Timer = () => {

  const INTERVAL_LENGTH = 10;

  const [timer, setTimer] = useState<timerLib.TimerInstance>();
  const [milliseconds, setMilliseconds] = useState(0);
  const [currentActivities, setCurrentActivities] = useState<timerLib.EventInstance[]>([]);
  const [completedActivities, setCompletedActivites] = useState<timerLib.EventInstance[]>([]);
  const [upcomingActivities, setUpcomingActivites] = useState<timerLib.EventInstance[]>([]);

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

      const upcoming = [... new Set(inProgress.flatMap(a => a.dependents))];
      setUpcomingActivites(upcoming);
    }
    else {
      setCurrentActivities([]);
    }
  }

  function formatTitle(title: string): string {
    if (!title) {
      return "";
    }

    const cleaned = title.replaceAll("-", " ").replaceAll("_", " ");
    return `${cleaned[0].toUpperCase()}${cleaned.substring(1)}`;
  }

  function extendDurationInfo(seconds: number) {
    const info = [];
    if (seconds > 60 * 60) {
      info.push({ text: "1 hour", seconds: 60 * 60 });
    }
    if (seconds > 30 * 60) {
      info.push({ text: "30 minutes", seconds: 30 * 60 });
    }
    if (seconds > 10 * 60) {
      info.push({ text: "5 minutes", seconds: 5 * 60 });
    }
    info.push({ text: "1 minute", seconds: 60 });
    return info;
  }

  return (
    <Box textAlign="center">
      <VStack spacing={8}>
        <Heading>{timer?.name}</Heading>
        {timer?.state === timerLib.EventState.COMPLETED ? <Text>Completed in {timer.currentDurationToString()}</Text> : <></>}
        {currentActivities.map(currentActivity => {
          return (<Card key={currentActivity.name} w={"lg"}>
            <CardHeader>
              <Heading>{formatTitle(currentActivity.name)}</Heading>
            </CardHeader>
            <CardBody>

              <Stack divider={<StackDivider />} spacing='4'>
                <Box>
                  <Text>{currentActivity.description}</Text>
                </Box>
                <Box>
                  <Text>{currentActivity.remainingToString()} remaining</Text>
                  <Text color={'gray'}>Total duration: {currentActivity.durationToString()}</Text>
                </Box>
                <Box textAlign={"justify"} fontSize={"md"}>
                  <Text>Extend time by...</Text>
                  <HStack spacing={2}>
                    {extendDurationInfo(currentActivity.durationSeconds).map(info => {
                      return (<Button key={info.seconds} size={"sm"} w={"8em"} onClick={() => currentActivity.extendBySeconds(info.seconds)}>
                        {info.text}
                      </Button>)
                    })}
                  </HStack>
                </Box>
                <Box textAlign={"justify"} fontSize={"md"}>
                  <Text>Reduce time by...</Text>
                  <HStack spacing={2} paddingBottom={2}>
                    {extendDurationInfo(currentActivity.durationSeconds).map(info => {
                      return (<Button key={info.seconds} size={"sm"} w={"8em"} onClick={() => currentActivity.reduceBySeconds(info.seconds)}>
                        {info.text}
                      </Button>)
                    })}
                  </HStack>
                  <Button key="skip" size={"sm"} w={"8em"} onClick={() => currentActivity.completed(currentActivity.currentDurationSeconds)}>
                    End now
                  </Button>
                </Box>
              </Stack>
            </CardBody>
          </Card>)
        })}

        <Card w={"lg"}>
          <CardHeader>
            <Heading size={"md"}>Upcoming Tasks</Heading>
          </CardHeader>
          <CardBody>
            <Accordion w={"100%"} bgColor={"white"} allowMultiple={true}>
              {upcomingActivities.map(activity => {
                return (<AccordionItem key={activity.name} textAlign={"left"}>
                  <AccordionButton>
                    <Box as='span' flex='1' textAlign='left'>
                      <Heading size={"sm"}>{formatTitle(activity.name)}</Heading>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel>
                    <Text color={"gray"}>Expected duration is {activity.durationToString()}</Text>
                    <Text>{activity.description}</Text>
                  </AccordionPanel>
                </AccordionItem>)
              })}
            </Accordion>
          </CardBody>
        </Card>

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
                      <Heading size={"sm"}>{formatTitle(completedActivity.name)}</Heading>
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
