import { express } from "express";

const app = express();

app.use(express.json());

app.post("/purpexility_ask", async (req, res) => {
  //get the user query
  const userQuery = req.body.query;

  //do web search

  //context engineering (web search + some context)

  //hit the LLM api and stream the response

  //end the stream
});

app.listen(3000);
