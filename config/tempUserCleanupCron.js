const cron = require("node-cron");
const moment = require("moment-timezone");
const Tempuser = require("../models/tempuser");

cron.schedule(
//   "40 23 * * *", 
  "23 19 * * *", 
  async () => {
    try {
      const now = moment().tz("Asia/Kolkata");
      console.log("Tempuser cleanup started at:", now.format());

      const result = await Tempuser.deleteMany({});
      console.log(`Tempuser cleanup done. Deleted: ${result.deletedCount}`);
    } catch (error) {
      console.error("Tempuser cleanup cron error:", error.message);
    }
  },
  {
    timezone: "Asia/Kolkata"
  }
);
