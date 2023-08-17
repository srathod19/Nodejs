require("dotenv").config();
var express = require('express');
var middleware	= require('./middleware/headerValidator');
app = express();
var user= require('./modules/v1/user/route');

app.use(express.text());
app.use(express.urlencoded({ extended: false }));
app.use(middleware.extractHeaderLanguage);
app.use(middleware.validateHeaderApiKey);
app.use(middleware.validateHeaderToken);
app.use('/api/v1/user/',user);
try {
	server = app.listen(process.env.PORT);
	console.log("Connected to Training app On PORT : "+process.env.PORT);
} catch (err) {
	console.log("Failed to connect");
}