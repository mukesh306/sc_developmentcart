


// const cron = require("node-cron");
// const Notification = require("../models/notification");

// cron.schedule("* * * * *", async () => {
//   try {
//     const now = new Date();

//     const notifications = await Notification.find({
//       type: "enrolled",
//       isCompleted: false,
//       attemptCount: { $lt: 5 }
//     }).populate("userId", "status fcmToken");

//     for (const notif of notifications) {
//       const user = notif.userId;

//       if (!user || user.status === "yes") {
//         await Notification.updateOne(
//           { _id: notif._id },
//           { $set: { isCompleted: true } }
//         );
//         continue;
//       }

     
//       const delayMinutes = Math.pow(2, notif.attemptCount + 1);
//       const nextTime = new Date(
//         notif.createdAt.getTime() + delayMinutes * 60 * 1000
//       );

//       if (now < nextTime) continue;

    
//       const locked = await Notification.findOneAndUpdate(
//         {
//           _id: notif._id,
//           attemptCount: notif.attemptCount,
//           isCompleted: false
//         },
//         { $set: { lastSentAt: now } },
//         { new: true }
//       );

    
//       if (!locked) continue;
//       if (user.fcmToken) {
//         await global.sendFirebaseNotification(
//           [user.fcmToken],
//           {
//             title: locked.title,
//             message: locked.message,
//             type: "enrolled"
//           }
//         );
//       }

      
//       await Notification.updateOne(
//         { _id: locked._id },
//         {
//           $inc: { attemptCount: 1 },
//           $set: locked.attemptCount + 1 >= locked.maxAttempts
//             ? { isCompleted: true }
//             : {}
//         }
//       );
//     }

//   } catch (err) {
//     console.error(" Notification Cron Error:", err.message);
//   }
// });



const cron = require("node-cron");
const Notification = require("../models/notification");
const User = require("../models/User");
const moment = require("moment-timezone");

cron.schedule("* * * * *", async () => {
  try {
    const now = moment().tz("Asia/Kolkata");

    /* ===============================
       1️⃣ ENROLLED (UNCHANGED)
    ================================ */
    const enrolledNotifications = await Notification.find({
      type: "enrolled",
      isCompleted: false,
      attemptCount: { $lt: 5 }
    }).populate("userId", "status fcmToken");

    for (const notif of enrolledNotifications) {
      const user = notif.userId;

      if (!user || user.status === "yes") {
        await Notification.updateOne(
          { _id: notif._id },
          { $set: { isCompleted: true } }
        );
        continue;
      }

      const delayMinutes = Math.pow(2, notif.attemptCount + 1);
      const nextTime = new Date(
        notif.createdAt.getTime() + delayMinutes * 60 * 1000
      );

      if (new Date() < nextTime) continue;

      const locked = await Notification.findOneAndUpdate(
        {
          _id: notif._id,
          attemptCount: notif.attemptCount,
          isCompleted: false
        },
        { $set: { lastSentAt: new Date() } },
        { new: true }
      );

      if (!locked) continue;

      if (user.fcmToken) {
        await global.sendFirebaseNotification(
          [user.fcmToken],
          {
            title: locked.title,
            message: locked.message,
            type: "enrolled"
          }
        );
      }

      await Notification.updateOne(
        { _id: locked._id },
        {
          $inc: { attemptCount: 1 },
          $set:
            locked.attemptCount + 1 >= locked.maxAttempts
              ? { isCompleted: true }
              : {}
        }
      );
    }

   
    const reminders = await Notification.find({
      type: "reminder",
      sent: false
    });

    for (const notif of reminders) {
      if (!notif.scheduleDate || !notif.scheduleTime) continue;

    
      const examDateTime = moment.tz(
        `${notif.scheduleDate} ${notif.scheduleTime}`,
        "DD-MM-YYYY HH:mm:ss",
        "Asia/Kolkata"
      );

      if (!examDateTime.isValid()) continue;

      const reminderTime = examDateTime.clone().subtract(3, "minutes");

      if (!now.isSame(reminderTime, "minute")) continue;

      const user = await User.findById(notif.userId).select("fcmToken");

      if (!user?.fcmToken) {
        await Notification.updateOne(
          { _id: notif._id },
          { $set: { sent: true } }
        );
        continue;
      }

      await global.sendFirebaseNotification(
        [user.fcmToken],
        {
          title: notif.title,
          message: notif.message,
          type: "reminder"
        }
      );

      await Notification.updateOne(
        { _id: notif._id },
        { $set: { sent: true } }
      );
    }

  } catch (err) {
    console.error("Notification Cron Error:", err.message);
  }
});
