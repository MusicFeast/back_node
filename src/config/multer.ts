import multer, { Multer } from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { S3Client } from "@aws-sdk/client-s3";
import multerS3 from "multer-s3";

const s3Config = new S3Client({
  endpoint: "https://nyc3.digitaloceanspaces.com",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3Config,
    acl: "public-read",
    bucket: process.env.AWS_STORAGE_BUCKET_NAME!,
    metadata: function (req: any, file, cb) {
      const userId = req.client._httpMessage.req.params.userID as String;
      cb(null, { fieldName: file.fieldname, userId });
    },
    key: function (req: any, file, cb) {
      const fileName = generateFileName(file.originalname, file.fieldname);
      cb(null, `${fileName}`);
    },
  }),
});

const generateFileName = (originalFileName: string, fieldname: string) => {
  // const uuid = uuidv4();
  const extension = originalFileName.split(".").pop();
  return `${fieldname}.${extension}`;
};

export default { upload };
