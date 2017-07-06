
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

var users = {
  "aaaaaa": {
    id: "aaaaaa",
    email: "kingroland@druidia.net",
    password: "12345"
  },

  "bbbbbb": {
    id: "bbbbbb",
    email: "presidentskroob@spaceballone.com",
    password: "12345"
  },

  "cccccc": {
    id: "cccccc",
    email: "BLU_Soldier@blu.blu",
    password: "1111"
  },

  "dddddd": {
    id: "dddddd",
    email: "bender@ilovebender.com",
    password: "antiquing"
  }
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

// Fetches the user from the cookie, or returns undefined if it doesn't exist
function getUser(cookies) {

  // No cookies found
  if (Object.keys(cookies).length === 0) {
    return undefined;

  // Cookie found AND username found
  } else if (Object.keys(cookies[COOKIE_NAME]).indexOf("user_id") !== -1) {

    let userID = cookies[COOKIE_NAME]["user_id"];
    return users[userID];

  // Cookie found BUT username not found
  } else {
    return undefined;
  }
}

// Home Page
// ---------

// GET root - home page
app.get("/", (req, res) => {

  let templateVars = { user: getUser(req.cookies) };
  res.status(200).render("index", templateVars);
});

// User Authentication
// -------------------

// POST /login - log into the service
app.post("/login", (req, res) => {

  let email = req.body.email;
  let password = req.body.password;
  let user = undefined;

  // find user in database
  for (i in users) {
    if (users[i]["email"] === email) {
      user = users[i];
      break;
    }
  }

  if (!user) {
    return res.status(403).send("Invalid email or password.");
  }

  // check user password
  if (user["password"] === password) {
    res.cookie(COOKIE_NAME, { user_id: user["id"] });
    console.log("Logged in as:" + user["id"] + " - " + user["email"]);
    return res.status(302).redirect("/");

  } else {
    return res.status(403).send("Invalid email or password.");
  }
});

// GET /login - go to login page
app.get("/login", (req, res) => {
  let templateVars = { user: getUser(req.cookies) };
  res.status(200).render("user_login", templateVars);
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

// POST /register - creates a new account
app.post("/register", (req, res) => {

  let email = req.body.email;
  let password = req.body.password;

  // disallow blank emails and passwords
  if (!email || !password) {
    return res.status(400).send("Invalid email or password!");
  }

  // disallow duplicate emails
  for (user in users) {
    if (users[user]["email"] === email) {
      return res.status(400).send("That email is already registered!");
    }
  }

  // ok
  let randomID = generateRandomString(6);
  users[randomID] = { id: randomID, email: req.body.email, password: req.body.password};
  res.cookie(COOKIE_NAME, { user_id: randomID });

  console.log(req.body.email, req.body.password);

  console.log("Logged in as:" + randomID + " - " + req.body.email);
  res.status(302).redirect("/urls");
});

// GET /register - opens registration page
app.get("/register", (req, res) => {

  let templateVars = { user: getUser(req.cookies) }
  res.status(200).render("user_reg", templateVars);
})

// Shortlink redirection
// ---------------------

// GET /u/:id - redirect to full URL
app.get("/u/:shortURL", (req, res) => {

  var urlKeys = Object.keys(urlDatabase);

  if (urlKeys.indexOf(req.params.shortURL) === -1) {
    console.log("404'd!");
    let templateVars = { user: getUser(req.cookies) };
    res.status(404).render("error_404", templateVars);
  }

  else {
    let longURL = urlDatabase[req.params.shortURL];
    res.status(302).redirect(longURL);
  }
});

// Database query
// --------------

// GET /urls - shows a list of all URLs
app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase, user: getUser(req.cookies) };
  res.status(200).render("urls_index", templateVars);
});

// POST /urls - submit a new URL
app.post("/urls", (req, res) => {

  // append "http://" to longURL if it doesn't already have it
  // to prevent 404 errors

  let longURL = req.body.longURL;

  if (longURL.indexOf("http://") === -1) {
    longURL = "http://" + longURL;
  }

  let shortCode = generateRandomString(6);
  urlDatabase[shortCode] = longURL;
  console.log(longURL, " --> ", shortCode);
  res.status(302).redirect("/urls/" + shortCode);

});

// GET /urls/new - shows URL submission form
app.get("/urls/new", (req, res) => {
  let templateVars = { user: getUser(req.cookies) };
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
  let templateVars = { longURL: urlDatabase[req.params.id], shortURL: req.params.id, user: getUser(req.cookies) };
  res.status(200).render("urls_show", templateVars);
})

// GET /urls.json - shows URL database in JSON format
app.get("/urls.json", (req, res) => {
  res.status(200).json(urlDatabase);
});

// GET /teapot - easter egg
app.get("/teapot", (req, res) => {
    let templateVars = { user: getUser(req.cookies) };
    console.log("Teapot easter egg");
    res.status(418).render("im_a_teapot", templateVars);
});

// Start server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});