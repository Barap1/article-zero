"use client";

import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const configKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

let client: { readonly app: FirebaseApp; readonly auth: Auth; readonly db: Firestore } | undefined;
export let firebaseAuth: Auth | undefined;
export let firebaseDb: Firestore | undefined;

function firebaseConfig(): FirebaseOptions {
  const config = {
    apiKey: process.env["NEXT_PUBLIC_FIREBASE_API_KEY"] ?? "",
    authDomain: process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"] ?? "",
    projectId: process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] ?? "",
    storageBucket: process.env["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"] ?? "",
    messagingSenderId: process.env["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"] ?? "",
    appId: process.env["NEXT_PUBLIC_FIREBASE_APP_ID"] ?? "",
  };
  const missing = [
    { key: configKeys[0], value: config.apiKey },
    { key: configKeys[1], value: config.authDomain },
    { key: configKeys[2], value: config.projectId },
    { key: configKeys[3], value: config.storageBucket },
    { key: configKeys[4], value: config.messagingSenderId },
    { key: configKeys[5], value: config.appId },
  ].filter((entry) => entry.value.trim().length === 0).map((entry) => entry.key);
  if (missing.length > 0) throw new Error(`Missing Firebase client configuration: ${missing.join(", ")}`);
  return config;
}

export function getFirebaseClient(): { readonly app: FirebaseApp; readonly auth: Auth; readonly db: Firestore } {
  if (client !== undefined) return client;
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig());
  const auth = getAuth(app);
  const db = getFirestore(app);
  client = { app, auth, db };
  firebaseAuth = auth;
  firebaseDb = db;
  return client;
}
