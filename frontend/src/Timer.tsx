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
import { useParams } from "react-router-dom";

type RouteParams = {
  timerKey: string;
}

export const Timer = () => {

  // Interval length in milliseconds. Reduce to 10 for much faster debugging.
  const INTERVAL_LENGTH = 1000;

  const params = useParams<RouteParams>();

  const [startSeconds, setStartSeconds] = useState<number>(0);
  const [timer, setTimer] = useState<timerLib.TimerInstance>();
  const [milliseconds, setMilliseconds] = useState(0);
  const [currentActivities, setCurrentActivities] = useState<timerLib.EventInstance[]>([]);
  const [completedActivities, setCompletedActivites] = useState<timerLib.EventInstance[]>([]);
  const [upcomingActivities, setUpcomingActivites] = useState<timerLib.EventInstance[]>([]);

  try {
    if (!timer) {
      if (params.timerKey) {
        const json = timerLib.FetchTimer(params.timerKey);
        setTimer(timerLib.ConstructEvent(json));
        setStartSeconds(Math.floor(Date.now() / 1000));
      }
      else {
        throw new Error("Timer not found");
      }
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
      const completed = timer.events.filter(ev => ev.state === timerLib.EventState.COMPLETED)
        .sort((a, b) => a.completedDurationSeconds! - b.completedDurationSeconds!);
      const inProgress = timer.events.filter(ev => ev.state === timerLib.EventState.IN_PROGRESS || ev.state === timerLib.EventState.PAUSED)
        .sort((a, b) => a.startTimeSeconds! - b.startTimeSeconds!);
      setCompletedActivites(completed);
      setCurrentActivities(inProgress);

      const upcoming = timer.events.filter(ev => ev.state === timerLib.EventState.PENDING || ev.state === timerLib.EventState.WAITING)
        .sort((a, b) => a.expectedStartTimeSeconds - b.expectedStartTimeSeconds);
      setUpcomingActivites(upcoming);
    }
    else {
      setCurrentActivities([]);
    }
  }

  function formatTime(seconds: number): string {
    const date = new Date(seconds * 1000);
    return date.toLocaleTimeString();
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
        <Text color={"gray"}>Expected duration is {timer?.expectedDurationToString()}</Text>
        {timer?.state === timerLib.EventState.COMPLETED ? <Text>Completed in {timer.currentDurationToString()}</Text> : <></>}
        <Card w={"lg"}>
          <CardHeader>
            <Heading>
              Active Tasks
            </Heading>
          </CardHeader>
          <CardBody>
            <Accordion w={"100%"} bgColor={"white"} allowMultiple={true}>
              {currentActivities.map(currentActivity => {
                return (<AccordionItem key={currentActivity.name} textAlign={"left"}>
                  <AccordionButton>
                    <Box as='span' flex='1' textAlign='left'>
                      <Heading size={"md"}>{formatTitle(currentActivity.name)}</Heading>
                      <Text>{currentActivity.remainingToString()} remaining{currentActivity.state === timerLib.EventState.PAUSED ? ' - This task is paused' : ''}</Text>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel>
                    <Stack divider={<StackDivider />} spacing='4'>
                      <Box textAlign={"justify"} fontSize={"md"}>
                        <Text color={'gray'}>Total duration: {currentActivity.durationToString()}</Text>
                        <Button size={"sm"} w={"8em"} onClick={() => { currentActivity.togglePause(); timer?.calculateExpectedTimes(); }}>
                          {currentActivity.state === timerLib.EventState.PAUSED ? 'Resume' : 'Pause'}
                        </Button>
                      </Box>
                      <Box>
                        <Text whiteSpace={"pre-line"}>{currentActivity.description}</Text>
                      </Box>
                      <Box textAlign={"justify"} fontSize={"md"}>
                        <Text>Extend time by...</Text>
                        <HStack spacing={2}>
                          {extendDurationInfo(currentActivity.durationSeconds).map(info => {
                            return (<Button key={info.seconds} size={"sm"} w={"8em"} onClick={() => { currentActivity.extendBySeconds(info.seconds); timer?.calculateExpectedTimes(); }}>
                              {info.text}
                            </Button>)
                          })}
                        </HStack>
                      </Box>
                      <Box textAlign={"justify"} fontSize={"md"}>
                        <Text>Reduce time by...</Text>
                        <HStack spacing={2} paddingBottom={2}>
                          {extendDurationInfo(currentActivity.durationSeconds).map(info => {
                            return (<Button key={info.seconds} size={"sm"} w={"8em"} onClick={() => { currentActivity.reduceBySeconds(info.seconds); timer?.calculateExpectedTimes(); }}>
                              {info.text}
                            </Button>)
                          })}
                        </HStack>
                        <Button key="skip" size={"sm"} w={"8em"} onClick={() => currentActivity.completed(currentActivity.currentDurationSeconds)}>
                          End now
                        </Button>
                      </Box>
                    </Stack>
                  </AccordionPanel>
                </AccordionItem>
                )
              })}
            </Accordion>
          </CardBody>
        </Card>

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
                    <Text color={"gray"} fontSize={"md"}>Scheduled start time is {formatTime(activity.expectedStartTimeSeconds + startSeconds!)}</Text>
                    <Text color={"gray"} fontSize={"md"}>Duration is {activity.durationToString()}</Text>
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
                    <Text color={"gray"} fontSize={"md"}>Completed at {formatTime(completedActivity.completedDurationSeconds! + startSeconds)}</Text>
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
