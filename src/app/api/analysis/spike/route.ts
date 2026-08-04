import { NextRequest } from "next/server";
import * as tf from "@tensorflow/tfjs-node";
import * as faceapi from "@vladmandic/face-api";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL_BASE = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";

let modelPromise: Promise<void> | null = null;

function ensureModels(): Promise<void> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_BASE);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_BASE);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_BASE);
    })();
  }
  return modelPromise;
}

export async function GET() {
  return Response.json({ ok: true, models: modelPromise ? "ready" : "cold" });
}

export async function POST(request: NextRequest) {
  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  if (!url || !/^https:\/\//.test(url)) {
    return Response.json({ ok: false, error: "url https obrigatoria" }, { status: 400 });
  }

  await ensureModels();

  const buffer = Buffer.from(await (await fetch(url)).arrayBuffer());
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .rotate()
    .resize({ width: 640, withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const h = info.height;
  const w = info.width;
  let tensor = tf.tensor3d(new Uint8Array(data), [h, w, 4]);
  tensor = tensor.slice([0, 0, 0], [h, w, 3]);

  const startedAt = Date.now();
  const detections = await faceapi
    .detectAllFaces(tensor as unknown as Parameters<typeof faceapi.detectAllFaces>[0], new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();
  const elapsedMs = Date.now() - startedAt;

  tensor.dispose();

  return Response.json({
    ok: true,
    image: { width: w, height: h },
    faces: detections.length,
    elapsedMs,
    results: detections.map((d) => ({
      score: Number(d.detection.score.toFixed(3)),
      box: {
        x: d.detection.box.x,
        y: d.detection.box.y,
        width: d.detection.box.width,
        height: d.detection.box.height,
      },
      descriptor: Array.from(d.descriptor),
    })),
  });
}
