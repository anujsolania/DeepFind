import { express } from "express";
import { tavily } from "@tavily/core";
import { PROMPT_TEMPLATE } from "./prompt";
import { Output, streamText } from "ai";
import z, { url } from "zod";

const client = tavily({ apiKey: process.env.AVILY_API_KEY });

const app = express();

app.use(express.json());

app.post("/purpexility_ask", async (req, res) => {
  //get the user query
  const userQuery = req.body.query;

  //do web search
  const webSearchResponse = await client.search(userQuery, {
    searchDepth: "advanced",
  });

  const webSearchResults = webSearchResponse.results;

  //context engineering (web search + some context)
  const PROMPT = PROMPT_TEMPLATE.replace(
    "{{WEB_SEARCH_RESULTS}}",
    JSON.stringify(webSearchResults)
  ).replace("{{USER_QUERY}}", userQuery);

  //hit the LLM api and stream the response
  const result = streamText({
    model: "openai/gpt-5.4",
    prompt: PROMPT,
    output: Output.object({
      schema: z.object({
        followUps: z.array(z.string()),
        answers: z.string(),
      }),
    }),
  });

  //required headers
  res.header("Cache-Control", "no-cache");
  res.header("Content-Type", "text/event-stream");

  for await (const textPart of result.textStream) {
    res.write(textPart);
  }

  //stream back the responses
  res.write("<SOURCES>");

  res.write(
    JSON.stringify(webSearchResults.map((result) => ({ url: result.url })))
  );

  res.write("</SOURCES>");

  //end the stream
});

app.listen(3000);
