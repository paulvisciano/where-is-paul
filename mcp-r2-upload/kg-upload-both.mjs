import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import { execSync } from "child_process";

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

const ASSETS = "/Users/paulvisciano/Library/Application Support/Open Design/namespaces/release-stable/data/projects/652f2d2a-158d-4846-a3ed-bedf2f4433ea/assets";

const images = [
  { src: "knowledge-graph-1.jpg", key: "knowledge-graph-1" },
  { src: "knowledge-graph-2.jpg", key: "knowledge-graph-2" },
];

for (const img of images) {
  const jpgPath = `${ASSETS}/${img.src}`;
  const webpPath = `/tmp/${img.key}.webp`;
  execSync(`cwebp -q 85 "${jpgPath}" -o "${webpPath}"`, { stdio: "inherit" });

  const jpgBody = readFileSync(jpgPath);
  const webpBody = readFileSync(webpPath);

  for (const [body, ext, ct] of [[jpgBody, "jpg", "image/jpeg"], [webpBody, "webp", "image/webp"]]) {
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${img.key}.${ext}`,
        Body: body,
        ContentType: ct,
      })
    );
    console.log(`Uploaded: ${PUBLIC_BASE_URL}/${img.key}.${ext} (${body.length} bytes)`);
  }
}