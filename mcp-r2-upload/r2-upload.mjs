import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";

const ACCOUNT_ID = "724df6e86ed3529f1d8501f7513ab241";
const ACCESS_KEY_ID = "2f5fb15504600101f4aa57acfc52b8ff";
const SECRET_ACCESS_KEY = "0a7359e2838a18161d5135bd1f1ea918fd79588472aae2e08c58e79c636ac131";
const BUCKET_NAME = "urban-runner";
const PUBLIC_BASE_URL = "https://pub-9466bb5132e74aeba333004ad0c21f21.r2.dev";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

const files = [
  { path: "/Users/paulvisciano/Downloads/apple-vision-pro-2.mp4", key: "portfolio/who-is-paul-apple-vision-2.mp4", contentType: "video/mp4" },
  { path: "/Users/paulvisciano/Downloads/where-is-paul.mp4", key: "portfolio/where-is-paul-tablet.mp4", contentType: "video/mp4" },
];

for (const file of files) {
  const body = readFileSync(file.path);
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: file.key,
      Body: body,
      ContentType: file.contentType,
    })
  );
  const url = `${PUBLIC_BASE_URL}/${file.key}`;
  console.log(`Uploaded: ${url}`);
}