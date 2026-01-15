const cron = require("node-cron");
const Notification = require("../models/notification");
const User = require("../models/User");

cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    const notifications = await Notification.find({
      type: "enrolled",
      isCompleted: false,
      nextTriggerAt: { $lte: now },
      attemptCount: { $lt: 5 }
    }).populate("userId", "status fcmToken");

    for (let notif of notifications) {
      const user = notif.userId;

     
      if (!user || user.status === "yes") {
        notif.isCompleted = true;
        await notif.save();
        continue;
      }

      
      if (user.fcmToken) {
        await global.sendFirebaseNotification([user.fcmToken], {
          title: notif.title,
          message: notif.message,
          type: "enrolled"
        });
      }

      
      notif.attemptCount += 1;

      if (notif.attemptCount >= notif.maxAttempts) {
        notif.isCompleted = true;
      }

      await notif.save();
    }

  } catch (err) {
    console.error("Notification Cron Error:", err.message);
  }
});
