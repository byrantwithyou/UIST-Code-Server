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
let styleProfile = [];
let stepProfile = [];


io.on("connection", function (socket) {

  socket.on("stepProfile", function( name, currentSubsection, stepContent ) {
    stepProfile[stepProfile.findIndex((element) => (element.name == name))] = {
      id: socket.id,
      name: name,
      currentSubsection: currentSubsection,
      stepContent: stepContent
    };
    if (teacherID) {
      io.sockets.connected[teacherID].emit("stepProfile", stepProfile);
    }
  });
  
  socket.on("sendFeedback", function(comment, name) {
    const index = studentProfile.findIndex((element) => (element.name == name));
    if (index >= 0) {
      if (io.sockets.connected[studentProfile[index].id] && studentProfile[index].online) {
        io.sockets.connected[studentProfile[index].id].emit("sendFeedback", comment);
      }
    }
  })

  socket.on("styleData", function(style, name, result) {
    // console.log(data);
    // let find = false;
    // for (let profile of styleProfile) {
    //   if ( (profile.style == data.style) && (profile.name == data.name)) {
    //     profile.reviewResult = data.reviewResult;
    //     find = true;
    //     break;
    //   }
    // }
    // if (!find) {
    //   find = false;
    //   styleProfile.push(data);
    // }
    
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("styleLog", style, name, result);
    }
    
  })


  socket.on("failureHistory", function(behavior) {
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("failureHistory", studentProfile.find((element) => (element.id == socket.id)).name, behavior);
    }
  })

  socket.on("stepAction", function(behavior) {
    if (behavior) {
      if (studentProfile.find((element) => (element.id == socket.id)).behavior[behavior.name]) {
        studentProfile.find(element => element.id == socket.id).behavior[behavior.name] += 1;
      } else {
        studentProfile.find((element) => (element.id == socket.id)).behavior[behavior.name] = 1;
      }
      if (
        studentProfile.find(element => element.id == socket.id) &&
        studentProfile.find(element => element.id == socket.id).online
      ) {
        io.sockets.connected[socket.id].emit(
          "behaviorProfile",
          studentProfile.find(element => element.id == socket.id).behavior
        );
      }
    }
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit(
        "stepAction",
        studentProfile.find(element => element.id == socket.id).name,
        behavior
      );
    }
  })

  socket.on("pr", function(studentName) {
    const index = studentProfile.findIndex(element => element.name == studentName);
    if (index >= 0) {
      let ss = studentProfile[index].id;
      if (io.sockets.connected[ss] && studentProfile[index].online) {
        io.sockets.connected[ss].emit("pr");
      }
    }
    
  })

  socket.on("sendMobilePhoto", function(img, studentName) {
    const index = studentProfile.findIndex((element) => (element.name == studentName));
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("studentView", img, studentName);
    }
    let socketId = "";
    console.log("sendMobilePhoto");
    console.log(studentName);
    console.log(index);
    if (index >= 0) {
      socketId = studentProfile[index].id;
      console.log(socketId);
      console.log("greater than zero");
    }
    if (io.sockets.connected[socketId]) {
      console.log("emit to original student");
      io.sockets.connected[socketId].emit('photo', img, studentName);
    }
  })

  socket.on("authoring", function (behaviors, steps, subsections, settings) {
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
    if (!studentProfile.map((element) => (element.name)).includes(studentName)) {
      studentProfile.push({
        id: socket.id,
        name: studentName,
        step: 1,
        behavior: {},
        online: true
      });
    } 
    stepProfile.push({
      id: socket.id,
      name: studentName,
      currentSubsection: "",
      stepContent: ""
    });
    
    socket.emit("authoring", behaviorsForAll, stepsForAll, subsectionsForAll, settingsForAll, studentProfile.find((element) => (element.name)).step);
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("studentProfile", studentProfile.map((element) => ([element.name, element.step])));
    }
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("stepProfile", stepProfile);
    }
    if ( teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("studentLogin", studentName);
    }
  });

  //when disconnect
  socket.on("disconnect", function () {
    let deleteStudentIndex = studentProfile.findIndex((element) => (element.id == socket.id));
    if (deleteStudentIndex >= 0) {
      studentProfile[deleteStudentIndex].online = false;
      //studentProfile.splice(deleteStudentIndex, 1);
      if (teacherID) {
        io.sockets.connected[teacherID].emit("studentProfile", studentProfile.map((element) => ([element.name, element.step])));
      }

    }

    deleteStudentIndex = stepProfile.findIndex((element) => (element.id == socket.id));
    if (deleteStudentIndex >= 0) {
      stepProfile.splice(deleteStudentIndex, 1);
      if (teacherID) {
        io.sockets.connected[teacherID].emit("stepProfile", stepProfile);
      }
    }
    if (socket.id == teacherID) {
      teacherID = "";
    }
  });
  
  socket.on("addStep", function() {
    if (studentProfile.find((element) => (element.id == socket.id))) {
      studentProfile.find((element) => (element.id == socket.id)).step += 1;
    }
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("studentProfile", studentProfile.map((element) => ([element.name, element.step])));
    }
  });

  socket.on("feedBack2Stu", function(result, behaviorName, studentName) {
    if (studentProfile.find((element) => (element.name == studentName))) {
      io.sockets.connected[studentProfile.find((element) => (element.name == studentName)).id].emit("feedBack2Stu", result, behaviorName);
    }
    
  });

  


  socket.on("photo", function (data, behavior) {
    console.log("to the server");
    //when finished table is 1, the state is "submitted" but not "approv
    //target is influenced by reviewTimes, time and random factor
    console.log(studentProfile.length);
    for (let i = 0; i < studentProfile.length; ++i) {
      let user = studentProfile[i].id;
      if (user != socket.id) {
        if (io.sockets.connected[user]) {
          console.log("emitted to the reviewing reviewing student");
          io.sockets.connected[user].emit("photoToJudge", data, behavior);
        }
        break;
      }
    }
  });
  
  socket.on("broadcast", function(message) {
    for (let student of studentProfile) {
      io.sockets.connected[student.id].emit("broadcast", message);
    }
  })

  socket.on("review", function (review, img, behavior, toUser, text, severity) {
    

    //if review is positive
    if (review == 1) {
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

  socket.on("reviewResult", function(reviewResult, reviewStudentName, reviewBehavior, reviewComment, reviewImg) {
    //console.log(studentProfile[0].id);
    
    if (studentProfile.find((element) => (element.name == reviewStudentName))) {
      if (io.sockets.connected[studentProfile.find((element) => (element.name == reviewStudentName)).id]) {
        io.sockets.connected[studentProfile.find((element) => (element.name == reviewStudentName)).id].emit("reviewResult", reviewResult, reviewStudentName, reviewBehavior, reviewComment, reviewImg);
      }
    }

    if ( teacherID ) {
      io.sockets.connected[teacherID].emit("styleLog", reviewBehavior.name, reviewStudentName, reviewResult);
    }
    
  });
  socket.on("teacherFeedback", function(reviewResultImg, reviewResultBehavior, reviewResult, studentName) {
    if (teacherID) {
      io.sockets.connected[teacherID].emit("teacherFeedback", reviewResultImg, reviewResultBehavior, reviewResult, studentName);
    }
  })

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

  socket.on("review2Teacher", function(reviewResultImg, reviewResultBehavior, studentName) {
    if (teacherID) {
      io.sockets.connected[teacherID].emit("review2Teacher", reviewResultImg, reviewResultBehavior, studentName);
    }
  });
  
});
