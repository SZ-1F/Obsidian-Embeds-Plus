import { Logger } from "tslog";
import { EP_LOG_LEVEL } from "./Constants";

// Initialise the root instance of tslog.
export let RootLog = new Logger({
  name: 'Embeds+',
  minLevel: EP_LOG_LEVEL,
});