
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
var urlDatabase = {};
var users = {};

// Functions

function addUser(userId, userEmail, userPassword) {
  users["userId"] = { id: userId,
                      email: userEmail,
                      passHash: bcrypt.hashSync(userPassword, 10),
                    };
}

function addURL(shortCode, longURL, userId) {
  let rightNow = new Date(Date.now());
  urlDatabase[shortCode] = { url: longURL,
                             user_id: userId,
                             dateCreated: rightNow,
                             hits: 0
                           };
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

  if (url.indexOf("http://") !== 0) {
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
    console.log(email + " <--> " + users[i]["email"]);
    if (users[i]["email"] === email) {
      user = users[i];
      break;
    }
  }

  if (!user) {
    return res.status(403).send("Invalid email.");
  }

  // check user password hash
  if (bcrypt.compareSync(password, user["passHash"])) {
    req.session.user = user;
    console.log("Logged in as:" + user["id"] + " - " + user["email"]);
    return res.status(302).redirect("/");

  } else {
    return res.status(403).send("Invalid password.");
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
  let hash = bcrypt.hashSync(req.body.password, 10);
  addUser(randomID, req.body.email, hash);
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
app.get("/u/:shortCode", (req, res) => {

  let shortCode = req.params.shortCode;

  if (!urlDatabase.hasOwnProperty(shortCode)) {
    console.log("404'd!");
    let templateVars = { user: req.session.user };
    return res.status(404).render("error_404", templateVars);
  }

  else {
    urlDatabase[shortCode]["hits"]++;
    let longURL = urlDatabase[req.params.shortCode]["url"];
    return res.status(302).redirect(longURL);
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

  addURL(shortCode, longURL, req.session.user["id"]);
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

  if (!urlDatabase.hasOwnProperty(req.params.id)) {
    let templateVars = { user: req.session.user };
    return res.status(404).render("error_404", templateVars);
  }

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


// Populate databases with users and URLs
addUser("aaaaaa", "kingroland@druidia.net", "12345");
addUser("bbbbbb", "presidentskroob@spaceballone.com", "12345");
addUser("cccccc", "BLU_Soldier@blu.blu", "1111");
addUser("dddddd", "bender@ilovebender.com", "antiquing");
addUser("eeeeee", "normal@guy.org", "boring");

addURL("b2xVn2", "http://www.lighthouselabs.ca", "eeeeee");
addURL("9sm5xK", "http://www.google.com", "eeeeee");
addURL("teapot", "http://www.google.com/teapot", "eeeeee");
addURL("lugage", "http://www.luggage.com", "bbbbbb");
addURL("9sm5xK", "http://www.benderisgreat.com", "dddddd");

console.log(urlDatabase);

// Start server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});