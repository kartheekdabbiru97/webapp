const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const { users } = require("../models");
const db = require("../models");
const User = db.users;
const Image = db.images;
const Op = db.Sequelize.Op;
const uploadFile = require("../middleware/upload");
const {uploadFileToS3} = require("../../s3");
const {deleteFileFromS3} = require("../../s3");
const fs = require("fs");
const util = require('util');
const baseUrl = "http://localhost:8080/v1/self/pic";
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser')
const StatsdClient = require("statsd-client");
const statsdClient = new StatsdClient({host: 'localhost', port: 8000});

// Create and Save a new User
exports.create = (req, res) => {
    statsdClient.increment("User - Create");
    let startTime = new Date();

    // Validate request
    if (!req.body.first_name) {
      res.status(400).send();
      return;
    }
    else if(!req.body.last_name){
        res.status(400).send();
          return; 
    }
    else if(!req.body.username){
        res.status(400).send();
          return; 
    }
    else if(!req.body.password){
        res.status(400).send();
          return; 
    }

    bcrypt.hash(req.body.password, 10, (err,hash) => {
        if(err){
            res.status(500).json({
                error: err,
                message : "Some error occurred while creating the user"
            });
        }
        else{
            const userObject = {
                id: req.body.id,
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                username: req.body.username,
                password: hash
            }
            User.create(userObject)
            .then(data => {
                
                
                console.log(data.id)
                const dataNew = {
                  id : data.id,
                  first_name : req.body.first_name,
                  last_name : req.body.last_name,
                  username : req.body.username,
                  account_created: data.account_created,
                  account_updated: data.account_updated
                } 

                let endTime = new Date();
                statsdClient.timing(
                  "User creation time",
                  endTime - startTime
                  );               
                res.status(201).send({dataNew});
            })
            .catch(err => {
                res.status(400).send();
                
         });
        }
    } )

  };

// // Retrieve all Users from the database.
// exports.findAll = (req, res) => {
//   const id = req.query.id;
//   var condition = id ? { id: { [Op.iLike]: `%${id}%` } } : null;

//   User.findAll({ where: condition })
//     .then(data => {
//       res.status(200).send(data);
//     })
//     .catch(err => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while retrieving Users."
//       });
//     });
// };

// Find a User with an id
exports.findOne = (req, res) => {
  statsdClient.increment("User - Find");
  let startTime = new Date();

  console.log('Finding one', res.locals);
  User.findByPk(req.params.id)
    .then(data => {
      let endTime = new Date();
      statsdClient.timing(
        "User finding time",
        endTime - startTime
      );       

      res.status(200).send({
        id: data.id,
        first_name : data.first_name,
        last_name: data.last_name,
        username: data.username
      });
    })
    .catch(err => {
      res.status(500).send({
        error: err,
        message: "Error retrieving user with id=" + id
      });
    });
};

// Update a User by the id in the request
exports.update = (req, res) => {

  statsdClient.increment("User - Update");
  let startTime = new Date();
  
  bcrypt.hash(req.body.password, 10, (err, hash) => {
    if(err){
      res.status(400).json({
        
        message : "Choose a user ID to update"
      });
    }
    else if(req.params.id == null){
      res.status(400).json({
        message: "Choose a user ID to update"
      })
    }
    else{
      const id = req.params.id;
      
      if (req.body.username) {
        res.status(400).send({
          message: "Username cannot be updated"
        });
        return;
      }
      if (req.body.account_created) {
        res.status(400).send({
          message: "account_Created cannot be updated"
        });
        return;
      }
      if (req.body.account_updated) {
        res.status(400).send({
          message: "account_updated cannot be updated"
        });
        return;
      }
      const userUpdate = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        username: req.body.username,
        password: hash
    }
      User.update(userUpdate, {
        where: { id: id}
       })
      .then(num => {
        if (num == 1) {
          let endTime = new Date();
          statsdClient.timing(
            "User update time",
            endTime - startTime
          );
          res.status(200).send({
            message: "User was updated successfully."
         });
        } else {
          res.status(400).send({
            message: `Cannot update User with id=${id}. Maybe User was not found or req.body is empty!`
          });
        }
      })
     .catch(err => {
       res.status(500).send({
        message: "Error updating User with id=" + id
      });
    });

    }


  })  
};


//Creating Image DB
exports.createImage = async (req, res, location) => {
  // await User.upload(req.body);
  // console.log(req.body)

  statsdClient.increment("User - Create Image");
  let startTime = new Date();

  const user = await this.findUser(global.username)
  const imageData = ( {
    
    file_name: req.file_name,
    id: user.id,
    url: location,
    upload_date: new Date(),
    user_id: user.id,

  })
  // console.log(imageData)
  const imageExists = await this.findImageByUserID(user.id)
  if(imageExists){
    await Image.update(imageData,{
      where:{
        id:imageExists.id
      }
    })
  }else{
    await Image.create(imageData)
  }
  return imageData
}


