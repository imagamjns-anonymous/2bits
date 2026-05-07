const { createClient } = require("@libsql/client/web");
const { databaseUrl, databaseAuthToken } = require("./config");

const clientOptions = { url: databaseUrl };
if (databaseAuthToken) {
  clientOptions.authToken = databaseAuthToken;
}

const client = createClient(clientOptions);

module.exports = {
  query: (text, params) => client.execute({ sql: text, args: params || [] }),
  client,
};
