const functions = require("firebase-functions");
const admin = require("firebase-admin");


admin.initializeApp();
const fireStoreDb = admin.firestore();
const appUsersRef = fireStoreDb.collection("AppUsers");

const charRoomsColection = "ChatRoom";
const chatMessageSubColection = "Messages";
// const userIdKey = "userUID";


exports.notifyNewChatMessage = functions.firestore
    .document(charRoomsColection + "/{chatroom}/" +
        chatMessageSubColection + "/{message}")
    .onCreate((docSnapshot, context) => {
      const message = docSnapshot.data();
      const recipientId = message["recipientId"];
      const senderId = message["senderId"];

      console.log("recipientId :" + recipientId);
      console.log("senderId :" + senderId);
      console.log("message :" + message["message"]);
      console.log("########charRooms:" + context.params.chatroom);

      return appUsersRef.where("userUID", "==", recipientId)
          .get()
          .then((querySnapshot) => {
            return querySnapshot.forEach((userDoc) => {
              const registrationToken = userDoc.data()["deviceUniqueId"];
              console.log("Device Token :" + registrationToken);
              const notificationBody=(message["isMessageTypeImage"] === false) ?
              message["message"] : "You received a new image message.";
              const payload = {
                notification: {
                  title: "OnDha spot" + " sent you a message.",
                  body: notificationBody,
                  clickAction: ".ui.home.HomeActivity",
                },
                data: {
                  CHAT_ROOM: context.params.chatroom,
                  SENDER_ID: senderId,
                },
              };

              return admin.messaging().sendToDevice(registrationToken, payload).
                  then((response) => {
                    // const stillRegisteredTokens = registrationToken;
                    return console.log("Success fully sent notification");

                    // response.results.forEach((result, index) => {
                    //     const error = result.error
                    // })
                  });
            });
          })
          .catch((error) => {
            return console.log("Error getting documents: ", error);
          });
    });
