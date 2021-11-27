let express = require("express");
let app = express();
let path = require("path");
const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");
const clientSessions = require("client-sessions");

let HTTP_PORT = process.env.PORT || 3000;
let mongo = require('mongodb');
let MongoClient = mongo.MongoClient;
let db;
// call this function after the http server starts listening for requests
function onHttpStart() {
  console.log("Express http server listening on " + HTTP_PORT);
}


// This is a helper middleware function that checks if a user is logged in
function ensureLogin(req, res, next) {
	if (!req.session.user) {
		res.redirect("/login");
	} else {
		next();
  }
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Register handlebars as the rendering engine for views
app.engine(".hbs", exphbs({ 
	extname: ".hbs",
	defaultLayout: 'main',
	helpers: { 
        navLink: function(url, options)
		{return '<li' + ((url == app.locals.activeRoute) ? ' class="active" ' : '') + '><a href="' + url + '">' + options.fn(this) + '</a></li>';},
		
        equal: function (lvalue, rvalue, options) {     if (arguments.length < 3)         throw new Error("Handlebars Helper equal needs 2 parameters");     if (lvalue != rvalue) {         return options.inverse(this);     } else {         return options.fn(this);     } } 
    }	
}));
app.set("view engine", ".hbs");
app.use(function(req,res,next){     let route = req.baseUrl + req.path;     app.locals.activeRoute = (route == "/") ? "/" : route.replace(/\/$/, "");     next(); });

app.use(express.static('public'));

// Setup client-sessions
app.use(clientSessions({
  cookieName: "session", // this is the object name that will be added to 'req'
  secret: "53cr3t", // this should be a long un-guessable string.
  duration: 2 * 60 * 1000, // duration of the session in milliseconds (2 minutes)
  activeDuration: 1000 * 60 // the session will be extended by this many ms each request (1 minute)
}));

// Parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

app.use(function(req, res, next) {
	res.locals.session = req.session;
	next();
});

// home 
app.get("/", function(req,res){
	res.render('home');
});

// users
app.get("/users", function(req,res) {
	let name = req.query.name;
	//console.log(name);
	try{
		db.collection("users").find({username: { $regex: name , '$options' : 'i'},
									 privacy : false
									}).toArray( function (err, results) {
			if (err) {
			  	res.render('users', {errorMessage : "Error reading database."});
			}
			if (!results) {
				console.log("Errore");
				res.render('users', {errorMessage : "No results"});
			}
			else {
				//result = result.map(value => value.toObject());
				//console.log("result" + results.toString());
				res.render('users', {
					"data" : results
				});
			}
			
		 });
		
	}
	catch {
		console.log("Error");
	}
});

//login
app.get("/login", function(req,res){
	res.render('login');
});

//login
app.post("/login", function(req,res){
	
	try{
		db.collection("users").findOne({ username: req.body.username }, function (err, result) {
			if (err) {
			  	res.render('login', {errorMessage : "Error reading database."});
			}
			if (!result) {
				res.render('login', {errorMessage : "No such username"});
			}
			else {
				if (req.body.password === result.password){
					let user = {
						username : req.body.username,
						password : req.body.password,
						privacy : result.privacy
					};
					req.session.user = {
						userName: req.body.username,
						privacy: result.privacy
					};
					db.collection("orders").find({username: result.username }).toArray( function (err, results) {
						let user = {
							username : result.username,
							password : result.password,
							privacy : result.privacy
						};
						if (err) {
							res.status(404).send("Error");
						}
						if (!results) {
							res.render('profile', { data : user});
						}
						else {
							res.render('profile', {
								data : user,
								"orderHistory" : results
							});
						}

					 });
				}
				else{
					res.render('login', {errorMessage : "Wrong password!"});
				}
				
			}
			
		 });
		
	}
	catch {
		console.log("Error");
	}

});

//register
app.get("/register", function(req,res){
	res.render('register');
});

//register
app.post("/register", function(req,res){
	let user = {
		username : req.body.username,
		password : req.body.password,
		privacy : false
	};
	try{
		db.collection("users").findOne({ username: req.body.username }, function (err, result) {
			if (err) {
			  	res.render('register',{errorMessage : "Error reading database."});
			}
			if (!result) {
				db.collection("users").insertOne(user, function(err, result){
					if(err){
						console.log(err);
						throw err;
					}
					req.session.user = {
						userName: req.body.username,
						privacy: user.privacy
					};
					res.render('profile', { data : user});
				});
			}
			else{
				console.log("Username exists");
				res.render('register',{errorMessage : "Username exists"});
			}
			
		 });
		
	}
	catch {
		console.log("Dup");
		}
	
});

//logout
app.get("/logout", function(req,res){
	req.session.reset();
	res.redirect('/');
});
// /users/:userID
app.get("/users/:userID", function(req,res){
	let ObjectId = require('mongodb').ObjectId;
	let userID = req.params.userID.toString();
	try {
		db.collection("users").findOne({ _id : ObjectId(userID) }, function (err, result) {
			if (err) {
			  	res.render('profile', {errorMessage : "Error reading database."});
			}
			if (!result) {
				res.render('profile', {errorMessage : "No such id"});
			}
			else {
				if (result.privacy === true && (!req.session.user || req.session.user.userName != result.username)){
					res.status(404).send("Profile can only be viewed by the owner");
				}
				else if (result.privacy != true || req.session.user.userName === result.username){
					db.collection("orders").find({username: result.username }).toArray( function (err, results) {
						let user = {
							username : result.username,
							password : result.password,
							privacy : result.privacy
						};
						if (err) {
							res.status(404).send("Error");
						}
						if (!results) {
							res.render('profile', { data : user});
						}
						else {
							res.render('profile', {
								data : user,
								"orderHistory" : results
							});
						}

					 });
				}	
			}
			
		 });
		
	}
	catch {
		console.log("Error");
	}
});

//order
app.get("/order", ensureLogin, function(req,res){
	res.render('order');
});

// orders/:orderID
app.get("/orders/:orderID", function(req,res){
	let ObjectId = require('mongodb').ObjectId;
	let orderID = req.params.orderID.toString();
	try {
		db.collection("orders").findOne({ _id : ObjectId(orderID) }, function (err, order) {
			if (err) {
				res.status(403).send("Database error.");
			}
			if (!order) {
				res.status(404).send("No such order ID exists.");
			}
			else {
				let user = order.username;
				try {
					db.collection("users").findOne({ username: user }, function (err, result) {
						if (err) {
							res.status(404).send("Error. No such order exists.");
						}
						if (!result) {
							res.status(404).send("No such order exists.");
						}
						else {
							if (result.privacy === false || (req.session.user && req.session.user.userName === user)){
								res.render('ordersummary', { data : order});
							}
							else{
								res.status(404).send("You do not have the rights.");
							}

						}

					 });
				}
				catch {
					res.status(404).send("Error getting person who placed order");
				}
			}
			
		 });
		
	}
	catch {
		res.status(404).send("Error 1");
	}
});

// orders
app.post("/orders", function(req,res){
	let order = {
		username : req.session.user.userName,
		restaurantID : req.body.restaurantID,
		restaurantName : req.body.restaurantName,
		subtotal : req.body.subtotal,
		total : req.body.total,
		fee : req.body.fee,
		tax : req.body.tax,
		order : req.body.order
	};
	try{
		db.collection("orders").insertOne(order, function(err, result){
			if(err){
				console.log(err);
				throw err;
			}
			res.redirect("/profile");
		});
	}
	catch {
		console.log("Order save error.");
	}
	
});

//profile
app.get("/profile", ensureLogin, function(req,res){
	try{
		db.collection("users").findOne({ username: req.session.user.userName }, function (err, result) {
			if (err) {
			  	res.render('login', {errorMessage : "Error reading database."});
			}
			if (!result) {
				res.render('login', {errorMessage : "No such username"});
			}
			else {
				db.collection("orders").find({username: result.username }).toArray( function (err, results) {
					let user = {
						username : result.username,
						password : result.password,
						privacy : result.privacy
					};
					if (err) {
						res.status(404).send("Error");
					}
					if (!results) {
						res.render('profile', { data : user});
					}
					else {
						res.render('profile', {
							data : user,
							"orderHistory" : results
						});
					}

				});
			}
			
		 });
		
	}
	catch {
		console.log("Error");
	}
});

// profile/update
app.post("/profile/update", function(req,res){
	if(!req.session.user){
		res.status(404).send("Profile can only be updated by the logged in owner");
	}
	else if (req.session.user.userName === req.body.username){
		try {
			let p;
			if (req.body.privacy === "false"){
				p = false;
			}
			else {
				p = true;
			}
		   db.collection("users").updateOne(
			  { username : req.body.username },
			  { $set: { "privacy" : p } }
		   );
			res.redirect("/profile");
		} catch (e) {
		   print(e);
		}
	}
	else {
		res.status(404).send("Profile can only be updated by the owner");
	}
});

//handle not found pages
app.use((req, res) => {
  res.status(404).send("Page Not Found");
});

MongoClient.connect( 
  "mongodb://localhost:27017/",
  { useUnifiedTopology: true },
  function (err, client) {
    if (err) throw err

    //Get the a4 database
    db = client.db("a4");

    // Start server once Mongo is initialized
    app.listen(HTTP_PORT, onHttpStart);
  }
)
