const cron = require("node-cron");
const Notification = require("../models/notification");
const User = require("../models/User");


cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

   
    const notifications = await Notification.find({
      type: "enrolled",
      isCompleted: false,
      nextTriggerAt: { $lte: now }
    }).populate("userId", "status fcmToken");

    for (const notif of notifications) {
      const user = notif.userId;

      if (!user || user.status === "yes") {
        notif.isCompleted = true;
        await notif.save();
        continue;
      }

    
      if (user.fcmToken) {
        await global.sendFirebaseNotification(
          [user.fcmToken],
          {
            title: notif.title,
            message: notif.message,
            type: "enrolled"
          }
        );
      }

      
      notif.isCompleted = true;
      await notif.save();
    }

  } catch (error) {
    console.error(" Notification Cron Error:", error);
  }
});
