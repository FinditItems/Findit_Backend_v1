import app from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`[service] running on port ${env.PORT}`);
});