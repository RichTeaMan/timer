import {
  ChakraProvider,
  Box,
  Grid,
  theme,
} from "@chakra-ui/react"
import { Timer } from "./Timer";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { TimerList } from "./TimerList";

const router = createBrowserRouter([
  {
    path: "/",
    element: <TimerList />,
  },
  {
    path: "/timer/:timerKey",
    element: <Timer />
  }
]);


export const App = () => (
  <ChakraProvider theme={theme}>
    <Box textAlign="center" fontSize="xl" bgColor={"blue.100"}>
      <Grid minH="100vh" p={3}>
        <RouterProvider router={router} />
      </Grid>
    </Box>
  </ChakraProvider>
)
