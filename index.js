const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@foodiebay-production.ei6y0sl.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    console.log("MongoDB database connected");
    const sampleCollection = client.db("sample_guides").collection("planets");

    app.get("/sample", async (req, res) => {
      const query = {};
      const cursor = sampleCollection.find(query);
      const sampleData = await cursor.toArray();
      res.send(sampleData);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to Foodiebay Server");
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
