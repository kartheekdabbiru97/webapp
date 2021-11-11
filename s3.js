require('dotenv').config()
const fs = require('fs')
const S3 = require('aws-sdk/clients/s3')
const util = require("util");
const bodyParser = require('body-parser');

const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_KEY
const Key = "BucketImage" + Math.floor(Math.random())
console.log('bucket', bucketName)
const s3 = new S3({
    region,
    accessKeyId,
    secretAccessKey
})

exports.uploadFileToS3 = (req, res, file) => {

   
      const random = Math.floor(Math.random())
      const uploadParams = {
      Bucket: bucketName,
      Body: req.body,
      Key: Key//"BucketImage" + random 
      }
     return s3.upload(uploadParams).promise()
      
 
    }
    // var file = req.files.file

    exports.deleteFileFromS3 = (req,res,result) => {
      console.log("result", result)
      const params1 = {
          Bucket: bucketName,
          Key: Key
      }
      return s3.deleteObject(params1).promise()
    
    }
    
    
    
  

//   let uploadFileToS3Middleware = util.promisify(uploadFileToS3)

// module.exports = uploadFileToS3
