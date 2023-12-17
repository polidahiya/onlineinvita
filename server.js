const express = require("express");
const ObjectId = require("mongodb").ObjectId;
const mongoose = require("mongoose"); //install mongoose my command "npm i mongoose"
const { MongoClient } = require("mongodb");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const app = express();
app.use(cookieParser());
app.use(express.json());
app.listen(3005);
require("dotenv").config();

//
app.use(express.static("./build"));

const db_link = process.env.DATABASE_URL;

mongoose.connect(db_link).then(async function () {
  const client = new MongoClient(db_link);
  await client.connect();
  const db = client.db("onlineinvitation");
  const users = db.collection("users");
  const cards = db.collection("cards");

  console.log("listening");
  // get previewdata
  app.get("/previewdata", async (req, res) => {
    try {
      let search;
      if (req.query.id[0] == ":") {
        search = new ObjectId(req.query.id.slice(1));
      } else {
        search = new ObjectId(req.query.id);
      }
      let result = await cards.find({ _id: search }).toArray();
      res.json(result);
    } catch (error) {
      console.log(error);
    }
  });

  // createposts
  app.post("/savecard", verifyToken, async (req, res) => {
    try {
      let result = await cards.insertOne(req.body);
      res.json({
        message: "Saved Successfully",
        id: result.insertedId,
      });
    } catch (error) {
      console.log(error);
    }
  });

  //cards
  app.get("/task", verifyToken, async (req, res) => {
    try {
      console.log("task get req");
      const result = await cards.find({ email: req.email }).toArray();
      res.json(result);
    } catch (error) {
      console.log(error);
    }
  });

  //edit task
  app.post("/Edittask", verifyToken, async (req, res) => {
    try {
      console.log("edit req");
      let query = { taskid: Number(req.body.taskid) };
      let update;
      if (req.body.tasktype) {
        update = {
          $set: {
            tasktype: req.body.tasktype,
          },
        };
      } else {
        update = {
          $set: {
            tasktitle: req.body.tasktitle,
            taskdetails: req.body.taskdetails,
          },
        };
      }
      console.log(query);
      console.log(update);
      const options = { returnOriginal: false };
      await cards.findOneAndUpdate(query, update, options);
      res.json({
        message: "Task editted successfully",
      });
    } catch (error) {
      console.log(error);
    }
  });

  // delete
  app.post("/Deletetask", verifyToken, async (req, res) => {
    try {
      console.log("deletetask req");
      await cards.deleteOne({ taskid: Number(req.body.taskid) });
      //
      res.json({
        message: "Task deleted successfully",
      });
    } catch (error) {
      console.log(error);
    }
  });

  //user verification
  app.post("/signup", (req, res) => {
    try {
      users.findOne({ email: req.body.email }).then((user) => {
        if (user) {
          res.json({
            message: "user exist",
          });
        } else {
          users.insertOne(req.body);
          res.json({
            message: "signup successfully",
          });
        }
      });
    } catch (error) {
      console.log(error);
    }
  });

  //login
  app.post("/login", (req, res) => {
    try {
      users.findOne({ email: req.body.email }).then((user) => {
        if (user) {
          if (user.password == req.body.password) {
            const token = jwt.sign(
              { userId: req.body.email },
              "this-world-is-toxic",
              {
                expiresIn: "24h",
              }
            );
            res.cookie(`token`, token, {
              sameSite: "lax",
              maxAge: 24 * 60 * 60 * 1000,
            });
            res.status(200).json({ message: "Login successful", token });
          } else {
            res.json({
              message: "Incorrect password",
            });
          }
        } else {
          res.json({
            message: "User not found",
          });
        }
      });
    } catch (error) {
      console.log(error);
    }
  });

  // token verification

  function verifyToken(req, res, next) {
    //
    if (req.headers.cookie) {
      const cookiedata = req.headers.cookie;
      const cookiesArray = cookiedata.split(";");
      const cookiesobject = {};
      cookiesArray.forEach((cookie) => {
        const [key, value] = cookie.trim().split("=");
        cookiesobject[key] = value.replace(/%40/g, "@");
      });
      const token = cookiesobject.token;

      //
      if (token) {
        jwt.verify(token, "this-world-is-toxic", (err, decoded) => {
          if (err) {
            return res.json({ message: "Invalid token" });
          }
          req.email = decoded.userId;
          next();
        });
      } else {
        res.json({ message: "Token not provided" });
      }
    } else {
      console.log("unlogined request");
      return res.json({ message: "Please login first" });
    }
  }
});