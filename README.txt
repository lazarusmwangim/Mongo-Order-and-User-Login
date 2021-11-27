#README

##Installation
1. Make sure you have mongo and node installed in your machine
2. Open CMD from the root directory of the app
3. Run 'npm install' to install all the required modules
4. Load the initial database data by running 'node database-initializer.js'
5. Start the server by running 'node server.js' or 'npm start'
6. Go to your favorite browser, preferrably Google Chrome or Firefox and run 'localhost:3000'
7. You will land at the home page. Navigate to a menu of your choice or click Login to access the login navigation
8. You can opt to register or login with sample logins, username: vella and password: vella
9. Clicking 'Users' gives a list of all users with a public profile. If you click on any user, you are redirected to a 
descriptive profile of the user where you are able to view the profile info and order history. If no order history from
the database, then No order  history is displayed.
10. Clicking 'Order' takes you to the order form page where you can make and submit orders. You add to order by clicking the + sign and remove by 
clicking the - sign.
11. It is worth noting that the only person who can update the privacy field is the owner of the account who must be logged in.
12. To test GET /users parameter value name, try searching from the task bar 'localhost:3000/users?name=L'

##You are free to try any other command as most bugs are properly handled.## 