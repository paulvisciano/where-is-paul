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
  {
    path: "/Users/paulvisciano/Library/Application Support/Open Design/namespaces/release-stable/data/projects/652f2d2a-158d-4846-a3ed-bedf2f4433ea/assets/knowledge-graph-1.jpg",
    key: "knowledge-graph.jpg",
    contentType: "image/jpeg",
  },
  {
    path: "/tmp/knowledge-graph.webp",
    key: "knowledge-graph.webp",
    contentType: "image/webp",
  },
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
  console.log(`Uploaded: ${PUBLIC_BASE_URL}/${file.key} (${body.length} bytes)`);
}