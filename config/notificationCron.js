const cron = require("node-cron");
const Notification = require("../models/notification");

cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    const notifications = await Notification.find({
      type: "enrolled",
      isCompleted: false,
      attemptCount: { $lt: 5 }
    }).populate("userId", "status fcmToken");

    for (const notif of notifications) {
      const user = notif.userId;
      if (!user || user.status === "yes") {
        notif.isCompleted = true;
        await notif.save();
        continue;
      }

      
      const delayMinutes = Math.pow(2, notif.attemptCount + 1); 
      

      const nextTime = new Date(
        notif.createdAt.getTime() + delayMinutes * 60 * 1000
      );

      
      if (now < nextTime) continue;

      
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

      
      notif.attemptCount += 1;

      if (notif.attemptCount >= notif.maxAttempts) {
        notif.isCompleted = true;
      }

      await notif.save();
    }

  } catch (err) {
    console.error(" Notification Cron Error:", err.message);
  }
});
