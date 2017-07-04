require("dotenv").config();
var express = require("express");
const bodyParser = require("body-parser");
var app = express();
app.use(bodyParser.urlencoded({extended: true}));

var PORT = process.env.MY_PORT || 8080;

app.set("view engine", "ejs");

var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
}

function generateRandomString(length) {
  const legalCharacters = "0123456789ABCDEFGHIJKLMNOPRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let output = "";

  for (var i = 0; i < length; i++) {
    output += legalCharacters[Math.floor(Math.random() * legalCharacters.length)]
  }

  return output;
}

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/u/:shortURL", (req, res) => {

  if (!(req.params.shortURL in urlDatabase)) {
    console.log("404'd!");
    res.render("error-404");
  }

  else {
    let longURL = urlDatabase[req.params.shortURL];
    res.redirect(longURL);
  }
});

app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase };
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  let shortCode = generateRandomString(6);
  urlDatabase[shortCode] = req.body.longURL;
  console.log(req.body.longURL, " --> ", shortCode);
  res.redirect("/urls/" + shortCode);
});

app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

app.get("/urls/:id", (req, res) => {
  let templateVars = { urls: urlDatabase, shortURL: req.params.id };
  res.render("urls_show", templateVars);
})

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.end("<html><body>HEllo <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});