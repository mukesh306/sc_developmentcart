


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

  
    const scheduledNotifications = await Notification.find({
      type: "scheduled"
    }).lean();

    for (const notif of scheduledNotifications) {
      if (!notif.scheduleDate || !notif.scheduleTime) continue;

      const examDateTime = moment.tz(
        `${notif.scheduleDate} ${notif.scheduleTime}`,
        "YYYY-MM-DD HH:mm",
        "Asia/Kolkata"
      );

      const reminderTime = examDateTime.clone().subtract(2, "minutes");

      if (!now.isSame(reminderTime, "minute")) continue;

     
      const exists = await Notification.exists({
        userId: notif.userId,
        examId: notif.examId,
        type: "reminder"
      });

      if (exists) continue;

      const user = await User.findById(notif.userId).select("fcmToken");

    
      const reminder = await Notification.create({
        userId: notif.userId,
        examId: notif.examId,
        type: "reminder",
        title: "Exam reminder",
        message: notif.message,
        scheduleDate: notif.scheduleDate,
        scheduleTime: notif.scheduleTime,
        isRead: false,
        sent: false
      });

     
      if (user?.fcmToken) {
        await global.sendFirebaseNotification(
          [user.fcmToken],
          {
            title: "Exam reminder",
            message: notif.message,
            type: "reminder"
          }
        );

        await Notification.updateOne(
          { _id: reminder._id },
          { $set: { sent: true } }
        );
      }
    }

   
    const reminderNotifications = await Notification.find({
      type: "reminder",
      sent: { $ne: true }
    }).lean();

    for (const notif of reminderNotifications) {
      if (!notif.scheduleDate || !notif.scheduleTime) continue;

      const examDateTime = moment.tz(
        `${notif.scheduleDate} ${notif.scheduleTime}`,
        "YYYY-MM-DD HH:mm",
        "Asia/Kolkata"
      );

      const reminderTime = examDateTime.clone().subtract(2, "minutes");

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
          title: "Exam reminder",
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


