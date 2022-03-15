require("dotenv").config();
const express = require("express");
const routes = require("./routes/index.router");
const cors = require("cors");
const port = 3000;

const app = express();

var corsOptions = {
  origin: "*",
  methods: "GET, POST",
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Parse application/json
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

routes(app);

app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!");
});

async function connectApp() {
  try {
    app.listen(3000, async () => {
      console.log(`Listening on port ${port}`);
    });
  } catch (error) {
    console.error("Unable to connect to the server:", error);
  }
}

connectApp();
