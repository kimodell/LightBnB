const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require("pg");

const pool = new Pool({
  user: "development",
  password: "development",
  host: "localhost",
  database: "lightbnb",
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  // let resolvedUser = null;
  // for (const userId in users) {
  //   const user = users[userId];
  //   if (user && user.email.toLowerCase() === email.toLowerCase()) {
  //     resolvedUser = user;
  //   }
  // }
  // return Promise.resolve(resolvedUser);

  return pool
    .query(`SELECT * FROM users WHERE LOWER(email) = LOWER($1)`, [email])
    .then((result) => {
      //return first user with email provided, or null if not found
      if (result.rows.length) {
        return result.rows[0];
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  //return Promise.resolve(users[id]);

  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((result) => {
      //return first user with id provided, or null if not found
      if (result.rows.length) {
        return result.rows[0];
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  // const userId = Object.keys(users).length + 1;
  // user.id = userId;
  // users[userId] = user;
  // return Promise.resolve(user);

  //destructure user object for use in query
  const { name, email, password } = user;

  return pool
    .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;`, [name, email, password])
    .then((result) => {
      //return newly added user object from database
      if (result.rows.length) {
        return result.rows[0];
      }
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  //return getAllProperties(null, 2);

  return pool
    .query(`
    SELECT reservations.*, properties.*, AVG(property_reviews.rating) as average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    LEFT JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    GROUP BY reservations.id, properties.id
    LIMIT $2`, [guest_id, limit])
    .then((result) => {
      //return list of reservations by guest_id
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = (options, limit = 10) => {

  //initialize array to hold parameters that may be avaiable to use in the query
  const queryParams = [];

  //set up query for all information that comes before WHERE clauses
  let queryString = `
  SELECT properties.*, AVG(property_reviews.rating) as average_rating
  FROM properties
  LEFT JOIN property_reviews ON properties.id = property_id
  `;

  //initialize variable to determine if a paramter has been added to queryParams
  let hasConditions = false;

  //if city has been passed as a parameter, add WHERE clause for the city
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
    //set condition checker to true, as we have confirmed a condition is added
    hasConditions = true;
  }

  //if user is signed in, only pass properties belonging to that user
  if (options.owner_id) {
    //use conditional operator to determine if condition is already present in params, if so, use AND, else use WHERE
    queryString += `${hasConditions ? ' AND' : 'WHERE'} owner_id = $${queryParams.length} `;
    hasConditions = true;
  }

  //if minumum cost per night is added as a peramter 
  if (options.minimum_price_per_night) {
    queryParams.push(parseInt(options.minimum_price_per_night, 10) * 100); //convert dollars to cents
    queryString += `${hasConditions ? ' AND' : 'WHERE'} cost_per_night >= $${queryParams.length} `;
    hasConditions = true;
  }

  //if maximum cost per night is added as a peramter 
  if (options.maximum_price_per_night) {
    queryParams.push(parseInt(options.maximum_price_per_night, 10) * 100);
    queryString += `${hasConditions ? ' AND' : 'WHERE'} cost_per_night <= $${queryParams.length} `;
    hasConditions = true;
  }

  queryString += `
  GROUP BY properties.id`;

  //only return properties above or equal to a minumum rating if rating specified 
  if (options.minimum_rating) {
    queryParams.push(parseInt(options.minimum_rating, 10));
    queryString += `HAVING AVG(property_reviews.rating) >= $${queryParams.length} `;
  }

  //add other queries that come after WHERE
  queryParams.push(limit);

  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  console.log(queryString, queryParams);

  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
