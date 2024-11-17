import {
    Box,
    VStack,
    Heading,
    Card,
    CardBody,
} from "@chakra-ui/react";
import * as timerLib from "./timerLib";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

type RouteParams = {
    timerKey: string;
}

export const TimerList = () => {

    const INTERVAL_LENGTH = 10;

    const params = useParams<RouteParams>();

    const [timerKeys, setTimerKeys] = useState<string[]>();
    useEffect(() => {

        setTimerKeys(timerLib.FetchTimerKeys());
    });

    function formatTitle(title: string): string {
        if (!title) {
            return "";
        }

        const cleaned = title.replaceAll("-", " ").replaceAll("_", " ");
        return `${cleaned[0].toUpperCase()}${cleaned.substring(1)}`;
    }

    return (
        <Box textAlign="center">
            <VStack spacing={8}>
                <Heading>Activity Timers</Heading>
                <Card>
                    <CardBody>
                        <VStack spacing={8}>
                            {timerKeys?.map(timerKey =>
                                <Box>
                                    <Link to={`/timer/${timerKey}`}>{formatTitle(timerKey)}</Link>
                                </Box>
                            )}
                        </VStack>
                    </CardBody>
                </Card>
            </VStack>
        </Box>
    );
}
