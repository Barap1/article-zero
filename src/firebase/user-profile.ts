import { doc, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";
import type { User } from "firebase/auth";

export function upsertUserProfile(db: Firestore, user: User): Promise<void> {
  return setDoc(doc(db, "users", user.uid), {
    ownerId: user.uid,
    displayName: user.displayName,
    email: user.email,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
