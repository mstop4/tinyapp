
// Requires
require("dotenv").config();
var express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require("bcrypt");

// Init app
var app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: "session",
  secret: "teehee",

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

app.set("view engine", "ejs");

// Data
var PORT = process.env.MY_PORT || 8080;
//const COOKIE_NAME = "localuser@tinyapp";

var urlDatabase = {
  "b2xVn2": {
    url: "http://www.lighthouselabs.ca",
    user_id: "eeeeee"
  },

  "9sm5xK": {
    url: "http://www.google.com",
    user_id: "eeeeee"
  },

  "teapot": {
    url: "http://www.google.com/teapot",
    user_id: "eeeeee"
  },

  "lugage": {
    url: "http://www.luggage.com",
    user_id: "bbbbbb"
  },

  "bender": {
    url: "http://www.benderisgreat.com",
    user_id: "dddddd"
  }
}

var users = {
  "aaaaaa": {
    id: "aaaaaa",
    email: "kingroland@druidia.net",
    password: bcrypt.hashSync("12345", 10)
  },

  "bbbbbb": {
    id: "bbbbbb",
    email: "presidentskroob@spaceballone.com",
    password: bcrypt.hashSync("12345", 10)
  },

  "cccccc": {
    id: "cccccc",
    email: "BLU_Soldier@blu.blu",
    password: bcrypt.hashSync("1111", 10)
  },

  "dddddd": {
    id: "dddddd",
    email: "bender@ilovebender.com",
    password: bcrypt.hashSync("antiquing", 10)
  },

  "eeeeee": {
    id: "eeeeee",
    email: "normal@guy.org",
    password: bcrypt.hashSync("boring", 10)
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

// Returns a list of URLs filtered by user
function filterURLsByUser (user) {
  let filteredList = {};

  for (shortURL in urlDatabase) {
    if (urlDatabase[shortURL]["user_id"] === user["id"]) {
      filteredList[shortURL] = urlDatabase[shortURL];
    }
  }
  return filteredList;
}

// Append "http://" to URL if it doesn't already have it to prevent 404 errors
function protocolFixer (url) {

  if (url.indexOf("http://") === -1) {
    return "http://" + url;
  } else {
    return url;
  }
}

// Home Page
// ---------

// GET root - home page
app.get("/", (req, res) => {

  let templateVars = { user: req.session.user };
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

  // check user password hash

  if (bcrypt.compareSync(password, user["password"])) {
    req.session.user = user;
    console.log("Logged in as:" + user["id"] + " - " + user["email"]);
    return res.status(302).redirect("/");

  } else {
    return res.status(403).send("Invalid email or password.");
  }
});

// GET /login - go to login page
app.get("/login", (req, res) => {
  let templateVars = { user: req.session.user };
  res.status(200).render("user_login", templateVars);
});

// POST /logout - log out of the service
app.post("/logout", (req, res) => {
  req.session.user = null;
  res.status(302).redirect("/");
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
  let hashPass = bcrypt.hashSync(req.body.password, 10);
  users[randomID] = { "id": randomID, email: req.body.email, password: hashPass};
  req.session.user = users[randomID];

  console.log("Logged in as:" + randomID + " - " + req.body.email);
  res.status(302).redirect("/urls");
});

// GET /register - opens registration page
app.get("/register", (req, res) => {

  let templateVars = { user: req.session.user }
  res.status(200).render("user_reg", templateVars);
})

// Shortlink redirection
// ---------------------

// GET /u/:id - redirect to full URL
app.get("/u/:shortURL", (req, res) => {

  var urlKeys = Object.keys(urlDatabase);

  if (urlKeys.indexOf(req.params.shortURL) === -1) {
    console.log("404'd!");
    let templateVars = { user: req.session.user };
    res.status(404).render("error_404", templateVars);
  }

  else {
    let longURL = urlDatabase[req.params.shortURL]["url"];
    res.status(302).redirect(longURL);
  }
});

// Database query
// --------------

// GET /urls - shows a list of all URLs associated with user
app.get("/urls", (req, res) => {

  // check to see if user is logged in, if not go to login page
  if (Object.keys(req.session).length === 0) {
    return res.status(302).redirect("/login");
  }

  let templateVars = { urls: filterURLsByUser(req.session.user), user: req.session.user };
  res.status(200).render("urls_index", templateVars);
});

// POST /urls - submit a new URL
app.post("/urls", (req, res) => {

  let longURL = protocolFixer(req.body.longURL);
  let shortCode = generateRandomString(6);

  urlDatabase[shortCode] = { url: longURL, user_id: req.session.user["id"]};
  console.log(longURL, " --> ", shortCode);
  res.status(302).redirect("/urls/" + shortCode);

});

// GET /urls/new - shows URL submission form
app.get("/urls/new", (req, res) => {

  // check to see if user is logged in, if not go to login page
  if (Object.keys(req.session).length === 0) {
    return res.status(302).redirect("/login");
  }

  let templateVars = { user: req.session.user };
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
  urlDatabase[req.params.id] = protocolFixer(req.body.longURL);
  res.status(302).redirect("/urls");
});

// GET /urls/:id - shows the URL and its shortlink
app.get("/urls/:id", (req, res) => {
  let templateVars = { longURL: urlDatabase[req.params.id]["url"], shortURL: req.params.id, user: req.session.user };
  res.status(200).render("urls_show", templateVars);
})

// GET /urls.json - shows URL database in JSON format
app.get("/urls.json", (req, res) => {
  res.status(200).json(urlDatabase);
});

// GET /teapot - easter egg
app.get("/teapot", (req, res) => {
    let templateVars = { user: req.session.user };
    console.log("Teapot easter egg");
    res.status(418).render("im_a_teapot", templateVars);
});

// Start server
console.log(users);

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});