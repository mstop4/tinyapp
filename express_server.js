// Requires
// --------

require("dotenv").config();
var express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require("bcrypt");
const methodOverride = require('method-override');

// Init app
// --------

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: "session",
  secret: "teehee",
  maxAge: 24 * 60 * 60 * 1000
}));
app.use(methodOverride('_method'))
app.set("view engine", "ejs");

var PORT = process.env.MY_PORT || 8080;

// Databases
// ---------

// URL entry format:
// <shortlink>: { url: String,
//                user_id: String,
//                dateCreated: Date,
//                hits: Number}

var urlDatabase = {};

// User entry format:
// <userId> : { id: String,
//              email: String,
//              pasHash: String}

var users = {};

// Helper Functions
// ----------------

function addUser(userId, userEmail, userPassword) {
  users[userId] = { id: userId,
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

function amILoggedIn(req) {
  return (Object.keys(req.session).length !== 0);
}

function generateRandomString(length) {
  const legalCharacters = "0123456789ABCDEFGHIJKLMNOPRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let output = "";

  for (var i = 0; i < length; i++) {
    output += legalCharacters[Math.floor(Math.random() * legalCharacters.length)]
  }

  return output;
}

function filterURLsByUser (user) {
  let filteredList = {};

  if (!user) {
    return filteredList;
  }

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

// Sends a response to render a page (with HTTP 200) with default and optional template variables
function sendRenderResponse (req, res, page, addParams) {
    let templateVars = { user: req.session.user };

    for (param in addParams) {
      templateVars[param] = addParams[param];
    }

    return res.status(200).render(page, templateVars);
}

// Sends error responses (i.e. HTTP 401, 403, 404) with default template variables
function sendErrorResponse (errorCode, req, res, page) {
  let templateVars = { user: req.session.user };
  return res.status(errorCode).render(page, templateVars);
}

// Server Functions
// ----------------

// GET root - logged in = redirect to login page
//          - logged out = redirect to user's shortlink list
app.get("/", (req, res) => {

  let templateVars = { user: req.session.user };

  if (!amILoggedIn(req)) {
    return res.redirect(302, "/login");
  }

  res.redirect(302, "/urls");
});

// User Database CRUD & Authentication
// -----------------------------------

// POST /login - log into the service
app.post("/login", (req, res) => {

  let email = req.body.email;
  let password = req.body.password;
  let curentUser = undefined;

  // Verify the user's email and password

  for (i in users) {
    if (users[i]["email"] === email) {
      curentUser = users[i];
      break;
    }
  }

  if (!curentUser) {
    return sendRenderResponse(req, res, "error_invalidCredentials");
  }

  if (bcrypt.compareSync(password, curentUser["passHash"])) {
    req.session.user = curentUser;
    console.log("User logged in as:" + curentUser["id"] + " - " + curentUser["email"]);
    return res.redirect(302, "/");
  } else {
    sendRenderResponse(req, res, "error_invalidCredentials");
  }
});


// GET /login - logged in = go to user's URL list
//            - logged out = go to login page
app.get("/login", (req, res) => {

  if (amILoggedIn(req)) {
    return res.redirect(302, "/urls");
  }

  sendRenderResponse(req, res, "user_login");
});


// POST /logout - log out of the service
app.post("/logout", (req, res) => {

  req.session = null;
  res.redirect(302, "/");
});


// GET /logout - this shouldn't happen
app.get("/logout", (req, res) => {
  sendErrorRepsonse(401, req, res, "error_401");
});


// POST /register - creates a new account
app.post("/register", (req, res) => {

  let email = req.body.email;
  let password = req.body.password;

  // disallow blank emails and passwords
  if (!email || !password) {
    return sendRenderResponse(req, res, "error_invalidCredentials");
  }

  // disallow duplicate emails
  for (user in users) {
    if (users[user]["email"] === email) {
      return sendRenderResponse(req, res, "error_duplicateEmail");
    }
  }

  let randomID = generateRandomString(6);
  let hash = bcrypt.hashSync(req.body.password, 10);
  addUser(randomID, req.body.email, hash);
  req.session.user = users[randomID];

  console.log("Logged in as:" + randomID + " - " + req.body.email);
  res.redirect(302, "/urls");
});


// GET /register - logged in = go to user's URL list
//               - logged out = opens registration page
app.get("/register", (req, res) => {

  if (amILoggedIn(req)) {
    return res.redirect(302, "/urls");
  }

  sendRenderResponse(req, res, "user_reg");
});

// Shortlink Redirection
// ---------------------


// GET /u/:id - redirect to full URL
app.get("/u/:id", (req, res) => {

  let shortCode = req.params.id;

  if (!urlDatabase.hasOwnProperty(shortCode)) {
    return sendErrorResponse(404, req, res, "error_404");
  }

  urlDatabase[shortCode]["hits"]++;
  let longURL = urlDatabase[req.params.shortCode]["url"];
  res.redirect(302, longURL);
});

// URL Database CRUD
// -----------------


// GET /urls - logged in = shows a list of all URLs associated with user
//           - logged out = redirect to login page
app.get("/urls", (req, res) => {

  if (!amILoggedIn(req)) {
    return sendErrorResponse(401, req, res, "error_401");
  }

  sendRenderResponse(req, res, "urls_index", { urls: filterURLsByUser(req.session.user) });
});


// POST /urls - logged in = submit a new URL
//            - logged out = show 401 error
app.post("/urls", (req, res) => {

  if (!amILoggedIn(req)) {
    return sendErrorResponse(401, req, res, "error_401");
  }

  let longURL = protocolFixer(req.body.longURL);
  let shortCode = generateRandomString(6);

  addURL(shortCode, longURL, req.session.user["id"]);
  console.log(longURL, " --> ", shortCode);
  res.redirect(302, "/urls/" + shortCode);

});


// GET /urls/new - logged in = shows URL submission form
//               - logged out = redirect to 401 page
app.get("/urls/new", (req, res) => {

  if (!amILoggedIn(req)) {
    return res.redirect(302, "/login");
  }

  sendRenderResponse(req, res, "urls_new");
});


// DELETE /urls/:id - deletes a URL
//                  - logged in, different user = shows 403 error
//                  - logged out = show 401 error
//                  - invalid id = show 404 error
app.delete("/urls/:id", (req, res) => {

  // shortlink ID not found
  if (!urlDatabase.hasOwnProperty(req.params.id)) {
    return sendErrorResponse(404, req, res, "error_404");
  }

  // logged out
  if (!amILoggedIn(req)) {
    return sendErrorResponse(401, req, res, "error_401");
  }

  // wrong user
  if (urlDatabase[req.params.id]["user_id"] !== req.session.user["id"]) {
    return sendErrorResponse(403, req, res, "error_403");
  }

  console.log("Delete", req.params.id);
  delete urlDatabase[req.params.id];
  res.redirect(302, "/urls");
});


// PUT /urls/:id - logged in, same user = updates a URL
//               - logged in, different user = shows 403 error
//               - logged out = show 401 error
//               - invalid id = show 404 error
app.put("/urls/:id", (req, res) => {

  // shortlink ID not found
  if (!urlDatabase.hasOwnProperty(req.params.id)) {
    return sendErrorResponse(404, req, res, "error_404");
  }

  // logged out
  if (!amILoggedIn(req)) {
    return sendErrorResponse(401, req, res, "error_401");
  }

  // wrong user
  if (urlDatabase[req.params.id]["user_id"] !== req.session.user["id"]) {
    return sendErrorResponse(403, req, res, "error_403");
  }

  urlDatabase[req.params.id]["url"] = protocolFixer(req.body.longURL);
  res.redirect(302, "/urls");
});


// GET /urls/:id - logged in, same user = shows the URL and its shortlink
//               - logged in, different user = shows 403 error
//               - logged out = show 401 error
//               - invalid id = show 404 error
app.get("/urls/:id", (req, res) => {

  // shortlink ID not found
  if (!urlDatabase.hasOwnProperty(req.params.id)) {
    return sendErrorResponse(404, req, res, "error_404");
  }

  // logged out
  if (!amILoggedIn(req)) {
    return sendErrorResponse(401, req, res, "error_401");
  }

  // wrong user
  if (urlDatabase[req.params.id]["user_id"] !== req.session.user["id"]) {
    return sendErrorResponse(403, req, res, "error_403");
  }

  sendRenderResponse(req, res, "urls_show", { urlInfo: urlDatabase[req.params.id], shortURL: req.params.id });
});


// GET /teapot - easter egg
app.get("/teapot", (req, res) => {
    let templateVars = { user: req.session.user };
    console.log("Someone found the easter egg!");
    res.status(418).render("im_a_teapot", templateVars);
});


// Start Here
// ----------

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

// Start server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});