const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { requireMongoUri } = require("../config/mongoUri");
const mongoConnectOptions = require("../config/mongoConnectOptions");

async function main() {
  const uri = requireMongoUri();
  const masked = uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+(@)/, "$1****$2");
  console.log("Kết nối:", masked);

  await mongoose.connect(uri, mongoConnectOptions);
  const dbName = mongoose.connection.name;
  console.log("OK. Database:", dbName);

  await mongoose.connection.db.collection("_connection_check").insertOne({
    at: new Date(),
  });
  console.log("Đã ghi _connection_check. Refresh Data Explorer trên Atlas.");

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
