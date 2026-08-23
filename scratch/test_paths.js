const path = require("path");

const file1 = "c:/Users/DELL/Desktop/CargoNet/api/matching/return-load/[truckId].js";
const file2 = "c:/Users/DELL/Desktop/CargoNet/api/admin/users/[userId]/toggle-block.js";
const target = "c:/Users/DELL/Desktop/CargoNet/lib/db.js";

console.log("File 1 dir:", path.dirname(file1));
console.log("Relative 1 (../../../lib/db):", path.resolve(path.dirname(file1), "../../../lib/db"));

console.log("File 2 dir:", path.dirname(file2));
console.log("Relative 2 (../../../../lib/db):", path.resolve(path.dirname(file2), "../../../../lib/db"));
