require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { requireMongoUri } = require("../config/mongoUri");
const mongoConnectOptions = require("../config/mongoConnectOptions");
const roleModel = require("../models/roles");

async function main() {
  await mongoose.connect(requireMongoUri(), mongoConnectOptions);
  const roles = [
    { name: "USER", description: "Thành viên diễn đàn" },
    { name: "ADMIN", description: "Quản trị viên" },
  ];
  for (const r of roles) {
    await roleModel.findOneAndUpdate(
      { name: r.name },
      { $set: { description: r.description, isDeleted: false }, $setOnInsert: { name: r.name } },
      { upsert: true, new: true }
    );
    console.log("Role OK:", r.name);
  }
  await mongoose.disconnect();
  console.log("seed:roles done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
