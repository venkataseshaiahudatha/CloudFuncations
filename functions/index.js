const functions = require("firebase-functions");
const admin = require("firebase-admin");


admin.initializeApp();
const fireStoreDb = admin.firestore();
const appUsersRef = fireStoreDb.collection("AppUsers");
const onDhaSpotRef = fireStoreDb.collection("OnDhaSpotQuery");

// const currentTimeStamp = admin.firestore.Timestamp.fromDate(new Date());

const charRoomsColection = "ChatRoom";
const chatMessageSubColection = "Messages";
// const userIdKey = "userUID";

// exports.scheduledFunction = functions.pubsub.schedule("every 5 minutes")
//   .onRun((context) => {
//     console.log("This will be run every 5 minutes!");
//     onDhaSpotRef.where("queryResolvedStatus", "==", false)
//       .get()
//       .then((querySnapshot) => {
//         return querySnapshot.forEach((onDhaSpotDoc) => {
//           const queryResolvedOn = onDhaSpotDoc.data()["queryResolvedOn"];
//           console.log("onDhaSpotDoc queryFirebaseID :" +
//             onDhaSpotDoc.data()["queryFirebaseID"]);
//           if (Date.parse(queryResolvedOn) >
//             (Date.now() - 30 * 60 * 1000)) {
//             console.log("onDhaSpotDoc String :" +
//               onDhaSpotDoc.data()["queryString"]);
//           }
//         });
//       })
//       .catch((error) => {
//         return console.log("Error getting documents: ", error);
//       });
//     return null;
//   });

exports.resetOnDhaSpotQuerry = functions.pubsub.schedule("every 30 minutes")
    .onRun((context) => {
      console.log("This will be run every 30 minutes!");
      const tsToMillis = admin.firestore.Timestamp.now().toMillis();
      const compareDate = new Date(tsToMillis - (30 * 60 * 1000));
      onDhaSpotRef.where("queryResolvedStatus", "==", false)
          .where("queryRaisedOn", "<", compareDate)
          .get()
          .then((querySnapshot) => {
            return querySnapshot.forEach((onDhaSpotDoc) => {
              console.log("onDhaSpotDoc ID  :" + onDhaSpotDoc.id);
              if (onDhaSpotDoc.id != null) {
                onDhaSpotRef.doc(onDhaSpotDoc.id)
                    .update({
                      "queryResolvedStatus": true,
                      "queryEngagedStatus": false,
                      "queryRaisedOn": admin.firestore.Timestamp.now(),
                      "activeStatus": false,
                    });
                const repliedUsersList = onDhaSpotDoc.data()["repliedUsers"];
                if (repliedUsersList.length > 0) {
                  const amount = (10 / repliedUsersList.length);
                  repliedUsersList.forEach((repliedUser) => {
                    console.log("repliedUser ID  :" + repliedUser);
                    if (repliedUser) {
                      appUsersRef.where("userUID", "==", repliedUser)
                          .get()
                          .then((querySnapshot) => {
                            return querySnapshot.forEach((repliedUserObj) => {
                              if (repliedUserObj.id != null) {
                                const previousCredits =
                                repliedUserObj.data()["activeCredits"];
                                const creditAmt = previousCredits + amount;
                                appUsersRef.doc(repliedUserObj.id)
                                    .update({
                                      "userEngagedStatus": false,
                                      "userCurrentRole": "None",
                                      "activeCredits": creditAmt,
                                    }).then((docRef) => {
                                      console.log(": ", docRef.data());
                                    })
                                    .catch((error) => {
                                      console.error("Error: ", error);
                                    });

                                appUsersRef
                                    .doc(repliedUserObj.id)
                                    .collection("TransactionHistory").add({
                                      "queryFirebaseID":
                              onDhaSpotDoc.data()["queryFirebaseID"],
                                      "previousCredit": previousCredits,
                                      "addOrDeductCredits": amount,
                                      "resultCredit": creditAmt,
                                      "transactionType": "Receive",
                                      "transactionStatus": "Success",
                                      "transactionDate":
                                   admin.firestore.Timestamp.now(),
                                    })
                                    .then((docRef) => {
                                      console.log("Document ID: ", docRef.id);
                                    })
                                    .catch((error) => {
                                      console.error("Error document: ", error);
                                    });
                                console.log("transactionRef Done:");
                              }
                            });
                          })
                          .catch((error) => {
                            return console.log("Error documents:", error);
                          });
                    }
                  });
                } else {
                  console.log("  User record not found:");
                }
                console.log(" repliedUserObj task done");
                const queryOwner = onDhaSpotDoc.data()["queryRaisedBy"];
                appUsersRef.where("userUID", "==", queryOwner)
                    .get()
                    .then((querySnapshot) => {
                      return querySnapshot.forEach((queryOwnerObj) => {
                        if (queryOwnerObj.id) {
                          appUsersRef.doc(queryOwnerObj.id)
                              .update({
                                "userEngagedStatus": false,
                                "userCurrentRole": "None",
                              });
                        }
                      });
                    })
                    .catch((error) => {
                      return console.log("Error documents:", error);
                    });
                console.log(" queryOwnerObj task done");
              }
            });
          })
          .catch((error) => {
            return console.log("Error getting documents: ", error);
          });
      return null;
    });

exports.resetEnagagedUser = functions.pubsub.schedule("every 10 minutes")
    .onRun((context) => {
      console.log("This will be run every 10 minutes!");
      const tsToMillis = admin.firestore.Timestamp.now().toMillis();
      const compareDate = new Date(tsToMillis - (10 * 60 * 1000));
      appUsersRef.where("userEngagedStatus", "==", true)
          .where("userCurrentRole", "==", "Helper")
          .where("userEngagedTime", "<", compareDate)
          .get()
          .then((querySnapshot) => {
            return querySnapshot.forEach((userDoc) => {
              console.log("userDoc ID  :" + userDoc.id);
              if (userDoc.id != null) {
                appUsersRef.doc(userDoc.id)
                    .update({
                      "userEngagedStatus": false,
                      "userCurrentRole": "None",
                    });
              } else {
                console.log("  User record not found:");
              }
            });
          })
          .catch((error) => {
            return console.log("Error getting documents: ", error);
          });
      return null;
    });

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
      console.log("charRoom ID:" + context.params.chatroom);

      return appUsersRef.where("userUID", "==", recipientId)
          .get()
          .then((querySnapshot) => {
            return querySnapshot.forEach((userDoc) => {
              const registrationToken = userDoc.data()["deviceUniqueId"];
              console.log("Device Token :" + registrationToken);
              const notificationBody =
            (message["isMessageTypeImage"] === false) ?
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
