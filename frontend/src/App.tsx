import {
  ChakraProvider,
  Box,
  Grid,
  theme,
} from "@chakra-ui/react"
import { Timer } from "./Timer";

export const App = () => (
  <ChakraProvider theme={theme}>
    <Box textAlign="center" fontSize="xl" bgColor={"blue.100"}>
      <Grid minH="100vh" p={3}>
        <Timer />
      </Grid>
    </Box>
  </ChakraProvider>
)