// Uploading Image
exports.upload = async (req, res) => {
  statsdClient.increment("User - Upload Image");
  let startTime = new Date();

  bodyParser.raw({
        limit: "3mb",
        type: ["image/*"],
    })
    console.log(req.body)
    if(!req.body){
      return res.status(400).send();
    }
  try {
    const file = req.file
    
    
      const result = await uploadFileToS3(req, res);
    const random = Math.floor(Math.random())
    const imageObject = {
      file_name: result.Key,
      url: result.Location
    }
    req.file_name = result.Key
    const location = result.Location
    const imageInfo = await this.createImage(req, res, location)

    let endTime = new Date();
      statsdClient.timing(
        "Image uploading time",
        endTime - startTime
      );

    res.status(201).send({
      message: "Profile pic added",
      imageInfo
      
    })
    
  } catch (err) {
    console.log(err);

    if (err.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File size cannot be larger than 2MB!",
      });
    }
    return res.status(400).send();
    
  }
};

exports.getListFiles = (req, res) => {
  statsdClient.increment("Scan s3 artifacts");
  let startTime = new Date();

  const directoryPath = __basedir + "/resources/static/assets/uploads/";

  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      res.status(500).send({
        message: "Unable to scan files!",
      });
    }

    let fileInfos = [];

    files.forEach((file) => {
      fileInfos.push({
        name: file,
        url: baseUrl + file,
      });
    });

    let endTime = new Date();
    statsdClient.timing(
      "User creation time",
      endTime - startTime
    );

    res.status(200).send(fileInfos);
  });
};

//find user by username
exports.findUser=async(username)=>{
  statsdClient.increment("User - Find user by username");
  let startTime = new Date();

  let result = await User.findOne({
    where: {
        username: username
    }
  });
return result;
}

//find image by userId
exports.findImageByUserID=async(userId)=>{
  statsdClient.increment("User - Find Image");
  let startTime = new Date();

  let result = await Image.findOne({
    where: {
        user_id: userId
    }
  });
return result;
}

//fetch user data
exports.fetchUserData=async(req, res)=>{
  statsdClient.increment("User - Fetch details");
  let startTime = new Date();

  let result = await User.findOne({
    where: {
      username:global.username
    }
  });

  let endTime = new Date();
    statsdClient.timing(
      "User date fetch time",
      endTime - startTime
    );

  res.status(200).send({id:result.id,
    first_name :result.first_name,
    last_name:result.last_name,
    username:result.username,
    account_created: result.account_created,
    account_updated: result.account_updated
  })
}

//fetch image data by username
exports.fetchImageByUsername=async(req, res)=>{
  statsdClient.increment("Image - Find by username");
  let startTime = new Date();

  let result = await User.findOne({
    where: {
      username:global.username
    }
  });
  let result1 = await Image.findOne({
    where: {
      user_id:result.id
    }
  })
  .then(data => {
    const imageData = {
      file_name: data.file_name,
      id: data.id,
      url: data.url,
      upload_date: data.upload_date,
      user_id: data.user_id
    }

    let endTime = new Date();
      statsdClient.timing(
        "Fetch user image by username time",
        endTime - startTime
      );

    res.status(200).send(imageData)
  }).catch(err => {
    res.status(404).send()
  })
  
}

//delete image data by userId

exports.deleteImageByUserId=async(req, res)=>{
  statsdClient.increment("Image - Delete Image by user ID");
  let startTime = new Date();

  let result = await User.findOne({
    where: {
      username:global.username
    }
  });
  let result1 = await Image.destroy({
    where: {
        user_id:result.id
    }
  });
  await deleteFileFromS3(req,res,result);

  let endTime = new Date();
    statsdClient.timing(
      "Delete image by user ID time",
      endTime - startTime
    );

  res.status(200).send("Record Deleted Successfully!!!")
}





// Delete a Users with the specified id in the request
exports.delete = (req, res) => {
  statsdClient.increment("User - Delete");
  let startTime = new Date();

  const id = req.params.id;

  User.destroy({
    where: { id: id }
  })
    .then(num => {
      if (num == 1) {
        let endTime = new Date();
          statsdClient.timing(
            "Delete user data by ID time",
            endTime - startTime
          );

        res.status(200).send({
          message: "User was deleted successfully!"
        });
      } else {
        res.status(400).send({
          message: `Cannot delete User with id=${id}. User was not found!`
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Could not delete User with id=" + id
      });
    });
};

// Delete all Users from the database.
exports.deleteAll = (req, res) => {
  statsdClient.increment("Delete all users");
  let startTime = new Date();

  User.destroy({
    where: {},
    truncate: false
  })
    .then(nums => {
      let endTime = new Date();
      statsdClient.timing(
        "Delete user DB time",
        endTime - startTime
      );
      res.status(200).send({ message: `${nums} Users were deleted successfully!` });
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all users."
      });
    });
};
