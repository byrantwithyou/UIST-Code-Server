const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

//begin listening at port 8089
http.listen(8089);
console.log("listening at port 8089......");

let studentProfile = [];
let behaviorsForAll = [];
let stepsForAll = [];
let subsectionsForAll = [];
let settingsForAll = [];
let teacherID = "";

//TODO:
let stepNumber = 5;

io.on("connection", function (socket) {
  socket.on("sendMobilePhoto", function(img, studentName) {
    const index = studentProfile.findIndex((element) => (element.name == studentName));
    console.log(index);
    const socketId = studentProfile[index].id;
    io.sockets.connected[socketId].emit('photo', img);
  })

  socket.on("authoring", function (behaviors, steps, subsections, settings) {
    console.log(behaviors);
    behaviorsForAll = behaviors;
    stepsForAll = steps;
    subsectionsForAll = subsections;
    settingsForAll = settings;
  });
  //when a teacher login
  socket.on("teacherLogin", function () {
    teacherID = socket.id;
    socket.emit("authoring", behaviorsForAll, stepsForAll, subsectionsForAll, settingsForAll);
  });

  //when a student login
  socket.on("studentLogin", function (studentName) {
    studentProfile.push({
      id: socket.id,
      name: studentName,
      time: new Date().getTime(),
      reviewTimes: 0,
      errorRecord: [],
      log: []
    });
    console.log("hello" + settingsForAll);
    socket.emit("authoring", behaviorsForAll, stepsForAll, subsectionsForAll, settingsForAll);
  });

  //when disconnect
  socket.on("disconnect", function () {
    let deleteStudentIndex = studentProfile.findIndex((element) => element.id == socket.id);
    if (deleteStudentIndex >= 0) {
      studentProfile.splice(deleteStudentIndex, 1);
    }
    if (socket.id == teacherID) {
      teacherID = "";
    }
  });


  //add severity
  socket.on("photo", function (img, behavior) {
    //when finished table is 1, the state is "submitted" but not "approved"
    console.log("photo");

    //target is influenced by reviewTimes, time and random factor
    for (let i = 0; i < studentProfile.length; i += 1) {
      let user = studentProfile[i].id;
      if (user != socket.id) {
        io.sockets.connected[user].emit("photoToJudge", img, socket.id, behavior);
        console.log("emitted");
        break;
      }
    }
  });

  socket.on("review", function (review, img, behavior, toUser, text, severity) {
    

    //if review is positive
    if (review == 1) {
      console.log("right");
      console.log(toUser);
      io.sockets.connected[toUser].emit("reviewResult", 1, behavior);
    }
    //else if review is negative
    else if (review === 0) {
      io.sockets.connected[toUser].emit("reivewResult", 0, behavior);
    }
  });

  // a student wants to get review from teacher
  socket.on("photoToTeacher", function (img, behavior, severity) {
    let target = teacherSocket;
    if (target) {
      target.emit("photoToJudgeByTeacher", img, behavior, socket.id, severity);
    }
  });

  // teacher sends back review
  socket.on("teacherReview", function (
    review,
    img,
    behavior,
    toUser,
    text,
    severity
  ) {
    //if review is positive
    if (review === 1) {
      
    }
    //else if review is negative
    else if (review === 0) {
      //when facing an error, student should get three positive reviews continuously to develop his behavior
      
    }

    //if severity is 1, store the review instead of sending it
    if (severity === "low") {
      let finalMsg = {};
      finalMsg.toUser = toUser;
      finalMsg.status = review;
      finalMsg.behavior = behavior;
      finalMsg.text = text;
    } else {
      let target =
        studentProfile[
          studentProfile.findIndex(element => element.id === toUser)
        ].socket;
      target.emit("reviewResult", img, review, behavior, text, severity);
    }

    //If the behavior is formed, tell the student
    //There is still a 30 percent chance to check the answer
    if (
      studentProfile[studentProfile.findIndex(element => element.id === toUser)]
        .errorRecord[behavior] === -2
    ) {
      let target =
        studentProfile[
          studentProfile.findIndex(element => element.id === toUser)
        ].socket;
      target.emit("behaviorDeveloped", behavior);
    }
  });


  
});
