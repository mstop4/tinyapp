
// Requires
require("dotenv").config();
var express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

// Init app
var app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.set("view engine", "ejs");

// Data
var PORT = process.env.MY_PORT || 8080;
const COOKIE_NAME = "localuser@tinyapp";

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

// Fetches the username from the cookie, or returns "Guest" if it doesn't exist
function getUsername(cookies) {

  // No cookies found
  if (Object.keys(cookies).length === 0) {
    return "Guest";

  // Cookie found AND username found
  } else if (Object.keys(cookies[COOKIE_NAME]).indexOf("username") !== -1) {
    return cookies[COOKIE_NAME]["username"];

  // Cookie found BUT username not found
  } else {
    return "Guest";
  }
}

// Home Page
// ---------

// GET root - home page
app.get("/", (req, res) => {
  console.log(req.cookies);
  let templateVars = { username: getUsername(req.cookies) };
  res.status(200).render("index", templateVars);
});

// Logins
// ------

// POST /login - log into the service
app.post("/login", (req, res) => {

  let user = req.body.username;
  res.cookie(COOKIE_NAME, { username: user });
  console.log("Logged in as:", user);
  res.status(302).redirect("/urls");
});

// GET /login - this shouldn't happen
app.get("/login", (req, res) => {
  res.status(403).send("Forbidden");
});

// POST /logout - log out of the service
app.post("/logout", (req, res) => {

  res.clearCookie(COOKIE_NAME);
  res.status(302).redirect("/urls");
});

// GET /logout - this shouldn't happen
app.get("/logout", (req, res) => {
  res.status(403).send("Forbidden");
});

// Shortlink redirection
// ---------------------

// GET /u/:id - redirect to full URL
app.get("/u/:shortURL", (req, res) => {

  var urlKeys = Object.keys(urlDatabase);

  if (urlKeys.indexOf(req.params.shortURL) === -1) {
    console.log("404'd!");
    let templateVars = { username: getUsername(req.cookies) };
    res.status(404).render("error_404", templateVars);
  }

  else {
    let longURL = urlDatabase[req.params.shortURL];
    res.status(302).redirect(longURL);
  }
});

// GET /urls - shows a list of all URLs
app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase, username: getUsername(req.cookies) };
  res.status(200).render("urls_index", templateVars);
});

// POST /urls - submit a new URL
app.post("/urls", (req, res) => {
  let shortCode = generateRandomString(6);
  urlDatabase[shortCode] = req.body.longURL;
  console.log(req.body.longURL, " --> ", shortCode);
  res.status(302).redirect("/urls/" + shortCode);
});

// GET /urls/new - shows URL submission form
app.get("/urls/new", (req, res) => {
  let templateVars = { username: getUsername(req.cookies) };
  res.status(200).render("urls_new", templateVars);
});

// POST /urls/:id/delete - deletes a URL
app.post("/urls/:id/delete", (req, res) => {
  console.log("Delete", req.params.id);
  delete urlDatabase[req.params.id];
  res.status(302).redirect("/urls");
});

// POST /urls/:id/update - updates a URL
app.post("/urls/:id/update", (req, res) => {
  console.log("Update", req.params.id);
  urlDatabase[req.params.id] = req.body.longURL;
  res.status(302).redirect("/urls");
});

// GET /urls/:id - shows the URL and its shortlink
app.get("/urls/:id", (req, res) => {
  let templateVars = { longURL: urlDatabase[req.params.id], shortURL: req.params.id, username: getUsername(req.cookies) };
  res.status(200).render("urls_show", templateVars);
})

// GET /urls.json - shows URL database in JSON format
app.get("/urls.json", (req, res) => {
  let templateVars = { username: getUsername(req.cookies) };
  res.status(200).json(urlDatabase, templateVars);
});

// GET /teapot - easter egg
app.get("/teapot", (req, res) => {
    let templateVars = { username: getUsername(req.cookies) };
    console.log("Teapot easter egg");
    res.status(418).render("im_a_teapot", templateVars);
});

// Start server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});