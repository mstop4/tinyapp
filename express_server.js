
// Requires
require("dotenv").config();
var express = require("express");
const bodyParser = require("body-parser");

// Init app
var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

// Data
var PORT = process.env.MY_PORT || 8080;
var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com",
  "teapot": "http://www.google.com/teapot"
}

// Generates a random string of a certain length using alphanumeric characters
function generateRandomString(length) {
  const legalCharacters = "0123456789ABCDEFGHIJKLMNOPRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let output = "";

  for (var i = 0; i < length; i++) {
    output += legalCharacters[Math.floor(Math.random() * legalCharacters.length)]
  }

  return output;
}

// GET root - home page
app.get("/", (req, res) => {
  res.render("index");
});

// GET /u/:id - redirect to full URL
app.get("/u/:shortURL", (req, res) => {

  var urlKeys = Object.keys(urlDatabase);
  console.log(req.params.shortURL);
  console.log(urlKeys);

  if (urlKeys.indexOf(req.params.shortURL) === -1) {
    console.log("404'd!");
    res.status(404).render("error_404");
  }

  else {
    let longURL = urlDatabase[req.params.shortURL];
    res.redirect(longURL);
  }
});

// GET /urls - shows a list of all URLs
app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase };
  res.render("urls_index", templateVars);
});

// POST /urls - submit a new URL
app.post("/urls", (req, res) => {
  let shortCode = generateRandomString(6);
  urlDatabase[shortCode] = req.body.longURL;
  console.log(req.body.longURL, " --> ", shortCode);
  res.redirect("/urls/" + shortCode);
});

// GET /urls/new - shows URL submission form
app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

// POST /urls/:id/delete - deletes a URL
app.post("/urls/:id/delete", (req, res) => {
  console.log("Delete", req.params.id);
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

// POST /urls/:id/update - updates a URL
app.post("/urls/:id/update", (req, res) => {
  console.log("Update", req.params.id);
  urlDatabase[req.params.id] = req.body.longURL;
  res.redirect("/urls");
});

// GET /urls/:id - shows the URL and its shortlink
app.get("/urls/:id", (req, res) => {
  let templateVars = { urls: urlDatabase, shortURL: req.params.id };
  res.render("urls_show", templateVars);
})

// GET /urls.json - shows URL database in JSON format
app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// GET /teapot - easter egg
app.get("/teapot", (req, res) => {
    console.log("Teapot easter egg");
    res.status(418).render("im_a_teapot");
});

// Start server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});