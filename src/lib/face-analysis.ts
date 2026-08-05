import * as tf from "@tensorflow/tfjs-node";
import * as faceapi from "@vladmandic/face-api";
import sharp from "sharp";

const MODEL_BASE =
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";

const ANALYSIS_VERSION = 1;

let modelPromise: Promise<void> | null = null;

export function getAnalysisVersion() {
  return ANALYSIS_VERSION;
}

export function ensureFaceModels(): Promise<void> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_BASE);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_BASE);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_BASE);
    })();
  }
  return modelPromise;
}

export type DetectedFaceResult = {
  face_index: number;
  confidence: number;
  embedding: number[];
  box: { x: number; y: number; width: number; height: number };
};

export async function detectFacesFromUrl(
  url: string,
): Promise<DetectedFaceResult[]> {
  await ensureFaceModels();

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

  try {
    const detections = await faceapi
      .detectAllFaces(
        tensor as unknown as Parameters<typeof faceapi.detectAllFaces>[0],
        new faceapi.TinyFaceDetectorOptions(),
      )
      .withFaceLandmarks()
      .withFaceDescriptors();

    return detections.map((d, i) => ({
      face_index: i,
      confidence: Number(d.detection.score.toFixed(4)),
      embedding: Array.from(d.descriptor),
      box: {
        x: d.detection.box.x,
        y: d.detection.box.y,
        width: d.detection.box.width,
        height: d.detection.box.height,
      },
    }));
  } finally {
    tensor.dispose();
  }
}
